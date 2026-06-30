import os
import pandas as pd
import numpy as np
import json
import joblib
import faiss
from pathlib import Path
import logging
import warnings
warnings.filterwarnings("ignore")

from sentence_transformers import SentenceTransformer
import umap
import hdbscan
import plotly.express as px
import plotly.io as pio

from config import BASE_DIR, PROCESSED_DIR

logger = logging.getLogger(__name__)

# Set up local directories
MODELS = Path(PROCESSED_DIR) / "models"
REPORTS_DIR = Path(BASE_DIR) / "monitoring"
for folder in [MODELS, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

def build_profile_text(row: pd.Series) -> str:
    """
    Construct a natural-language developer profile string from structured fields.
    This is the corpus we run NLP on.
    """
    parts = []

    devtype = str(row.get("DevType", "")).replace(";", ", ")
    if devtype and devtype != "Not Answered" and devtype != "nan":
        parts.append(f"I am a {devtype}")

    yrs = row.get("YearsCodePro", None)
    if yrs and not pd.isna(yrs):
        parts.append(f"with {int(yrs)} years of professional experience")

    stage = row.get("career_stage", "")
    if stage and stage != "Unknown" and stage != "nan":
        parts.append(f"at the {stage} career stage")

    # Look for active programming languages in your binary columns
    langs = []
    for col in row.index:
        if col.startswith("Lang_") and row[col] == 1:
            langs.append(col.split("_", 1)[1].replace("_", " "))
    if langs:
        parts.append(f"I work with {', '.join(langs[:5])}")

    if row.get("uses_ai_tools", 0) == 1:
        parts.append("I actively use AI coding tools")

    if row.get("uses_cloud", 0) == 1:
        parts.append("and deploy to cloud platforms")

    country = str(row.get("Country", "")).replace("Not Answered", "").replace("nan", "")
    if country:
        parts.append(f"based in {country}")

    org = row.get("org_size_num", None)
    if org and not pd.isna(org):
        if org <= 20:
            parts.append("at a small organization")
        elif org <= 500:
            parts.append("at a mid-size organization")
        else:
            parts.append("at a large enterprise")

    remote = row.get("is_remote", 0)
    if remote == 1:
        parts.append("working remotely")

    ed = row.get("EdLevel", "")
    if ed and "Not Answered" not in str(ed) and str(ed) != "nan":
        parts.append(f"Education: {ed}")

    sat = row.get("job_sat_score", None)
    if sat and not pd.isna(sat):
        sat_label = {1: "very dissatisfied", 2: "dissatisfied", 3: "neutral",
                     4: "satisfied", 5: "very satisfied"}.get(int(sat), "")
        if sat_label:
            parts.append(f"Currently {sat_label} with my job")

    return ". ".join(parts) + "." if parts else "Developer profile unavailable."

def build_corpus(df: pd.DataFrame) -> list[str]:
    logger.info(f"Building profile text for {len(df):,} developers...")
    texts = df.apply(build_profile_text, axis=1).tolist()
    logger.info(f"Sample profile: {texts[0][:200]}")
    return texts

def compute_embeddings(texts: list[str],
                       batch_size: int = 128,
                       save: bool = True) -> np.ndarray:
    """
    Encode profile texts with MiniLM. Returns (N, 384) float32 array.
    """
    logger.info(f"Loading embedding model: {EMBED_MODEL_NAME}")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    logger.info(f"Encoding {len(texts):,} profiles (batch_size={batch_size})...")
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    logger.info(f"Embeddings shape: {embeddings.shape}")

    if save:
        np.save(MODELS / "profile_embeddings.npy", embeddings)
        logger.info(f"Saved to {MODELS / 'profile_embeddings.npy'}")

    return embeddings.astype("float32")

def build_faiss_index(embeddings: np.ndarray) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    logger.info(f"FAISS index built: {index.ntotal:,} vectors, dim={dim}")

    index_path = str(MODELS / "faiss_profiles.index")
    faiss.write_index(index, index_path)
    logger.info(f"FAISS index saved to {index_path}")
    return index

def embed_cluster_analysis(embeddings: np.ndarray,
                             df: pd.DataFrame) -> pd.DataFrame:
    logger.info("UMAP on NLP embeddings...")
    reducer = umap.UMAP(n_components=2, n_neighbors=30, min_dist=0.1,
                        random_state=42, verbose=False)
    emb_2d = reducer.fit_transform(embeddings)

    df = df.copy()
    df["nlp_umap_x"] = emb_2d[:, 0]
    df["nlp_umap_y"] = emb_2d[:, 1]

    logger.info("HDBSCAN on full embedding space...")
    hdb = hdbscan.HDBSCAN(min_cluster_size=300, min_samples=50)
    df["nlp_cluster"] = hdb.fit_predict(embeddings)
    n_nlp = df["nlp_cluster"].nunique() - (1 if -1 in df["nlp_cluster"].values else 0)
    logger.info(f"NLP clustering: {n_nlp} clusters")

    if "cluster_label" in df.columns:
        agreement = (df["nlp_cluster"] == df["cluster_label"]).mean()
        logger.info(f"NLP vs behavioral cluster agreement: {agreement:.1%}")

    return df

def generate_interactive_semantic_map(df: pd.DataFrame, texts: list[str], output_path: Path):
    logger.info("Constructing interactive Plotly semantic profile layout...")
    
    # Subsample to keep output lightweight
    sample_size = min(3000, len(df))
    sub_idx = np.random.choice(len(df), size=sample_size, replace=False)
    
    plot_df = df.iloc[sub_idx].copy()
    plot_df["Profile Text Summary"] = [texts[idx][:150] + "..." if len(texts[idx]) > 150 else texts[idx] for idx in sub_idx]
    plot_df["NLP Cluster Label"] = plot_df["nlp_cluster"].apply(lambda x: f"Cluster {x}" if x != -1 else "Noise/Unclustered")
    
    hover_data = {
        "nlp_umap_x": False,
        "nlp_umap_y": False,
        "NLP Cluster Label": True,
        "Profile Text Summary": True
    }
    
    for opt_col in ["career_stage", "Country", "job_sat_score"]:
        if opt_col in plot_df.columns:
            hover_data[opt_col] = True

    fig = px.scatter(
        plot_df,
        x="nlp_umap_x",
        y="nlp_umap_y",
        color="NLP Cluster Label",
        hover_data=hover_data,
        title="Developer Space: Interactive NLP Vector Embeddings (UMAP)",
        labels={"nlp_umap_x": "UMAP Dimension 1", "nlp_umap_y": "UMAP Dimension 2"},
        opacity=0.7,
        template="plotly_dark"
    )

    fig.update_traces(marker=dict(size=4))

    # Save as JSON for React-Plotly
    json_path = REPORTS_DIR / "nlp_profile_map.json"
    with open(json_path, "w") as f:
        f.write(pio.to_json(fig))
    logger.info(f"Saved Plotly JSON semantic profile map to: {json_path}")
    
    # Copy to frontend/public
    fe_public = Path(BASE_DIR) / "frontend" / "public"
    if fe_public.exists():
        fe_path = fe_public / "nlp_profile_map.json"
        with open(fe_path, "w") as f:
            f.write(pio.to_json(fig))
        logger.info(f"Copied Plotly JSON semantic profile map to frontend: {fe_path}")

    # Save as HTML
    fig.write_html(str(output_path))
    logger.info(f"Interactive embedding space dashboard written to: {output_path}")

def run_nlp_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    # Subsample master dataframe for embedding computations to make it faster in test
    sample_size = min(15000, len(df))
    logger.info(f"Subsampling {sample_size:,} records from master table of {len(df):,} for SentenceTransformer embedding extraction...")
    df_sub = df.sample(n=sample_size, random_state=42).reset_index(drop=True)
    
    texts = build_corpus(df_sub)

    # Save sample texts
    with open(MODELS / "profile_texts.json", "w") as f:
        json.dump(texts[:1000], f)

    embeddings = compute_embeddings(texts)
    build_faiss_index(embeddings)

    df_sub = embed_cluster_analysis(embeddings, df_sub)

    html_report_path = REPORTS_DIR / "nlp_profile_map.html"
    generate_interactive_semantic_map(df_sub, texts, html_report_path)

    # Save profile metadata for retrieval display
    meta_cols = ["career_stage", "Country", "lang_count", "uses_python", "uses_ai_tools", "job_sat_score", "cluster_name"]
    available_meta = [c for c in meta_cols if c in df_sub.columns]
    
    if available_meta:
        retrieval_meta = df_sub[available_meta].copy()
        retrieval_meta.to_parquet(MODELS / "retrieval_meta.parquet", index=False)

    logger.info("NLP pipeline complete.")
    return df_sub

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    
    master_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if os.path.exists(master_path):
        df = pd.read_csv(master_path)
        run_nlp_pipeline(df)
    else:
        logger.error(f"Error: Missing master file. Complete data cleaning loops first.")
