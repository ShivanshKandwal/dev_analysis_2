import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import gradio as gr
import faiss
from sentence_transformers import SentenceTransformer
from pathlib import Path

# Setup central directories
BASE_DIR = Path(__file__).resolve().parent

# Monkeypatch FastAPI constructor to automatically inject CORS middleware on initialization
import fastapi
from fastapi.middleware.cors import CORSMiddleware
original_init = fastapi.FastAPI.__init__

def patched_init(self, *args, **kwargs):
    original_init(self, *args, **kwargs)
    self.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://shivanshkandwal.github.io",
            "http://localhost:5173"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

fastapi.FastAPI.__init__ = patched_init
MODELS_DIR = BASE_DIR / "models"
PROCESSED_MODELS_DIR = BASE_DIR / "data" / "processed" / "models"
DATA_PATH = BASE_DIR / "data" / "processed" / "master_table_v2.csv"

# Load models and assets
print("Loading core models and training states...")
try:
    # 1. Salary Regressor
    if (MODELS_DIR / "salary_predictor.pkl").exists():
        salary_model = joblib.load(MODELS_DIR / "salary_predictor.pkl")
    else:
        salary_model = joblib.load(PROCESSED_MODELS_DIR / "salary_predictor.pkl")

    # 2. Churn & Career Regressors
    churn_model = joblib.load(PROCESSED_MODELS_DIR / "churn_xgb.pkl")
    career_model = joblib.load(PROCESSED_MODELS_DIR / "career_xgb.pkl")

    # 3. FAISS Index & Semantic Assets
    faiss_index = faiss.read_index(str(PROCESSED_MODELS_DIR / "faiss_profiles.index"))
    profile_embeddings = np.load(PROCESSED_MODELS_DIR / "profile_embeddings.npy")
    with open(PROCESSED_MODELS_DIR / "profile_texts.json", "r") as f:
        profile_texts = json.load(f)
    retrieval_meta = pd.read_parquet(PROCESSED_MODELS_DIR / "retrieval_meta.parquet")

    # 4. Master Dataset for target encodings and choices lookup
    print(f"Loading master clean dataset from {DATA_PATH}...")
    master_df = pd.read_csv(DATA_PATH)
    
    # Extract encoders dynamically from training state
    country_enc_map = master_df.groupby("Country")["Country_TargetEncoded"].first().to_dict()
    devtype_enc_map = master_df.groupby("DevType")["DevType_TargetEncoded"].first().to_dict()
    
    # Choices lists
    countries = sorted(master_df["Country"].dropna().unique().tolist())
    dev_types = sorted(master_df["DevType"].dropna().unique().tolist())
    ed_levels = sorted(master_df["EdLevel"].dropna().unique().tolist())
    org_sizes = sorted(master_df["OrgSize"].dropna().unique().tolist())
    remote_options = sorted(master_df["RemoteWork"].dropna().unique().tolist())

    print("Success: All modeling matrices and FAISS indexes loaded.")
except Exception as e:
    print(f"Error initializing assets: {e}")
    sys.exit(1)

# Lazy-loaded SentenceTransformer to optimize memory startup
_embed_model = None
def get_embed_model():
    global _embed_model
    if _embed_model is None:
        print("Initializing SentenceTransformer encoder...")
        _embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embed_model

def predict_salary_interface(
    country, ed_level, org_size, dev_type, remote_work,
    years_code, years_code_pro, work_exp, job_sat
):
    # Preprocess categorical mapped inputs
    ed_level_num = {
        "Primary/elementary school": 1,
        "Secondary school (e.g. American high school, German Realschule or Gymnasium, etc.)": 2,
        "Some college/university study without earning a degree": 3,
        "Bachelor’s degree (B.A., B.S., B.Eng., etc.)": 4,
        "Master’s degree (M.A., M.S., M.Eng., MBA, etc.)": 5,
        "Professional degree (JD, MD, Ph.D, Ed.D, etc.)": 6,
    }.get(ed_level, 3)

    org_size_num = {
        "Just me - I am a freelancer, sole proprietor, etc.": 1,
        "2 to 9 employees": 5,
        "10 to 19 employees": 14,
        "20 to 99 employees": 50,
        "100 to 499 employees": 250,
        "500 to 999 employees": 700,
        "1,000 to 4,999 employees": 2500,
        "5,000 to 9,999 employees": 7500,
        "10,000 or more employees": 15000,
    }.get(org_size, 50)

    is_large_org = 1 if org_size_num >= 1000 else 0
    is_small_org = 1 if org_size_num <= 20 else 0
    is_remote = 1 if "remote" in str(remote_work).lower() else 0
    is_hybrid = 1 if "hybrid" in str(remote_work).lower() else 0

    high_income_countries = {"United States of America", "United Kingdom of Great Britain and Northern Ireland", "Germany", "Canada", "Australia", "Netherlands", "Sweden", "Norway", "Denmark", "Switzerland"}
    is_high_income = 1 if country in high_income_countries else 0
    country_target_enc = country_enc_map.get(country, -1)

    career_stage_num = 0 if years_code_pro <= 3 else (1 if years_code_pro <= 8 else (2 if years_code_pro <= 15 else 3))
    experience_gap = max(0, years_code - years_code_pro)

    # Boolean Tech flags inferred from devtype
    is_backend = 1 if "back-end" in dev_type.lower() or "backend" in dev_type.lower() else 0
    is_frontend = 1 if "front-end" in dev_type.lower() or "frontend" in dev_type.lower() else 0
    is_fullstack = 1 if "full-stack" in dev_type.lower() or "fullstack" in dev_type.lower() else 0
    is_data = 1 if "data" in dev_type.lower() else 0
    is_ml_ai = 1 if "machine learning" in dev_type.lower() or "ai" in dev_type.lower() else 0
    is_devops = 1 if "devops" in dev_type.lower() or "reliability" in dev_type.lower() else 0
    is_mobile = 1 if "mobile" in dev_type.lower() else 0
    is_manager = 1 if "manager" in dev_type.lower() or "executive" in dev_type.lower() else 0

    # Build input features frame matching new_model.py
    feat_df = pd.DataFrame([{
        "years_code_num": years_code,
        "years_code_pro_num": years_code_pro,
        "career_stage_num": career_stage_num,
        "experience_gap": experience_gap,
        "ed_level_num": ed_level_num,
        "org_size_num": org_size_num,
        "is_large_org": is_large_org,
        "is_small_org": is_small_org,
        "is_remote": is_remote,
        "is_hybrid": is_hybrid,
        "lang_count": 4, # baseline averages
        "db_count": 2,
        "tool_count": 2,
        "fw_count": 1,
        "ai_tool_count": 0,
        "uses_python": 1 if "data" in dev_type.lower() or "machine learning" in dev_type.lower() else 0,
        "uses_javascript": 1 if "front" in dev_type.lower() or "full" in dev_type.lower() else 0,
        "uses_typescript": 1 if "front" in dev_type.lower() or "full" in dev_type.lower() else 0,
        "uses_rust": 0,
        "uses_sql": 1,
        "uses_ai_tools": 0,
        "uses_cloud": 1 if is_large_org else 0,
        "is_backend": is_backend,
        "is_frontend": is_frontend,
        "is_fullstack": is_fullstack,
        "is_data": is_data,
        "is_ml_ai": is_ml_ai,
        "is_devops": is_devops,
        "is_mobile": is_mobile,
        "is_manager": is_manager,
        "job_sat_score": job_sat,
        "is_high_income_country": is_high_income,
        "country_target_enc": country_target_enc,
        "survey_year": 2024
    }])

    # Predict Log scale and reconstruct to dollars
    pred_log = salary_model.predict(feat_df)[0]
    pred_salary = np.expm1(pred_log)

    val = f"${pred_salary:,.2f}"
    return f"""
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; border: 1px solid rgba(0,255,255,0.2); border-radius: 12px; background: rgba(0,0,0,0.4); box-shadow: 0 0 20px rgba(0,255,255,0.1); margin-top: 10px;" class="salary-box">
        <span style="font-size: 13px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase;">Estimated Compensation</span>
        <span style="font-size: 38px; font-weight: 900; color: #00ffff; text-shadow: 0 0 15px rgba(0,255,255,0.6); margin: 10px 0; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">{val}</span>
        <span style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: 1px;">USD / Annual</span>
    </div>
    """

def predict_retention_interface(
    years_code, years_code_pro, work_exp, is_enterprise, dev_type
):
    is_ent_val = 1 if is_enterprise == "Enterprise Organization (1,000+ employees)" else 0
    cluster_devops_count = 3 if "devops" in dev_type.lower() else 0
    cluster_databackend_count = 3 if "data" in dev_type.lower() or "back-end" in dev_type.lower() else 0
    
    # 1. Churn Prediction
    churn_feats = pd.DataFrame([{
        "YearsCode": years_code,
        "YearsCodePro": years_code_pro,
        "WorkExp": work_exp,
        "SurveyYear": 2024,
        "Cluster_DevOps_Count": cluster_devops_count,
        "Cluster_DataBackend_Count": cluster_databackend_count,
        "Is_Enterprise": is_ent_val,
        "Enterprise_Experience_Interaction": is_ent_val * years_code_pro,
        "cluster_label": 1 # baseline default
    }])
    
    churn_cols = ["YearsCode", "YearsCodePro", "WorkExp", "SurveyYear", "Cluster_DevOps_Count", "Cluster_DataBackend_Count", "Is_Enterprise", "Enterprise_Experience_Interaction", "cluster_label"]
    churn_feats = churn_feats[churn_cols]
    
    churn_prob = float(churn_model.predict_proba(churn_feats)[0, 1])
    risk_level = "🔴 CRITICAL ATTRITION RISK" if churn_prob >= 0.60 else "🟡 ELEVATED ATTRITION RISK" if churn_prob >= 0.35 else "🟢 STABLE CORE COHORT"
    
    # 2. Career Value Prediction
    country_enc = 11.2 # US median placeholder for baseline
    devtype_enc = devtype_enc_map.get(dev_type, 11.0)
    
    career_feats = pd.DataFrame([{
        "YearsCode": years_code,
        "YearsCodePro": years_code_pro,
        "WorkExp": work_exp,
        "SurveyYear": 2024,
        "Cluster_DevOps_Count": cluster_devops_count,
        "Cluster_DataBackend_Count": cluster_databackend_count,
        "Is_Enterprise": is_ent_val,
        "cluster_label": 1,
        "Country_TargetEncoded": country_enc,
        "DevType_TargetEncoded": devtype_enc
    }])
    
    career_cols = ["YearsCode", "YearsCodePro", "WorkExp", "SurveyYear", "Cluster_DevOps_Count", "Cluster_DataBackend_Count", "Is_Enterprise", "cluster_label", "Country_TargetEncoded", "DevType_TargetEncoded"]
    career_feats = career_feats[career_cols]
    
    predicted_log_val = career_model.predict(career_feats)[0]
    predicted_val_usd = np.expm1(predicted_log_val)
    
    prob_val = f"{churn_prob:.1%}"
    risk_color = "#ef4444" if "CRITICAL" in risk_level else "#eab308" if "ELEVATED" in risk_level else "#10b981"
    
    return f"""
    <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; margin-top: 10px;" class="retention-box">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 18px; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; background: rgba(0,0,0,0.3);">
            <span style="font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase;">Attrition Churn Probability</span>
            <span style="font-size: 32px; font-weight: 900; color: {risk_color}; text-shadow: 0 0 10px {risk_color}44; margin-top: 6px;">{prob_val}</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 18px; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; background: rgba(0,0,0,0.3);">
            <span style="font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase;">Risk Assessment Status</span>
            <span style="font-size: 20px; font-weight: 950; color: {risk_color}; margin-top: 6px; animation: pulse 2s infinite;">{risk_level}</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 18px; border: 1px solid rgba(0,255,255,0.15); border-radius: 12px; background: rgba(0,0,0,0.3);">
            <span style="font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase;">Estimated Profile Career Value</span>
            <span style="font-size: 32px; font-weight: 900; color: #00ffff; text-shadow: 0 0 12px rgba(0,255,255,0.4); margin-top: 6px;">${predicted_val_usd:,.2f}</span>
            <span style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-top: 2px;">USD</span>
        </div>
    </div>
    """

def semantic_search_interface(query, k=5):
    if not query.strip():
        return "Please input a query description."
    
    encoder = get_embed_model()
    query_vector = encoder.encode([query], normalize_embeddings=True).astype("float32")
    
    scores, indices = faiss_index.search(query_vector, int(k))
    
    out_lines = []
    for count, (score, idx) in enumerate(zip(scores[0], indices[0]), 1):
        if idx >= 0 and idx < len(profile_texts):
            profile_str = profile_texts[idx]
            
            # Fetch companion metadata if valid
            meta_str = ""
            if idx < len(retrieval_meta):
                meta_row = retrieval_meta.iloc[idx]
                meta_str = f" | Country: {meta_row.get('Country', 'N/A')} | Stage: {meta_row.get('career_stage', 'N/A')} | Sat Score: {meta_row.get('job_sat_score', 'N/A')}/5"
                
            out_lines.append(f"### Match #{count} (Similarity Score: {score:.4f}{meta_str})\n> {profile_str}\n")
            
    return "\n".join(out_lines) if out_lines else "No similar developer profiles found."

# Design a gorgeous premium dark-themed Gradio Layout matching the website
custom_theme = gr.themes.Default(
    primary_hue="cyan",
    secondary_hue="cyan",
    neutral_hue="slate"
).set(
    body_background_fill="black",
    body_background_fill_dark="black",
    block_background_fill="rgba(15, 23, 42, 0.4)",
    block_background_fill_dark="rgba(15, 23, 42, 0.4)",
    block_border_color="rgba(0, 255, 255, 0.15)",
    block_border_color_dark="rgba(0, 255, 255, 0.15)",
    button_primary_background_fill="#06b6d4",
    button_primary_background_fill_dark="#06b6d4",
    button_primary_text_color="white",
    button_primary_text_color_dark="white"
)

custom_css = """
body, .gradio-container {
    background-color: black !important;
    background-image: radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 80%) !important;
}
.gradio-container {
    border: 1px solid rgba(0, 255, 255, 0.1) !important;
    border-radius: 16px !important;
    padding: 24px !important;
}
footer {
    display: none !important;
}
"""

with gr.Blocks(theme=custom_theme, css=custom_css, title="DevIntel Unified Predictive Hub") as demo:
    gr.Markdown(
        """
        # 🧬 DevIntel Unified Predictive Hub
        *A state-of-the-art predictive dashboard serving deep salary regression, organizational retention forecasting, and FAISS-based semantic talent matching.*
        """
    )
    
    with gr.Tabs():
        # TAB 1: SALARY ESTIMATOR
        with gr.TabItem("💵 Salary Predictor Engine"):
            gr.Markdown(
                """
                ### Annual Compensation Estimator
                Enter developer credentials to calculate their predicted market value based on Stack Overflow longitudinal surveys.
                """
            )
            with gr.Row():
                with gr.Column():
                    country = gr.Dropdown(label="Country Location", choices=countries, value="United States of America")
                    dev_type = gr.Dropdown(label="Developer Subtype / Role", choices=dev_types, value="Developer, back-end")
                    ed_level = gr.Dropdown(label="Highest Educational Level", choices=ed_levels, value="Bachelor’s degree (B.A., B.S., B.Eng., etc.)")
                    org_size = gr.Dropdown(label="Company Size", choices=org_sizes, value="100 to 499 employees")
                    remote_work = gr.Dropdown(label="Remote Modality", choices=remote_options, value="Remote")
                with gr.Column():
                    years_code = gr.Slider(label="Years of Coding Experience", minimum=0, maximum=50, value=10, step=1)
                    years_code_pro = gr.Slider(label="Years of Professional Experience", minimum=0, maximum=50, value=6, step=1)
                    work_exp = gr.Slider(label="Total Work Experience (Years)", minimum=0, maximum=50, value=8, step=1)
                    job_sat = gr.Slider(label="Job Satisfaction Score (1=Dissatisfied, 5=Satisfied)", minimum=1, maximum=5, value=4, step=1)
                    
                    submit_sal = gr.Button("Calculate Estimated Salary", variant="primary")
                    salary_output = gr.HTML(label="Predicted Annual Compensation Result")
                    
            submit_sal.click(
                predict_salary_interface,
                inputs=[country, ed_level, org_size, dev_type, remote_work, years_code, years_code_pro, work_exp, job_sat],
                outputs=salary_output,
                api_name="predict_salary_interface"
            )

        # TAB 2: RETENTION & CAREER VALUE
        with gr.TabItem("📊 Retention & Career Value Engine"):
            gr.Markdown(
                """
                ### Attrition Risk & Career Performance Analyzer
                Analyze employee attrition risk probability alongside predicted career valuation standings.
                """
            )
            with gr.Row():
                with gr.Column():
                    ret_dev_type = gr.Dropdown(label="Developer Role", choices=dev_types, value="Developer, back-end")
                    is_enterprise = gr.Radio(
                        label="Organization Type", 
                        choices=["Startup / Mid-Size Organization", "Enterprise Organization (1,000+ employees)"],
                        value="Startup / Mid-Size Organization"
                    )
                    ret_years_code = gr.Slider(label="Years of Coding", minimum=0, maximum=50, value=8, step=1)
                    ret_years_code_pro = gr.Slider(label="Years of Pro Coding", minimum=0, maximum=50, value=4, step=1)
                    ret_work_exp = gr.Slider(label="Total Work Experience", minimum=0, maximum=50, value=6, step=1)
                    
                    submit_ret = gr.Button("Evaluate Attrition Risks & Career Value", variant="primary")
                    
                with gr.Column():
                    retention_output = gr.HTML(label="Diagnostic Assessment Result")
                    
            submit_ret.click(
                predict_retention_interface,
                inputs=[ret_years_code, ret_years_code_pro, ret_work_exp, is_enterprise, ret_dev_type],
                outputs=retention_output,
                api_name="predict_retention_interface"
            )

        # TAB 3: SEMANTIC TALENT MATCHING
        with gr.TabItem("🧬 Semantic Profile Matcher"):
            gr.Markdown(
                """
                ### Vector Embedding Search Profile Finder
                Search the 15,000 encoded developer profiles semantically using natural language descriptions.
                """
            )
            with gr.Row():
                with gr.Column():
                    search_query = gr.Textbox(
                        label="Semantic Search Prompt / Talent Description", 
                        placeholder="e.g., Python backend engineer with 8 years experience based in Germany working with SQL.",
                        lines=3
                    )
                    top_k = gr.Slider(label="Number of Matching Profiles to Retrieve", minimum=1, maximum=15, value=5, step=1)
                    submit_search = gr.Button("Search Developer Index", variant="primary")
                    
                with gr.Column():
                    search_results = gr.Markdown(
                        value="*Enter a technical profile description in the prompt box on the left and click **Search Developer Index** to visualize semantically aligned developer profiles.*",
                        label="Discovered Talent Matches"
                    )
                    
            submit_search.click(
                semantic_search_interface,
                inputs=[search_query, top_k],
                outputs=search_results,
                api_name="semantic_search_interface"
            )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    demo.launch(server_name="0.0.0.0", server_port=port)
