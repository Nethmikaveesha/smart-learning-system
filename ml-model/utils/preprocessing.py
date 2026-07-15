import pandas as pd
from sklearn.preprocessing import LabelEncoder

from .paths import MARK_SHEET_DATASET, PROCESSED_DATA_DIR


def load_xapi_dataset(path):
    return pd.read_csv(path)


def encode_categorical_features(X):
    encoders = {}
    encoded_X = X.copy()

    for column in encoded_X.columns:
        if encoded_X[column].dtype == "object" or encoded_X[column].dtype == "string":
            encoder = LabelEncoder()
            encoded_X[column] = encoder.fit_transform(
                encoded_X[column].astype(str)
            )
            encoders[column] = encoder

    return encoded_X, encoders


def assign_risk_level(row):
    avg = row["Average_Score"]
    attendance = row["Attendance"]

    if avg < 60 or attendance < 70:
        return "High Risk"
    if avg < 75 or attendance < 80:
        return "Medium Risk"
    return "Low Risk"


def build_mark_sheet_dataset(path=MARK_SHEET_DATASET):
    df = pd.read_csv(path)

    df["Average_Score"] = df[
        ["Math_Score", "English_Score", "Science_Score"]
    ].mean(axis=1)
    df["Risk_Level"] = df.apply(assign_risk_level, axis=1)

    output_path = PROCESSED_DATA_DIR / "labelled_student_risk_data.csv"
    df.to_csv(output_path, index=False)

    return df, output_path


def load_pass_fail_dataset(path):
    return pd.read_csv(path)
