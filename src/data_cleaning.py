import os
import re
import pandas as pd
import numpy as np
import joblib
from config import RAW_DIR, PROCESSED_DIR, REGRESSION_TARGET, INTERSECTION_COLUMNS

class SemicolonMultiLabelBinarizer:
    def __init__(self, max_features=35):
        self.max_features = max_features
        self.top_features_ = []

    def fit(self, series):
        counts = {}
        for row in series.dropna().astype(str):
            items = [i.strip() for i in row.split(';') if i.strip()]
            for item in items:
                counts[item] = counts.get(item, 0) + 1
        sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        self.top_features_ = [item[0] for item in sorted_items[:self.max_features]]
        return self

    def transform(self, series, prefix):
        encoded_df = pd.DataFrame(0, index=series.index, columns=[f"{prefix}_{feat}" for feat in self.top_features_])
        for idx, row in series.dropna().astype(str).items():
            items = [i.strip() for i in row.split(';') if i.strip()]
            for item in items:
                col_name = f"{prefix}_{item}"
                if col_name in encoded_df.columns:
                    encoded_df.at[idx, col_name] = 1
        return encoded_df

def build_master_table_v2():
    print("=" * 60)
    print("STARTING ADVANCED FEATURE ENGINEERING PIPELINE (V2)")
    print("=" * 60)

    if not os.path.exists(RAW_DIR):
        print(f"Error: Raw directory does not exist at {RAW_DIR}!")
        return

    all_dfs = []
    for root, dirs, files in os.walk(RAW_DIR):
        for file in files:
            if file.endswith('.csv'):
                file_path = os.path.join(root, file)
                folder_name = os.path.basename(root)
                year_match = re.search(r'\d{4}', folder_name)
                year = int(year_match.group()) if year_match else 2026
                
                df_headers = pd.read_csv(file_path, nrows=0)
                valid_cols = [c for c in INTERSECTION_COLUMNS if c in df_headers.columns]
                
                df_temp = pd.read_csv(file_path, usecols=valid_cols, low_memory=False)
                df_temp['SurveyYear'] = year
                all_dfs.append(df_temp)

    if not all_dfs:
        print(f"Error: No CSV files discovered inside {RAW_DIR}!")
        return

    df = pd.concat(all_dfs, ignore_index=True, axis=0)
    
    if REGRESSION_TARGET in df.columns:
        df = df[df[REGRESSION_TARGET].notna()]
        df = df[(df[REGRESSION_TARGET] >= 5000) & (df[REGRESSION_TARGET] <= 1000000)]
    else:
        print("Error: Target column missing!")
        return

    # 1. Standardize Continuous Variables
    print("Processing continuous columns...")
    for col in ['YearsCode', 'YearsCodePro', 'WorkExp']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace('Less than 1 year', '0.5')
            df[col] = df[col].str.replace('More than 50 years', '51')
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df[col] = df[col].fillna(df[col].median() if not df[col].isna().all() else 0)

    # 2. Standardize Categorical Strings
    print("Cleaning structural categorical columns...")
    core_categoricals = ['Age', 'Country', 'DevType', 'EdLevel', 'Employment', 'OrgSize', 'RemoteWork', 'MainBranch']
    for col in core_categoricals:
        df[col] = df[col].fillna("Missing").astype(str)

    # 3. Extract Multi-Select Columns
    print("Extracting multi-select tech stack entries...")
    tech_mapping = {
        'LanguageHaveWorkedWith': 'Lang',
        'DatabaseHaveWorkedWith': 'DB',
        'PlatformHaveWorkedWith': 'Cloud',
        'ToolsTechHaveWorkedWith': 'Tool',
        'OfficeStackSyncHaveWorkedWith': 'Collab'
    }

    binarized_dfs = []
    for col, prefix in tech_mapping.items():
        if col in df.columns:
            binarizer = SemicolonMultiLabelBinarizer(max_features=35)
            binarizer.fit(df[col])
            encoded = binarizer.transform(df[col], prefix=prefix)
            binarized_dfs.append(encoded)

    df_core = df[[REGRESSION_TARGET, 'SurveyYear', 'YearsCode', 'YearsCodePro', 'WorkExp'] + core_categoricals].reset_index(drop=True)
    if binarized_dfs:
        df_tech = pd.concat(binarized_dfs, axis=1).reset_index(drop=True)
        df_final = pd.concat([df_core, df_tech], axis=1)
    else:
        df_final = df_core

    # --- ADVANCED FEATURE ENGINEERING BLOCK ---
    print("Computing advanced economic index metrics & interaction terms...")
    
    # Target Log-Scale Generation for Encoding Metrics
    log_target = np.log1p(df_final[REGRESSION_TARGET])
    
    # A. Target Encoding (Using median log salary to provide strong economic baseline signals)
    target_encodings = {}
    for col in ['Country', 'DevType', 'OrgSize']:
        encoding_map = log_target.groupby(df_final[col]).median().to_dict()
        df_final[f"{col}_TargetEncoded"] = df_final[col].map(encoding_map)
        target_encodings[col] = encoding_map
    
    # Save target maps for the FastAPI inference pipe
    if not os.path.exists(PROCESSED_DIR):
        os.makedirs(PROCESSED_DIR, exist_ok=True)
    joblib.dump(target_encodings, os.path.join(PROCESSED_DIR, "target_encodings.joblib"))

    # B. Macro Skill-Clustering Indicators
    # Cloud/DevOps Cluster
    devops_cols = [c for c in df_final.columns if any(x in c for x in ['AWS', 'Docker', 'Kubernetes', 'Terraform'])]
    df_final['Cluster_DevOps_Count'] = df_final[devops_cols].sum(axis=1) if devops_cols else 0
    
    # Modern Data & Backend Cluster
    data_cols = [c for c in df_final.columns if any(x in c for x in ['Python', 'PostgreSQL', 'Go', 'Rust'])]
    df_final['Cluster_DataBackend_Count'] = df_final[data_cols].sum(axis=1) if data_cols else 0

    # C. Enterprise Multipliers
    df_final['Is_Enterprise'] = df_final['OrgSize'].apply(lambda x: 1 if '10_000' in str(x) or '5_000' in str(x) else 0)
    df_final['Enterprise_Experience_Interaction'] = df_final['Is_Enterprise'] * df_final['YearsCodePro']
    # ------------------------------------------

    output_file = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    df_final.to_csv(output_file, index=False)
    
    print("\n" + "=" * 60)
    print("ENHANCED MATRIX EXPORT COMPLETE!")
    print(f"- Processed Table Location: {output_file}")
    print(f"- Upgraded Feature Matrix Shape: {df_final.shape}")
    print("=" * 60)

if __name__ == "__main__":
    build_master_table_v2()
