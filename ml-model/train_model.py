import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

df = pd.read_csv("xAPI-Edu-Data.csv")

print(df.head())
print(df.dtypes)

y = df["Class"]
X = df.drop(["Class"], axis=1)

encoders = {}

for column in X.columns:
    if X[column].dtype == "object" or X[column].dtype == "string":
        encoder = LabelEncoder()
        X[column] = encoder.fit_transform(X[column].astype(str))
        encoders[column] = encoder

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)

print("Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

joblib.dump(model, "student_risk_model.pkl")
joblib.dump(encoders, "encoders.pkl")
joblib.dump(list(X.columns), "feature_columns.pkl")

print("Model saved successfully")