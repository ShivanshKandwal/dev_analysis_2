import os
import json
import logging
import warnings
from pathlib import Path
from collections import Counter
import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import lightgbm as lgb

# Attempt to import plotly for saving interactive JSON graphs
try:
    import plotly
    import plotly.express as px
    import plotly.graph_objects as go
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("master_pipeline")

# Centralized Paths
ROOT = Path(r"C:\Software\dev_analysis_2")
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "models"
MONITOR_DIR = ROOT / "monitoring"

for d in [PROCESSED_DIR, MODELS_DIR, MONITOR_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# Features to use for training
SALARY_FEATURES = [
    "years_code_num", "years_code_pro_num", "career_stage_num", "experience_gap",
    "ed_level_num", "org_size_num", "is_large_org", "is_small_org",
    "is_remote", "is_hybrid",
    "lang_count", "db_count", "tool_count", "fw_count", "ai_tool_count",
    "uses_python", "uses_javascript", "uses_typescript", "uses_rust", "uses_sql",
    "uses_ai_tools", "uses_cloud",
    "is_backend", "is_frontend", "is_fullstack", "is_data", "is_ml_ai",
    "is_devops", "is_mobile", "is_manager",
    "job_sat_score", "is_high_income_country", "country_target_enc", "survey_year",
]

def save_plotly_json(fig, name):
    if HAS_PLOTLY:
        # Save JSON for React-Plotly rendering
        path = MONITOR_DIR / f"{name}.json"
        with open(path, "w") as f:
            f.write(plotly.io.to_json(fig))
        logger.info(f"Saved interactive Plotly JSON graph to {path}")
        
        # Also copy to frontend/public if it exists
        frontend_public = ROOT / "frontend" / "public"
        if frontend_public.exists():
            fe_path = frontend_public / f"{name}.json"
            with open(fe_path, "w") as f:
                f.write(plotly.io.to_json(fig))
            logger.info(f"Copied Plotly JSON graph to frontend public folder: {fe_path}")

def run_master_training():
    logger.info("=" * 70)
    logger.info("STARTING MASTER MODEL TRAINING & EVALUATION")
    logger.info("=" * 70)

    # 1. Load data
    processed_file = PROCESSED_DIR / "master_table_v2.csv"
    if not processed_file.exists():
        logger.error(f"Processed file not found at {processed_file}")
        return

    df = pd.read_csv(processed_file)
    logger.info(f"Loaded master dataset of shape: {df.shape}")

    # 2. Extract features
    # Rename TargetEncoded columns if they exist in dataset to align with inference expectation
    if "Country_TargetEncoded" in df.columns:
        df["country_target_enc"] = df["Country_TargetEncoded"]
    else:
        df["country_target_enc"] = -1

    # Map career stages if not already present
    df["career_stage_num"] = df["YearsCodePro"].apply(
        lambda y: 0 if y <= 3 else (1 if y <= 8 else (2 if y <= 15 else 3))
    )
    df["experience_gap"] = (df["YearsCode"] - df["YearsCodePro"]).clip(lower=0)
    df["ed_level_num"] = df["EdLevel"].map({
        "Primary/elementary school": 1,
        "Secondary school (e.g. American high school, German Realschule or Gymnasium, etc.)": 2,
        "Some college/university study without earning a degree": 3,
        "Associate degree (A.A., A.S., etc.)": 3,
        "Bachelor's degree (B.A., B.S., B.Eng., etc.)": 4,
        "Master's degree (M.A., M.S., M.Eng., MBA, etc.)": 5,
        "Professional degree (JD, MD, Ph.D, Ed.D, etc.)": 6,
    }).fillna(3)
    
    df["org_size_num"] = df["OrgSize"].map({
        "Just me - I am a freelancer, sole proprietor, etc.": 1,
        "2 to 9 employees": 5,
        "10 to 19 employees": 14,
        "20 to 99 employees": 50,
        "100 to 499 employees": 250,
        "500 to 999 employees": 700,
        "1,000 to 4,999 employees": 2500,
        "5,000 to 9,999 employees": 7500,
        "10,000 or more employees": 15000,
    }).fillna(50)

    df["is_large_org"] = (df["org_size_num"] >= 1000).astype(int)
    df["is_small_org"] = (df["org_size_num"] <= 20).astype(int)
    df["is_remote"] = df["RemoteWork"].apply(lambda x: 1 if "remote" in str(x).lower() else 0)
    df["is_hybrid"] = df["RemoteWork"].apply(lambda x: 1 if "hybrid" in str(x).lower() else 0)

    # Tech columns count
    lang_cols = [c for c in df.columns if c.startswith("Lang_")]
    db_cols = [c for c in df.columns if c.startswith("DB_")]
    tool_cols = [c for c in df.columns if c.startswith("Tool_")]
    cloud_cols = [c for c in df.columns if c.startswith("Cloud_")]
    collab_cols = [c for c in df.columns if c.startswith("Collab_")]

    df["lang_count"] = df[lang_cols].sum(axis=1) if lang_cols else 0
    df["db_count"] = df[db_cols].sum(axis=1) if db_cols else 0
    df["tool_count"] = df[tool_cols].sum(axis=1) if tool_cols else 0
    df["fw_count"] = df[collab_cols].sum(axis=1) if collab_cols else 0  # fallback or placeholder for webframe
    df["ai_tool_count"] = 0
    df["uses_ai_tools"] = 0
    df["uses_cloud"] = (df[cloud_cols].sum(axis=1) > 0).astype(int) if cloud_cols else 0
    
    df["uses_python"] = df["Lang_Python"] if "Lang_Python" in df.columns else 0
    df["uses_javascript"] = df["Lang_JavaScript"] if "Lang_JavaScript" in df.columns else 0
    df["uses_typescript"] = df["Lang_TypeScript"] if "Lang_TypeScript" in df.columns else 0
    df["uses_rust"] = df["Lang_Rust"] if "Lang_Rust" in df.columns else 0
    df["uses_sql"] = df["Lang_SQL"] if "Lang_SQL" in df.columns else 0

    df["is_backend"] = df["DevType"].apply(lambda x: 1 if "back-end" in str(x).lower() or "backend" in str(x).lower() else 0)
    df["is_frontend"] = df["DevType"].apply(lambda x: 1 if "front-end" in str(x).lower() or "frontend" in str(x).lower() else 0)
    df["is_fullstack"] = df["DevType"].apply(lambda x: 1 if "full-stack" in str(x).lower() or "fullstack" in str(x).lower() else 0)
    df["is_data"] = df["DevType"].apply(lambda x: 1 if "data" in str(x).lower() else 0)
    df["is_ml_ai"] = df["DevType"].apply(lambda x: 1 if "machine learning" in str(x).lower() or "ai" in str(x).lower() else 0)
    df["is_devops"] = df["DevType"].apply(lambda x: 1 if "devops" in str(x).lower() or "reliability" in str(x).lower() else 0)
    df["is_mobile"] = df["DevType"].apply(lambda x: 1 if "mobile" in str(x).lower() else 0)
    df["is_manager"] = df["DevType"].apply(lambda x: 1 if "manager" in str(x).lower() or "executive" in str(x).lower() else 0)

    # Job Sat
    df["job_sat_score"] = 3 # median default since it's missing in 2022/2023
    
    # High-income country
    high_income = {"United States of America", "United Kingdom of Great Britain and Northern Ireland", "Germany", "Canada", "Australia", "Netherlands", "Sweden", "Norway", "Denmark", "Switzerland"}
    df["is_high_income_country"] = df["Country"].isin(high_income).astype(int)
    
    df["survey_year"] = df["SurveyYear"]
    df["years_code_num"] = df["YearsCode"]
    df["years_code_pro_num"] = df["YearsCodePro"]

    # Target
    df_sal = df[df["ConvertedCompYearly"].notna()].copy()
    y_raw = df_sal["ConvertedCompYearly"]
    y = np.log1p(y_raw)

    valid_feats = [c for c in SALARY_FEATURES if c in df_sal.columns]
    X = df_sal[valid_feats].fillna(-1)

    logger.info(f"Target variable statistics: Median = ${y_raw.median():,.2f}")
    logger.info(f"Training features count: {len(valid_feats)}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Models dictionary
    models = {
        "Ridge": Ridge(alpha=1.0, random_state=42),
        "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=12, n_jobs=-1, random_state=42),
        "XGBoost": xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, random_state=42, n_jobs=-1),
        "LightGBM": lgb.LGBMRegressor(n_estimators=400, max_depth=7, learning_rate=0.04, random_state=42, n_jobs=-1, verbose=-1)
    }

    results = {}
    logger.info("Training and evaluating models...")

    for name, model in models.items():
        logger.info(f"Fitting {name} model...")
        model.fit(X_train, y_train)
        pred_log = model.predict(X_test)
        pred_dollars = np.expm1(pred_log)
        true_dollars = np.expm1(y_test)

        rmse = np.sqrt(mean_squared_error(true_dollars, pred_dollars))
        mae = mean_absolute_error(true_dollars, pred_dollars)
        r2 = r2_score(y_test, pred_log)

        results[name] = {"rmse": float(rmse), "mae": float(mae), "r2": float(r2)}
        logger.info(f"[{name}] R2: {r2:.4f} | MAE: ${mae:,.2f} | RMSE: ${rmse:,.2f}")

    best_name = max(results, key=lambda k: results[k]["r2"])
    best_model = models[best_name]
    logger.info(f"Best model selected: {best_name}")

    # 3. Plotly Visualization Generations
    if HAS_PLOTLY:
        # A. Model Comparison Chart
        comparison_df = pd.DataFrame.from_dict(results, orient='index').reset_index().rename(columns={'index': 'Model'})
        fig_comp = px.bar(
            comparison_df, 
            x='Model', 
            y='r2', 
            text=comparison_df['r2'].apply(lambda x: f"{x:.4f}"),
            title='Model Comparison - R² Score (Variance Explained)',
            labels={'r2': 'R² Score'},
            color='Model',
            color_discrete_sequence=px.colors.qualitative.Plotly
        )
        fig_comp.update_layout(template='plotly_dark')
        save_plotly_json(fig_comp, "model_comparison")

        # B. Feature Importance Chart
        if hasattr(best_model, "feature_importances_"):
            importance = pd.Series(best_model.feature_importances_, index=valid_feats).sort_values(ascending=False).head(20)
            fig_imp = px.bar(
                x=importance.values,
                y=importance.index,
                orientation='h',
                title=f'Top 20 Feature Importances ({best_name})',
                labels={'x': 'Importance Value', 'y': 'Feature Name'},
                color=importance.values,
                color_continuous_scale='Viridis'
            )
            fig_imp.update_layout(yaxis={'categoryorder': 'total ascending'}, template='plotly_dark')
            save_plotly_json(fig_imp, "feature_importance")

        # C. Predicted vs Actual Chart
        pred_dollars = np.expm1(best_model.predict(X_test))
        true_dollars = np.expm1(y_test)
        
        # Subsample to keep JSON payload light
        subsample_idx = np.random.choice(len(true_dollars), size=min(2000, len(true_dollars)), replace=False)
        fig_res = px.scatter(
            x=true_dollars.iloc[subsample_idx],
            y=pred_dollars[subsample_idx],
            opacity=0.3,
            labels={'x': 'Actual Salary (USD)', 'y': 'Predicted Salary (USD)'},
            title=f'Actual vs. Predicted Salary Scatter ({best_name})',
            color_discrete_sequence=['#7c3aed']
        )
        # Add ideal line
        max_val = float(min(true_dollars.max(), 500000))
        fig_res.add_shape(
            type="line", line=dict(dash="dash", color="red"),
            x0=0, y0=0, x1=max_val, y1=max_val
        )
        fig_res.update_layout(xaxis_range=[0, max_val], yaxis_range=[0, max_val], template='plotly_dark')
        save_plotly_json(fig_res, "predicted_vs_actual")
        
        # D. MAE by Career Stage Chart
        test_df = X_test.copy()
        test_df["true_salary"] = true_dollars
        test_df["pred_salary"] = pred_dollars
        test_df["abs_error"] = (test_df["pred_salary"] - test_df["true_salary"]).abs()
        test_df["career_stage"] = test_df["career_stage_num"].map({0: "Junior", 1: "Mid", 2: "Senior", 3: "Staff"})
        
        stage_errors = test_df.groupby("career_stage")["abs_error"].mean().reset_index()
        fig_stage = px.bar(
            stage_errors,
            x='career_stage',
            y='abs_error',
            title='Mean Absolute Error (MAE) by Career Stage',
            labels={'career_stage': 'Career Stage', 'abs_error': 'MAE (USD)'},
            color='career_stage',
            color_discrete_sequence=px.colors.qualitative.Pastel
        )
        fig_stage.update_layout(template='plotly_dark')
        save_plotly_json(fig_stage, "mae_by_career_stage")

    # 4. Save best model and features list
    if not MODELS_DIR.exists():
        MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(best_model, MODELS_DIR / "salary_predictor.pkl")
    
    with open(MODELS_DIR / "salary_features.json", "w") as f:
        json.dump(valid_feats, f, indent=2)

    with open(MODELS_DIR / "salary_model_comparison.json", "w") as f:
        json.dump(results, f, indent=2)

    # Save categorical unique values for frontend input selections
    categorical_options = {}
    categorical_options["Country"] = sorted(df["Country"].unique().tolist())
    categorical_options["EdLevel"] = sorted(df["EdLevel"].unique().tolist())
    categorical_options["OrgSize"] = sorted(df["OrgSize"].unique().tolist())
    categorical_options["DevType"] = sorted(df["DevType"].unique().tolist())
    categorical_options["RemoteWork"] = sorted(df["RemoteWork"].unique().tolist())
    
    joblib.dump(categorical_options, MODELS_DIR / "categorical_options.joblib")
    
    logger.info(f"Successfully saved modeling assets to {MODELS_DIR}")
    logger.info("=" * 70)

if __name__ == "__main__":
    run_master_training()
