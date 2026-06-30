import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
import logging

import mlflow
import mlflow.sklearn
import mlflow.xgboost

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, f1_score, mean_squared_error, r2_score

import xgboost as xgb
import shap

# Attempt to import plotly for saving interactive JSON graphs
try:
    import plotly
    import plotly.express as px
    import plotly.graph_objects as go
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

# Pull tracking directories cleanly from configuration maps
from config import PROCESSED_DIR, REGRESSION_TARGET, BASE_DIR

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# Configure local tracking paths and artifact hubs
MODELS_DIR = Path(PROCESSED_DIR) / "models"
REPORTS_DIR = Path(BASE_DIR) / "monitoring"
for folder in [MODELS_DIR, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

mlflow.set_experiment("DevIntel_Supervised_Suite")

# Feature Pools
CHURN_FEATURES = [
    "YearsCode", "YearsCodePro", "WorkExp", "SurveyYear",
    "Cluster_DevOps_Count", "Cluster_DataBackend_Count",
    "Is_Enterprise", "Enterprise_Experience_Interaction", "cluster_label"
]

CAREER_FEATURES = [
    "YearsCode", "YearsCodePro", "WorkExp", "SurveyYear",
    "Cluster_DevOps_Count", "Cluster_DataBackend_Count",
    "Is_Enterprise", "cluster_label", "Country_TargetEncoded", "DevType_TargetEncoded"
]

def save_plotly_json(fig, name):
    if HAS_PLOTLY:
        # Save JSON for React-Plotly rendering
        path = REPORTS_DIR / f"{name}.json"
        with open(path, "w") as f:
            f.write(plotly.io.to_json(fig))
        logger.info(f"Saved interactive Plotly JSON graph to {path}")
        
        # Also copy to frontend/public if it exists
        frontend_public = Path(BASE_DIR) / "frontend" / "public"
        if frontend_public.exists():
            fe_path = frontend_public / f"{name}.json"
            with open(fe_path, "w") as f:
                f.write(plotly.io.to_json(fig))
            logger.info(f"Copied Plotly JSON graph to frontend public folder: {fe_path}")

def train_churn_risk_engine(df: pd.DataFrame):
    print("\n" + "=" * 60)
    print("TRAINING DEVELOPER CHURN PREDICTION CLASSIFIERS")
    print("=" * 60)

    print("Engineering behavioral churn target matrix...")
    df = df.copy()

    # Calculate RFM scores inline to prevent multi-file dependency errors
    r_raw = df["SurveyYear"] + df.get("Cluster_DevOps_Count", 0) * 0.1
    
    tech_cols = [c for c in df.columns if any(p in c for p in ['Lang_', 'DB_', 'Cloud_', 'Tool_', 'Collab_'])]
    f_raw = df[tech_cols].sum(axis=1) if tech_cols else df["YearsCode"]
    
    m_raw = df.groupby("Country")[REGRESSION_TARGET].transform(lambda x: x.rank(pct=True)).fillna(0.5)

    # Map features down to clean 1-5 quantiles
    rfm_r = pd.qcut(r_raw.rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_f = pd.qcut(f_raw.rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_m = pd.qcut(m_raw.rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm_score = rfm_r * 100 + rfm_f * 10 + rfm_m

    # Scenario A: High tech appetite (rfm_r >= 4) but low relative compensation (rfm_m <= 2)
    is_stagnant_ambitious = (rfm_r >= 4) & (rfm_m <= 2)
    
    # Scenario B: Low overall engagement score combined with early professional career tenure
    is_disengaged_junior = (df["YearsCodePro"] <= 3) & (rfm_score < rfm_score.median())
    
    df["churn_risk"] = (is_stagnant_ambitious | is_disengaged_junior).astype(int)
    
    # Fallback safety validation
    if df["churn_risk"].mean() == 0 or df["churn_risk"].mean() == 1:
        df["churn_risk"] = (df["YearsCodePro"] <= 3).astype(int)

    valid_feats = [c for c in CHURN_FEATURES if c in df.columns]
    X = df[valid_feats].fillna(0)
    y = df["churn_risk"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Churn Evaluation Balance: Positive Attrition Rate = {y.mean():.1%}")

    # 1. Baseline Logistic Regression
    with mlflow.start_run(run_name="churn_logistic_baseline"):
        scaler = StandardScaler()
        X_tr_s = scaler.fit_transform(X_train)
        X_te_s = scaler.transform(X_test)
        
        lr = LogisticRegression(class_weight="balanced", random_state=42)
        lr.fit(X_tr_s, y_train)
        auc_lr = roc_auc_score(y_test, lr.predict_proba(X_te_s)[:, 1])
        mlflow.log_metric("auc", auc_lr)
        print(f"   -> Baseline Logistic Regression AUC: {auc_lr:.4f}")

    # 2. Production XGBoost Classifier
    scale_pos_weight_value = (y_train == 0).sum() / (y_train == 1).sum()
    with mlflow.start_run(run_name="churn_xgb_production"):
        xgb_clf = xgb.XGBClassifier(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            scale_pos_weight=scale_pos_weight_value, random_state=42, n_jobs=-1
        )
        xgb_clf.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        
        preds_proba = xgb_clf.predict_proba(X_test)[:, 1]
        auc_xgb = roc_auc_score(y_test, preds_proba)
        
        mlflow.log_metrics({"auc": auc_xgb, "f1_score": f1_score(y_test, (preds_proba >= 0.5).astype(int))})
        mlflow.xgboost.log_model(xgb_clf, "model")
        print(f"   -> Production XGBoost Classifier AUC: {auc_xgb:.4f}")

    # 3. Reference baseline parquet
    baseline_df = X_test.copy()
    baseline_df["y_true"] = y_test.values
    baseline_df["y_pred_proba"] = preds_proba
    
    baseline_path = MODELS_DIR / "churn_test_baseline.parquet"
    baseline_df.to_parquet(baseline_path, index=False)
    logger.info(f"Reference baseline tracking telemetry exported to: {baseline_path}")

    # 4. Save Plots for Frontend visualization
    if HAS_PLOTLY:
        # A. Risk Distribution Chart
        risk_labels = pd.Series((preds_proba >= 0.60).astype(int) + (preds_proba >= 0.35).astype(int)).map(
            {0: "Stable Core", 1: "Elevated Risk", 2: "High Risk"}
        )
        dist_df = risk_labels.value_counts().reset_index()
        dist_df.columns = ["Risk Tier", "Developers"]
        fig_dist = px.pie(
            dist_df, values="Developers", names="Risk Tier",
            title="Developer Retention Risk Distribution",
            color="Risk Tier",
            color_discrete_map={"Stable Core": "#059669", "Elevated Risk": "#d97706", "High Risk": "#dc2626"},
            template="plotly_dark"
        )
        save_plotly_json(fig_dist, "churn_risk_distribution")

        # B. Feature Importance Chart
        feat_imp = pd.Series(xgb_clf.feature_importances_, index=valid_feats).sort_values(ascending=False)
        fig_feat = px.bar(
            x=feat_imp.values, y=feat_imp.index, orientation='h',
            title='Top Risk Factor Importances (XGBoost Churn)',
            labels={'x': 'Relative Importance', 'y': 'Retention Driver'},
            color=feat_imp.values, color_continuous_scale='Reds'
        )
        fig_feat.update_layout(yaxis={'categoryorder': 'total ascending'}, template='plotly_dark')
        save_plotly_json(fig_feat, "churn_feature_importance")

    # 5. Export SHAP Trees
    print("Computing SHAP explainability matrices for the API routing layers...")
    explainer = shap.TreeExplainer(xgb_clf)
    joblib.dump(xgb_clf, MODELS_DIR / "churn_xgb.pkl")
    joblib.dump(explainer, MODELS_DIR / "churn_shap.pkl")
    
    print("Supervised classification assets written successfully.")
    return df

def train_career_value_engine(df: pd.DataFrame):
    print("\n" + "=" * 60)
    print("TRAINING EXPERT CAREER VALUE REGRESSION PIPELINE")
    print("=" * 60)

    valid_feats = [c for c in CAREER_FEATURES if c in df.columns]
    X = df[valid_feats].fillna(0)
    
    y = np.log1p(df[REGRESSION_TARGET])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    with mlflow.start_run(run_name="career_value_xgb"):
        xgb_reg = xgb.XGBRegressor(
            n_estimators=600, max_depth=5, learning_rate=0.04, 
            subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1
        )
        xgb_reg.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
        
        preds = xgb_reg.predict(X_test)
        
        y_test_raw = np.expm1(y_test)
        preds_raw = np.expm1(preds)
        
        r2 = r2_score(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test_raw, preds_raw))
        
        mlflow.log_metrics({"r2_score": r2, "rmse": rmse})
        print(f"   -> Stabilized Career Value Engine R2 Score: {r2:.4f}")
        print(f"   -> Root Mean Squared Error: ${rmse:,.2f}")

    joblib.dump(xgb_reg, MODELS_DIR / "career_xgb.pkl")
    
    # Calculate the Career Value Percentile Score across local peer groups
    all_X = df[valid_feats].fillna(0)
    df["predicted_salary"] = np.expm1(xgb_reg.predict(all_X))
    
    if "cluster_label" in df.columns and df["cluster_label"].nunique() > 1:
        df["career_value_percentile"] = df.groupby("cluster_label")["predicted_salary"].transform(lambda x: x.rank(pct=True)).round(3)
    else:
        df["career_value_percentile"] = df["predicted_salary"].rank(pct=True).round(3)
    
    # Save fresh metrics back down to master table storage blocks
    df.to_csv(os.path.join(PROCESSED_DIR, "master_table_v2.csv"), index=False)
    print("Career value calculations computed and saved successfully to master table blocks!")
    print("=" * 60)

if __name__ == "__main__":
    master_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if os.path.exists(master_path):
        master_df = pd.read_csv(master_path)
        
        # Enforce baseline categorical default parameters if empty
        if "cluster_label" not in master_df.columns:
            master_df["cluster_label"] = 0
            
        master_df = train_churn_risk_engine(master_df)
        train_career_value_engine(master_df)
    else:
        print(f"Error: Target master dataframe missing at {master_path}.")
