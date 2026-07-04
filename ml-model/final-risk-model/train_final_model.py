import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# Load dataset
df = pd.read_csv("mark_sheet_clean_file1 (1).csv")

# Create average academic score
df["Average_Score"] = df[
    ["Math_Score", "English_Score", "Science_Score"]
].mean(axis=1)

# Create transparent rule-derived risk labels
def assign_risk(row):
    avg = row["Average_Score"]
    attendance = row["Attendance"]

    if avg < 60 or attendance < 70:
        return "High Risk"
    elif avg < 75 or attendance < 80:
        return "Medium Risk"
    else:
        return "Low Risk"

df["Risk_Level"] = df.apply(assign_risk, axis=1)

print("\nRisk distribution:")
print(df["Risk_Level"].value_counts())

# Model inputs
features = [
    "Math_Score",
    "English_Score",
    "Science_Score",
    "Attendance"
]

X = df[features]
y = df["Risk_Level"]

# Train/test split with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# Train Random Forest
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Evaluate
print("\nAccuracy:")
print(accuracy_score(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Save model
joblib.dump(model, "final_risk_model.pkl")
joblib.dump(features, "final_feature_columns.pkl")

# Save labelled dataset for auditability
df.to_csv("labelled_student_risk_data.csv", index=False)

print("\nFinal risk model saved successfully")