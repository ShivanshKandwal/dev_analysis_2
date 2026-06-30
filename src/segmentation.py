import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
import logging
import umap
import hdbscan
from sklearn.preprocessing import StandardScaler
import plotly.express as px
import plotly.io as pio

from config import PROCESSED_DIR, REGRESSION_TARGET, BASE_DIR

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

# Establish fresh directory routing for model artifacts & visualization folders
MODELS_DIR = Path(PROCESSED_DIR) / "models"
REPORTS_DIR = Path(BASE_DIR) / "monitoring"
for folder in [MODELS_DIR, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

CLUSTER_COLORS = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626", 
                  "#0891b2", "#7c2d12", "#4f46e5", "#be185d", "#15803d"]

def compute_developer_rfm(df: pd.DataFrame) -> pd.DataFrame:
    """
    Translates standard retail RFM metrics into developer behavior profiles:
    R = Tech Freshness / Multi-Year Survey Recency Tracker
    F = Tool Depth (Count of active binarized tech columns checked)
    M = Relative Financial Standing (Within-country target wage rank percentile)
    """
    print("Computing specialized Developer RFM heuristics...")
    df = df.copy()

    # R Metric: Proxy via combination of survey year and technology indicators
    df["rfm_r_raw"] = df["SurveyYear"] + df.get("Cluster_DevOps_Count", 0) * 0.1

    # F Metric: Sum up all binarized tech stacks active for the profile row
    tech_cols = [c for c in df.columns if any(p in c for p in ['Lang_', 'DB_', 'Cloud_', 'Tool_', 'Collab_'])]
    df["rfm_f_raw"] = df[tech_cols].sum(axis=1) if tech_cols else df["YearsCode"]

    # M Metric: Within-country salary percentile rank to ignore regional currency bias
    if REGRESSION_TARGET in df.columns:
        df["rfm_m_raw"] = df.groupby("Country")[REGRESSION_TARGET].transform(lambda x: x.rank(pct=True)).fillna(0.5)
    else:
        df["rfm_m_raw"] = 0.5

    # Quantile mapping down to standard 1-5 scoring brackets
    for col, raw in [("rfm_r", "rfm_r_raw"), ("rfm_f", "rfm_f_raw"), ("rfm_m", "rfm_m_raw")]:
        df[col] = pd.qcut(df[raw].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)

    df["rfm_score"] = df["rfm_r"] * 100 + df["rfm_f"] * 10 + df["rfm_m"]

    def assign_rfm_segment(score):
        if score >= 455: return "Elite Champions"
        elif score >= 344: return "Core Productive Builders"
        elif score >= 233: return "Rising Talents"
        elif score >= 122: return "At-Risk / Legacy Stack"
        else: return "Passive Mainstream Learners"

    df["rfm_segment"] = df["rfm_score"].apply(assign_rfm_segment)
    return df

def run_developer_segmentation():
    print("=" * 60)
    print("RUNNING ADVANCED UMAP + HDBSCAN SEGMENTATION PIPELINE")
    print("=" * 60)

    # 1. Ingest Master Dataset
    master_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if not os.path.exists(master_path):
        print(f"Error: {master_path} missing! Run data_cleaning.py first.")
        return

    df = pd.read_csv(master_path)
    
    # Run structural behavior heuristics first
    df = compute_developer_rfm(df)

    # 2. Compile Cluster Training Matrix (Drop non-numeric/leaky identifiers)
    drop_cols = [REGRESSION_TARGET, "ResponseId", "CompTotal", "Currency", "rfm_segment", "Country", "DevType", "EdLevel", "Employment", "OrgSize", "RemoteWork", "MainBranch", "Age"]
    drop_cols = [c for c in drop_cols if c in df.columns]
    
    X_features = df.drop(columns=drop_cols)
    feature_names = X_features.columns.tolist()

    print(f"Scaling matrix tracking {len(feature_names)} analytical dimensions...")
    X_scaled = StandardScaler().fit_transform(X_features.fillna(0).values)

    # 3. Apply Multi-Track UMAP Spatial Compression
    print("Compressing dimensions into 2D map for frontend visuals...")
    umap_2d = umap.UMAP(n_components=2, n_neighbors=30, min_dist=0.1, random_state=42)
    embedding_2d = umap_2d.fit_transform(X_scaled)
    df["umap_x"] = embedding_2d[:, 0]
    df["umap_y"] = embedding_2d[:, 1]

    print("Compressing dimensions into 10D workspace for density clustering...")
    umap_10d = umap.UMAP(n_components=10, n_neighbors=30, min_dist=0.0, random_state=42)
    embedding_10d = umap_10d.fit_transform(X_scaled)

    # 4. Dense Cluster Assignment via HDBSCAN
    print("Executing density-based HDBSCAN cluster partitioning...")
    hdb = hdbscan.HDBSCAN(min_cluster_size=250, min_samples=30, cluster_selection_method="eom", prediction_data=True)
    df["cluster_label"] = hdb.fit_predict(embedding_10d)

    # 5. Dynamic Cluster Characterization
    names = {}
    for cid in sorted(df["cluster_label"].unique()):
        if cid == -1:
            names[cid] = "Global Outlier Noise"
            continue
        
        sub = df[df["cluster_label"] == cid]
        avg_exp = sub["YearsCodePro"].mean()
        avg_devops = sub.get("Cluster_DevOps_Count", pd.Series(0)).mean()
        
        if avg_exp > 12: label = "Senior Enterprise Pioneers"
        elif avg_devops > 2.0: label = "Cloud-Native Infrastructure Architects"
        elif avg_exp < 4: label = "Junior Accelerated Growers"
        else: label = "Mid-Tier Fullstack Specialists"
        
        names[cid] = f"{label} (Group {cid})"

    df["cluster_name"] = df["cluster_label"].map(names)
    
    # 6. Generate High-Performance Metrics Summary Profile
    print("Compiling strategic cluster matrices and operational logs...")
    profile = df.groupby("cluster_name").agg({
        "YearsCodePro": "mean",
        "rfm_score": "mean",
        REGRESSION_TARGET: "median"
    }).rename(columns={REGRESSION_TARGET: "Median_Salary_USD"}).round(2)
    profile["Headcount"] = df.groupby("cluster_name").size()
    profile["Percentage_Share"] = ((profile["Headcount"] / len(df)) * 100).round(1)

    print("\nWORKSPACE SEGMENTATION PROFILES:")
    print(profile.to_string())

    # 7. Write Artifact Assets to Disk
    joblib.dump(umap_2d, os.path.join(MODELS_DIR, "umap_spatial_2d.joblib"))
    joblib.dump(hdb, os.path.join(MODELS_DIR, "hdbscan_cluster_engine.joblib"))
    profile.to_csv(os.path.join(MODELS_DIR, "cluster_behavioral_profiles.csv"))
    
    # Save a lightweight Parquet file for fast loading
    df[["umap_x", "umap_y", "cluster_label", "cluster_name", "YearsCodePro", "rfm_segment"]].to_parquet(
        os.path.join(MODELS_DIR, "inference_coordinates.parquet"), index=False
    )

    # 8. Render Beautiful Visual Layouts
    print("\nExporting diagnostic asset plots...")
    # Keep output light by subsampling scatter plot if data is massive
    sub_df = df.sample(n=min(5000, len(df)), random_state=42)
    
    fig = px.scatter(
        sub_df, x="umap_x", y="umap_y", color="cluster_name",
        title="Developer Segments - High-Dimensional Layout Space (UMAP)",
        color_discrete_sequence=CLUSTER_COLORS, opacity=0.5, template="plotly_dark"
    )
    fig.update_traces(marker=dict(size=4))
    
    # Save as JSON for React-Plotly
    json_path = REPORTS_DIR / "umap_developer_clusters.json"
    with open(json_path, "w") as f:
        f.write(pio.to_json(fig))
    print(f"Saved Plotly JSON cluster map to: {json_path}")
    
    # Copy to frontend/public
    fe_public = Path(BASE_DIR) / "frontend" / "public"
    if fe_public.exists():
        fe_path = fe_public / "umap_developer_clusters.json"
        with open(fe_path, "w") as f:
            f.write(pio.to_json(fig))
        print(f"Copied Plotly JSON cluster map to frontend: {fe_path}")

    # Save as HTML
    html_path = os.path.join(REPORTS_DIR, "umap_developer_clusters.html")
    fig.write_html(html_path)
    print(f"Saved interactive HTML report: {html_path}")
    
    # Write back the cluster labels to master csv for churn calculations downstream
    df.to_csv(master_path, index=False)
    print(f"Updated {master_path} with cluster assignments!")
    print("=" * 60)

if __name__ == "__main__":
    run_developer_segmentation()
