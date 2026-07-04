import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

df = pd.read_csv("pass_fail_dataset.csv")

features = [
    "attendance_pct",
    "homework_pct",
    "midterm_score",
    "study_hours_per_week"
]

X = df[features]
y = df["pass"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)

model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

joblib.dump(model, "pass_fail_model.pkl")
joblib.dump(features, "pass_fail_feature_columns.pkl")

print("\nPass/Fail model saved successfully")
print("\nTarget Distribution:")
print(df["pass"].value_counts())

print("\nFeature Importance:")
for feature, importance in zip(features, model.feature_importances_):
    print(f"{feature}: {importance:.4f}")

print("\nCorrelation with pass:")
print(df[features + ["pass"]].corr()["pass"].sort_values(ascending=False))