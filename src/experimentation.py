import os
import logging
import warnings
import json
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import plotly.io as pio
from plotly.subplots import make_subplots
from scipy import stats
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

# Pull project directory configurations
from config import BASE_DIR, PROCESSED_DIR

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

MONITORING_DIR = os.path.join(BASE_DIR, "monitoring")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MONITORING_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# EXPLICIT ATTRIBUTE ALIGNMENT
TREATMENT_COL = "Is_Enterprise" 
OUTCOMES = ["predicted_salary", "career_value_percentile", "churn_risk"]
ALPHA_BONFERRONI = 0.05 / len(OUTCOMES)

# Covariates to control for
COVARIATES = [
    "YearsCode", "YearsCodePro", "WorkExp", "age_numeric",
    "Cluster_DevOps_Count", "Cluster_DataBackend_Count",
    "Country_TargetEncoded", "DevType_TargetEncoded"
]

def preprocess_age_column(df: pd.DataFrame, col: str = "Age") -> pd.DataFrame:
    """Safely parses raw text ranges into clear numerical midpoints."""
    if col not in df.columns:
        if "age_numeric" not in df.columns:
            df["age_numeric"] = 35.0
        return df

    logger.info("Cleaning and transforming raw text 'Age' column into numerical midpoints...")
    df[col] = df[col].astype(str).str.strip()

    midpoint_map = {
        "18-24 years old": 21.0,
        "25-34 years old": 29.5,
        "35-44 years old": 39.5,
        "45-54 years old": 49.5,
        "55-64 years old": 59.5,
        "65 years or older": 70.0,
        "Under 18 years old": 16.0
    }
    
    df["age_numeric"] = df[col].map(midpoint_map)
    df["age_numeric"] = df["age_numeric"].fillna(df["age_numeric"].median())
    return df

def standardized_mean_difference(treatment: pd.Series, control: pd.Series) -> float:
    mean_diff = abs(treatment.mean() - control.mean())
    pooled_std = np.sqrt((treatment.std() ** 2 + control.std() ** 2) / 2)
    return round(mean_diff / pooled_std if pooled_std > 0 else 0, 4)

def balance_report(df_t: pd.DataFrame, df_c: pd.DataFrame, covariates: list[str]) -> pd.DataFrame:
    rows = []
    for cov in covariates:
        if cov not in df_t.columns or cov not in df_c.columns:
            continue
        t_vals = df_t[cov].dropna()
        c_vals = df_c[cov].dropna()
        smd = standardized_mean_difference(t_vals, c_vals)
        rows.append({
            "covariate": cov,
            "mean_enterprise": round(t_vals.mean(), 3),
            "mean_non_enterprise": round(c_vals.mean(), 3),
            "smd": smd,
            "balanced": smd < 0.1,
        })
    return pd.DataFrame(rows).sort_values("smd", ascending=False)

def compute_propensity_scores(df: pd.DataFrame, treatment_col: str, covariates: list[str]) -> pd.Series:
    valid_cov = [c for c in covariates if c in df.columns]
    X = df[valid_cov].fillna(df[valid_cov].median())
    y = df[treatment_col].astype(int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    ps_model = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    ps_model.fit(X_scaled, y)
    return pd.Series(ps_model.predict_proba(X_scaled)[:, 1], index=df.index, name="propensity_score")

def vectorized_matching(df: pd.DataFrame, ps_col: str = "propensity_score", 
                        treatment_col: str = "Is_Enterprise", caliper: float = 0.05) -> pd.DataFrame:
    """Uses optimized binary array search sorted on scores to match 100k+ rows instantly."""
    treated = df[df[treatment_col] == 1].sort_values(by=ps_col)
    control = df[df[treatment_col] == 0].sort_values(by=ps_col)

    matched_control_indices = []
    control_ps_values = control[ps_col].values
    control_indices = control.index.values

    for _, t_row in treated.iterrows():
        t_ps = t_row[ps_col]
        idx = np.searchsorted(control_ps_values, t_ps)
        
        bounds = []
        if idx > 0: bounds.append(idx - 1)
        if idx < len(control_ps_values): bounds.append(idx)
        
        if not bounds:
            matched_control_indices.append(None)
            continue
            
        best_idx = min(bounds, key=lambda i: abs(control_ps_values[i] - t_ps))
        if abs(control_ps_values[best_idx] - t_ps) <= caliper:
            matched_control_indices.append(control_indices[best_idx])
        else:
            matched_control_indices.append(None)

    valid_mask = [idx is not None for idx in matched_control_indices]
    matched_treated = treated[valid_mask]
    matched_control = control.loc[[idx for idx in matched_control_indices if idx is not None]]

    return pd.concat([matched_treated, matched_control], ignore_index=True)

def test_outcome(df_matched: pd.DataFrame, outcome: str, treatment_col: str) -> dict:
    treated = df_matched[df_matched[treatment_col] == 1][outcome].dropna()
    control = df_matched[df_matched[treatment_col] == 0][outcome].dropna()

    if len(treated) < 30 or len(control) < 30:
        return {"outcome": outcome, "error": "Insufficient sample bounds"}

    _, p_value = stats.mannwhitneyu(treated, control, alternative="two-sided")
    pooled_std = np.sqrt((treated.std() ** 2 + control.std() ** 2) / 2)
    cohens_d = (treated.mean() - control.mean()) / pooled_std if pooled_std > 0 else 0

    return {
        "outcome": outcome,
        "mean_enterprise": round(float(treated.mean()), 4),
        "mean_non_enterprise": round(float(control.mean()), 4),
        "mean_difference": round(float(treated.mean() - control.mean()), 4),
        "cohens_d": round(float(cohens_d), 4),
        "p_value": round(float(p_value), 6),
        "significant": bool(p_value < ALPHA_BONFERRONI)
    }

def run_uplift_analysis(df: pd.DataFrame, outcome: str, treatment_col: str) -> dict:
    results = {}
    
    if "cluster_label" not in df.columns or df["cluster_label"].nunique() <= 1:
        logger.warning("cluster_label column is flat. Mapping custom developer engineering ecosystems...")
        
        conditions = [
            (df["Tool_Docker"] == 1) | (df["Tool_Kubernetes"] == 1) | (df["Cluster_DevOps_Count"] > 1),
            (df["Lang_Python"] == 1) | (df["Lang_SQL"] == 1) | (df["Cluster_DataBackend_Count"] > 1),
            (df["Lang_JavaScript"] == 1) | (df["Lang_TypeScript"] == 1),
            (df["Lang_C++"] == 1) | (df["Lang_C#"] == 1)
        ]
        choices = ["DevOps & Infra", "Data & Backend", "Frontend & Fullstack", "Systems & Desktop"]
        df["derived_cluster"] = np.select(conditions, choices, default="General Engineering")
        group_col = "derived_cluster"
    else:
        df["clean_cluster"] = df["cluster_label"].apply(lambda x: f"Tech Cluster {int(x)}")
        group_col = "clean_cluster"
        
    for segment in df[group_col].dropna().unique():
        sub_df = df[df[group_col] == segment]
        t = sub_df[sub_df[treatment_col] == 1][outcome].dropna()
        c = sub_df[sub_df[treatment_col] == 0][outcome].dropna()
        
        if len(t) >= 15 and len(c) >= 15:
            results[str(segment)] = {
                "enterprise_uplift": round(float(t.mean() - c.mean()), 4),
                "n_enterprise": len(t),
                "n_non_enterprise": len(c)
            }
            
    return {"outcome": outcome, "subgroups": results}

def save_diagnostic_plots(pre_b: pd.DataFrame, post_b: pd.DataFrame, uplift_res: dict):
    # 1. Side-by-Side Balance Dashboard
    pre_b["Status"] = "Before Matching"
    post_b["Status"] = "After Matching"
    combined_balance = pd.concat([pre_b, post_b], ignore_index=True)
    combined_balance["Color_Hex"] = combined_balance["balanced"].map({True: "#059669", False: "#dc2626"})

    fig_balance = make_subplots(rows=1, cols=2, subplot_titles=("Before Matching", "After Matching"), shared_yaxes=True)
    df_pre = combined_balance[combined_balance["Status"] == "Before Matching"]
    fig_balance.add_trace(go.Bar(x=df_pre["smd"], y=df_pre["covariate"], orientation="h", marker_color=df_pre["Color_Hex"]), row=1, col=1)
    df_post = combined_balance[combined_balance["Status"] == "After Matching"]
    fig_balance.add_trace(go.Bar(x=df_post["smd"], y=df_post["covariate"], orientation="h", marker_color=df_post["Color_Hex"]), row=1, col=2)
    fig_balance.update_layout(title="Covariate Balance Verification Dashboard", template="plotly_dark", showlegend=False, height=500, width=1200)
    
    # Save as HTML
    fig_balance.write_html(os.path.join(MONITORING_DIR, "enterprise_matching_balance.html"))
    # Save as JSON for frontend
    json_path = os.path.join(MONITORING_DIR, "enterprise_matching_balance.json")
    with open(json_path, "w") as f:
        f.write(pio.to_json(fig_balance))
    
    # Copy to frontend/public
    fe_public = os.path.join(BASE_DIR, "frontend", "public")
    if os.path.exists(fe_public):
        fe_path = os.path.join(fe_public, "enterprise_matching_balance.json")
        with open(fe_path, "w") as f:
            f.write(pio.to_json(fig_balance))

    # 2. Multi-Bar Cluster Uplift Dashboard
    cluster_data = uplift_res.get("subgroups", {})
    if cluster_data:
        df_uplift = pd.DataFrame([
            {"Cluster": k, "Enterprise_Uplift": v["enterprise_uplift"]} for k, v in cluster_data.items()
        ]).sort_values(by="Enterprise_Uplift")

        fig_uplift = px.bar(
            df_uplift, x="Enterprise_Uplift", y="Cluster", orientation="h",
            color="Enterprise_Uplift", color_continuous_scale="RdBu",
            title=f"Enterprise Cohort Lift Across Real Developer Clusters<br><sup>Target: {uplift_res['outcome']}</sup>",
            template="plotly_dark"
        )
        
        # Save as HTML
        fig_uplift.write_html(os.path.join(MONITORING_DIR, "enterprise_uplift_by_cluster.html"))
        # Save as JSON
        json_uplift_path = os.path.join(MONITORING_DIR, "enterprise_uplift_by_cluster.json")
        with open(json_uplift_path, "w") as f:
            f.write(pio.to_json(fig_uplift))
            
        if os.path.exists(fe_public):
            fe_uplift_path = os.path.join(fe_public, "enterprise_uplift_by_cluster.json")
            with open(fe_uplift_path, "w") as f:
                f.write(pio.to_json(fig_uplift))

def run_experiment(df: pd.DataFrame) -> dict:
    print("=" * 60)
    print("EXECUTING ADAPTED REAL-DATA CAUSAL INFERENCE PIPELINE")
    print("=" * 60)

    # 1. Clean data transformations on native traits
    df = preprocess_age_column(df, col="Age")

    if TREATMENT_COL not in df.columns or df[TREATMENT_COL].nunique() < 2:
        logger.info("Is_Enterprise field unpopulated. Initializing split via OrgSize_TargetEncoded median values...")
        df[TREATMENT_COL] = (df["OrgSize_TargetEncoded"] > df["OrgSize_TargetEncoded"].median()).astype(int)

    valid_cov = [c for c in COVARIATES if c in df.columns]
    
    pre_balance = balance_report(df[df[TREATMENT_COL] == 1], df[df[TREATMENT_COL] == 0], valid_cov)
    df["propensity_score"] = compute_propensity_scores(df, TREATMENT_COL, valid_cov)
    
    logger.info("Initializing propensity array alignment...")
    df_matched = vectorized_matching(df, treatment_col=TREATMENT_COL)

    post_balance = balance_report(df_matched[df_matched[TREATMENT_COL] == 1], df_matched[df_matched[TREATMENT_COL] == 0], valid_cov)

    test_results = {target: test_outcome(df_matched, target, TREATMENT_COL) for target in OUTCOMES}
    uplift_summary = run_uplift_analysis(df_matched, "career_value_percentile", TREATMENT_COL)

    save_diagnostic_plots(pre_balance, post_balance, uplift_summary)

    final_report = {
        "statistically_significant_drivers": [k for k, v in test_results.items() if v.get("significant")], 
        "hypothesis_tests": test_results, 
        "uplift_segmentation_by_cluster": uplift_summary
    }
    
    with open(os.path.join(MODELS_DIR, "enterprise_experiment_report.json"), "w") as f:
        json.dump(final_report, f, indent=4)

    print("Causal inference dashboards successfully exported to /monitoring")
    print("=" * 60)
    return final_report

if __name__ == "__main__":
    master_table_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if os.path.exists(master_table_path):
        run_experiment(pd.read_csv(master_table_path))
