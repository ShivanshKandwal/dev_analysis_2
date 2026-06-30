import os

# 1. Dynamically locate the project root directory (dev_analysis_2)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

# 2. Centralized Target Metric
REGRESSION_TARGET = "ConvertedCompYearly"

# 3. Longitudinal Intersection Columns (Guarantees multi-year structural alignment)
INTERSECTION_COLUMNS = [
    "Age",
    "BuyNewTool",
    "CodingActivities",
    "CompTotal",
    "ConvertedCompYearly",
    "Country",
    "Currency",
    "DatabaseHaveWorkedWith",
    "DatabaseWantToWorkWith",
    "DevType",
    "EdLevel",
    "Employment",
    "LanguageHaveWorkedWith",
    "LanguageWantToWorkWith",
    "LearnCode",
    "LearnCodeOnline",
    "MainBranch",
    "MiscTechHaveWorkedWith",
    "MiscTechWantToWorkWith",
    "NEWCollabToolsHaveWorkedWith",
    "NEWCollabToolsWantToWorkWith",
    "NEWSOSites",
    "OfficeStackAsyncHaveWorkedWith",
    "OfficeStackAsyncWantToWorkWith",
    "OfficeStackSyncHaveWorkedWith",
    "OfficeStackSyncWantToWorkWith",
    "OpSysPersonal use",
    "OpSysProfessional use",
    "OrgSize",
    "PlatformHaveWorkedWith",
    "PlatformWantToWorkWith",
    "RemoteWork",
    "ResponseId",
    "SOAccount",
    "SOComm",
    "SOPartFreq",
    "SOVisitFreq",
    "SurveyEase",
    "SurveyLength",
    "ToolsTechHaveWorkedWith",
    "ToolsTechWantToWorkWith",
    "WebframeHaveWorkedWith",
    "WebframeWantToWorkWith",
    "WorkExp",
    "YearsCode",
    "YearsCodePro",
]

ORDINAL_MAPPINGS = {
    "JobSat": {
        "Very satisfied": 5,
        "Slightly satisfied": 4,
        "Neither satisfied nor dissatisfied": 3,
        "Slightly dissatisfied": 2,
        "Very dissatisfied": 1,
    }
}

if __name__ == "__main__":
    print(f"✅ Configuration locked! Tracking {len(INTERSECTION_COLUMNS)} intersection features.")
