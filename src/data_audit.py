import os
import pandas as pd


def run_initial_data_audit(file_path, year):
    print("=" * 60)
    print(f"STARTING INITIAL DATA AUDIT FOR {year}: {file_path}")
    print("=" * 60)

    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return None, None

    # 1. Load Data with robust encoding to handle specialized characters
    try:
        df = pd.read_csv(file_path, low_memory=False, encoding="utf-8")
    except UnicodeDecodeError:
        print("Warning: UTF-8 decoding failed. Retrying with Latin-1 encoding...")
        df = pd.read_csv(file_path, low_memory=False, encoding="latin-1")

    # 2. Shape Metrics
    row_count, col_count = df.shape
    print(f"\n[DIMENSIONS - {year}]\n- Total Rows: {row_count:,}\n- Total Columns: {col_count}")

    # 3. Data Type and Null Percentage Evaluation
    print(f"\n[COLUMN ANALYSIS (Top Missing/Null Data) - {year}]")
    null_counts = df.isnull().sum()
    null_percentages = (null_counts / row_count) * 100

    audit_df = pd.DataFrame(
        {
            "DataType": df.dtypes,
            "NullCount": null_counts,
            "NullPercentage": null_percentages,
        }
    )

    # Display columns with the highest missing values to identify data density gaps
    print(
        audit_df.sort_values(by="NullPercentage", ascending=False)
        .head(10)
        .to_string()
    )

    # 4. Target Variables Validation Check
    targets = ["ConvertedCompYearly", "JobSat", "Employment", "DevType"]
    print(f"\n[TARGET VARIABLES STATUS - {year}]")
    for target in targets:
        if target in df.columns:
            missing_pct = audit_df.loc[target, "NullPercentage"]
            dtype = audit_df.loc[target, "DataType"]
            print(
                f" '{target}' - Type: {dtype} | Missing: {missing_pct:.2f}%"
            )
        else:
            print(f" '{target}' NOT FOUND in this dataset.")

    print("\n" + "=" * 60)
    print(f"DATA AUDIT COMPLETED FOR {year}")
    print("=" * 60)

    return audit_df


if __name__ == "__main__":
    RAW_PATH_2022 = r"C:\Software\dev_analysis_2\data\raw\2022\survey_results_public.csv"
    RAW_PATH_2023 = r"C:\Software\dev_analysis_2\data\raw\2023\survey_results_public.csv"
    RAW_PATH_2024 = r"C:\Software\dev_analysis_2\data\raw\2024\survey_results_public.csv"

    run_initial_data_audit(RAW_PATH_2022, 2022)
    run_initial_data_audit(RAW_PATH_2023, 2023)
    run_initial_data_audit(RAW_PATH_2024, 2024)
