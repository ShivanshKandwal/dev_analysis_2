import os
import json
import logging
import warnings
import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde
import plotly.graph_objects as go
import plotly.io as pio
from plotly.subplots import make_subplots
from pathlib import Path

from config import BASE_DIR, PROCESSED_DIR

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = Path(PROCESSED_DIR) / "models"
MONITORING_DIR = Path(BASE_DIR) / "monitoring"
os.makedirs(MONITORING_DIR, exist_ok=True)

MONITORED_FEATURES = [
    "YearsCode", "YearsCodePro", "WorkExp", "SurveyYear",
    "Cluster_DevOps_Count", "Cluster_DataBackend_Count",
    "Is_Enterprise", "Enterprise_Experience_Interaction", "cluster_label"
]

def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]
    if len(expected) == 0 or len(actual) == 0:
        return 0.0

    quantiles = np.linspace(0, 100, num_bins + 1)
    bins = np.percentile(expected, quantiles)
    bins = np.unique(bins)
    if len(bins) < 2:
        return 0.0

    expected_counts, _ = np.histogram(expected, bins=bins)
    actual_counts, _ = np.histogram(actual, bins=bins)

    expected_pct = expected_counts / len(expected)
    actual_pct = actual_counts / len(actual)

    expected_pct = np.where(expected_pct == 0, 0.0001, expected_pct)
    actual_pct = np.where(actual_pct == 0, 0.0001, actual_pct)

    psi_value = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi_value)

def run_monitoring_report(current_data: pd.DataFrame = None):
    baseline_path = MODELS_DIR / "churn_test_baseline.parquet"
    if not baseline_path.exists():
        logger.error(f"Target baseline data missing at {baseline_path}. Run churn_model.py first.")
        return None

    reference_df = pd.read_parquet(baseline_path)
    logger.info(f"Baseline snapshot loaded cleanly ({len(reference_df):,} rows).")

    if current_data is None:
        logger.warning("No streaming data provided. Spanning native noise simulator metrics...")
        current_data_df = _simulate_production_drift(reference_df)
    else:
        current_data_df = current_data.copy()

    features_to_check = [c for c in MONITORED_FEATURES if c in reference_df.columns and c in current_data_df.columns]
    if "y_pred_proba" in reference_df.columns and "y_pred_proba" in current_data_df.columns:
        features_to_check.append("y_pred_proba")

    features = []
    psi_scores = []
    statuses = []
    colors = []
    any_major_drift = False

    logger.info("Executing distribution tracking loops and plotting figures...")
    for feat in features_to_check:
        psi_score = calculate_psi(reference_df[feat].values, current_data_df[feat].values)
        psi_score_rounded = round(psi_score, 4)
        
        if psi_score >= 0.25:
            status = "CRITICAL DRIFT"
            color = "#e74c3c"
            any_major_drift = True
        elif psi_score >= 0.10:
            status = "Moderate Shift"
            color = "#f39c12"
        else:
            status = "Healthy"
            color = "#2ecc71"

        features.append(feat)
        psi_scores.append(psi_score_rounded)
        statuses.append(status)
        colors.append(color)

    # CREATE INTERACTIVE PLOTLY FIGURES
    fig = make_subplots(
        rows=2, cols=1, 
        row_heights=[0.45, 0.55],
        subplot_titles=("Population Stability Index (PSI) by Feature", "Continuous Probability Density Shift (KDE Map)"),
        vertical_spacing=0.15
    )

    # Subplot 1: Interactive Bar Chart for PSI
    fig.add_trace(
        go.Bar(
            x=features,
            y=psi_scores,
            marker_color=colors,
            text=psi_scores,
            textposition="auto",
            hovertemplate="<b>Feature:</b> %{x}<br><b>PSI Score:</b> %{y}<br><b>Status:</b> %{text}<extra></extra>",
            name="PSI Score"
        ),
        row=1, col=1
    )
    fig.add_shape(type="line", x0=-0.5, x1=len(features)-0.5, y0=0.1, y1=0.1, line=dict(color="#f39c12", width=2, dash="dash"), row=1, col=1)
    fig.add_shape(type="line", x0=-0.5, x1=len(features)-0.5, y0=0.25, y1=0.25, line=dict(color="#e74c3c", width=2, dash="dot"), row=1, col=1)

    # Subplot 2: Continuous Density estimation using smooth SciPy KDE curves
    if "y_pred_proba" in reference_df.columns:
        x_grid = np.linspace(0, 1, 200)
        ref_vals = reference_df["y_pred_proba"].dropna().values
        cur_vals = current_data_df["y_pred_proba"].dropna().values

        ref_kde = gaussian_kde(ref_vals)(x_grid)
        cur_kde = gaussian_kde(cur_vals)(x_grid)

        fig.add_trace(
            go.Scatter(x=x_grid, y=ref_kde, mode='lines', name='Baseline (Training)', line=dict(color='#3498db', width=3)),
            row=2, col=1
        )
        fig.add_trace(
            go.Scatter(x=x_grid, y=cur_kde, mode='lines', name='Current (Production)', line=dict(color='#e74c3c', width=3)),
            row=2, col=1
        )

    fig.update_layout(
        title=dict(text=f"DevIntel Model Telemetry Hub<br><span style='font-size:13px;color:grey;'>Cohort Volumes: Baseline N={len(reference_df):,} | Production N={len(current_data_df):,}</span>"),
        template="plotly_dark",
        height=850,
        showlegend=True
    )
    fig.update_yaxes(
        title_text="PSI Index Value", 
        row=1, col=1
    )
    fig.update_yaxes(title_text="Probability Density", row=2, col=1)
    fig.update_xaxes(title_text="Predicted Churn Probability Range", row=2, col=1)

    # Save to JSON for React-Plotly
    json_path = MONITORING_DIR / "drift_report.json"
    with open(json_path, "w") as f:
        f.write(pio.to_json(fig))
    logger.info(f"Saved interactive Plotly JSON drift report to: {json_path}")
    
    # Copy to frontend/public
    fe_public = Path(BASE_DIR) / "frontend" / "public"
    if fe_public.exists():
        fe_path = fe_public / "drift_report.json"
        with open(fe_path, "w") as f:
            f.write(pio.to_json(fig))
        logger.info(f"Copied Plotly JSON drift report to frontend: {fe_path}")

    # GENERATE HTML DOCUMENT
    html_out_path = MONITORING_DIR / "drift_report.html"
    fig.write_html(str(html_out_path), include_plotlyjs="cdn", full_html=True)
    
    summary_telemetry = {
        "drift_alert_triggered": any_major_drift,
        "cohort_sizes": {"reference_n": len(reference_df), "current_n": len(current_data_df)},
        "metrics": {f: {"psi": p, "status": s} for f, p, s in zip(features, psi_scores, statuses)}
    }
    with open(MONITORING_DIR / "drift_summary.json", "w") as f:
        json.dump(summary_telemetry, f, indent=4)

    logger.info(f"Interactive Plotly HTML dashboard generated cleanly: {html_out_path}")
    return html_out_path

def _simulate_production_drift(reference: pd.DataFrame) -> pd.DataFrame:
    current_sim = reference.copy()
    rng = np.random.default_rng(42)
    
    if "y_pred_proba" in current_sim.columns:
        eps = 1e-5
        logits = np.log((current_sim["y_pred_proba"] + eps) / (1 - current_sim["y_pred_proba"] + eps))
        shifted_logits = logits + rng.normal(loc=0.8, scale=0.3, size=len(current_sim))
        current_sim["y_pred_proba"] = 1 / (1 + np.exp(-shifted_logits))
        
    return current_sim

if __name__ == "__main__":
    master_data_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if os.path.exists(master_data_path):
        live_df = pd.read_csv(master_data_path)
        
        if "y_true" not in live_df.columns:
            live_df["y_true"] = live_df["churn_risk"] if "churn_risk" in live_df.columns else 0
        if "y_pred_proba" not in live_df.columns:
            rng = np.random.default_rng(42)
            live_df["y_pred_proba"] = rng.beta(a=0.5, b=2, size=len(live_df))
            
        run_monitoring_report(current_data=live_df)
    else:
        run_monitoring_report(current_data=None)
