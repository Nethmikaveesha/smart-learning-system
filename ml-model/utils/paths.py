from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DATA_DIR = BASE_DIR / "datasets" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "datasets" / "processed"
MODELS_DIR = BASE_DIR / "models"
FIGURES_DIR = BASE_DIR / "outputs" / "figures"
REPORTS_DIR = BASE_DIR / "outputs" / "reports"

XAPI_DATASET = RAW_DATA_DIR / "xAPI-Edu-Data.csv"
MARK_SHEET_DATASET = RAW_DATA_DIR / "mark_sheet_clean_file1 (1).csv"
PASS_FAIL_DATASET = RAW_DATA_DIR / "pass_fail_dataset.csv"
LABELLED_RISK_DATASET = PROCESSED_DATA_DIR / "labelled_student_risk_data.csv"

# Core model 1 — Mandatory
PASS_FAIL_MODEL = MODELS_DIR / "pass_fail_model.pkl"
PASS_FAIL_FEATURE_COLUMNS = MODELS_DIR / "pass_fail_feature_columns.pkl"
PASS_FAIL_METADATA = MODELS_DIR / "pass_fail_metadata.json"

# Core model 2 — Recommended
MULTI_CLASS_RISK_MODEL = MODELS_DIR / "multi_class_risk_model.pkl"
MULTI_CLASS_FEATURE_COLUMNS = MODELS_DIR / "multi_class_feature_columns.pkl"
MULTI_CLASS_METADATA = MODELS_DIR / "multi_class_metadata.json"

# Optional benchmark model
XAPI_MODEL = MODELS_DIR / "xapi_performance_model.pkl"
XAPI_ENCODERS = MODELS_DIR / "xapi_encoders.pkl"
XAPI_FEATURE_COLUMNS = MODELS_DIR / "xapi_feature_columns.pkl"
XAPI_METADATA = MODELS_DIR / "xapi_metadata.json"

# Backward-compatible aliases
STUDENT_RISK_MODEL = XAPI_MODEL
ENCODERS = XAPI_ENCODERS
FEATURE_COLUMNS = XAPI_FEATURE_COLUMNS
FINAL_RISK_MODEL = MULTI_CLASS_RISK_MODEL
FINAL_FEATURE_COLUMNS = MULTI_CLASS_FEATURE_COLUMNS

CORE_REQUIRED_MODELS = [
    PASS_FAIL_MODEL,
    PASS_FAIL_FEATURE_COLUMNS,
    PASS_FAIL_METADATA,
]

RECOMMENDED_MODELS = [
    MULTI_CLASS_RISK_MODEL,
    MULTI_CLASS_FEATURE_COLUMNS,
    MULTI_CLASS_METADATA,
]

OPTIONAL_MODELS = [
    XAPI_MODEL,
    XAPI_ENCODERS,
    XAPI_FEATURE_COLUMNS,
    XAPI_METADATA,
]
