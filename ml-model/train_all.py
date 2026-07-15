
from __future__ import annotations

import json
import os
from pathlib import Path

import joblib
os.environ.setdefault("MPLCONFIGDIR", "/private/tmp/mplconfig")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    f1_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

BASE = Path(__file__).resolve().parent
RAW = BASE / "datasets" / "raw"
PROCESSED = BASE / "datasets" / "processed"
MODELS = BASE / "models"
REPORTS = BASE / "outputs" / "reports"
FIGURES = BASE / "outputs" / "figures"
for folder in (RAW, PROCESSED, MODELS, REPORTS, FIGURES):
    folder.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42
rng = np.random.default_rng(RANDOM_STATE)


def clipped_normal(mean: float, sd: float, n: int, lo: float, hi: float) -> np.ndarray:
    return np.clip(rng.normal(mean, sd, n), lo, hi)


def generate_pass_fail(n: int = 1500) -> pd.DataFrame:
    """Generate a disclosed synthetic dataset with overlapping pass/fail classes."""
    ability = rng.normal(0, 1, n)
    motivation = rng.normal(0, 1, n)
    external_pressure = rng.normal(0, 1, n)

    attendance = np.clip(76 + 10 * motivation + 4 * ability + rng.normal(0, 8, n), 35, 100)
    homework = np.clip(69 + 12 * motivation + 6 * ability + rng.normal(0, 11, n), 20, 100)
    midterm = np.clip(61 + 13 * ability + 5 * motivation + rng.normal(0, 12, n), 10, 100)
    study_hours = np.clip(7 + 2.2 * motivation + 1.2 * ability + rng.normal(0, 2.8, n), 0, 20)

    latent = (
        0.035 * (attendance - 70)
        + 0.030 * (homework - 65)
        + 0.045 * (midterm - 55)
        + 0.11 * (study_hours - 6)
        - 0.45 * external_pressure
        + rng.normal(0, 0.9, n)
    )
    pass_probability = 1 / (1 + np.exp(-latent))
    target = rng.binomial(1, pass_probability)

    return pd.DataFrame({
        "student_id": np.arange(1, n + 1),
        "attendance_pct": np.round(attendance, 1),
        "homework_pct": np.round(homework, 1),
        "midterm_score": np.round(midterm, 1),
        "study_hours_per_week": np.round(study_hours, 1),
        "pass": target,
    })


def generate_commerce_risk(n: int = 1800) -> pd.DataFrame:
    """Generate a disclosed synthetic three-class risk dataset with class overlap."""
    ability = rng.normal(0, 1, n)
    engagement = rng.normal(0, 1, n)
    wellbeing = rng.normal(0, 1, n)

    accounting = np.clip(65 + 14 * ability + 5 * engagement + rng.normal(0, 10, n), 15, 100)
    business = np.clip(67 + 11 * ability + 7 * engagement + rng.normal(0, 11, n), 15, 100)
    economics = np.clip(63 + 13 * ability + 4 * engagement + rng.normal(0, 12, n), 15, 100)
    attendance = np.clip(78 + 9 * engagement + 3 * wellbeing + rng.normal(0, 8, n), 40, 100)
    average = (accounting + business + economics) / 3

    # Latent risk is intentionally noisy so labels are not a deterministic copy of inputs.
    risk_score = (
        0.075 * (70 - average)
        + 0.060 * (78 - attendance)
        - 0.25 * wellbeing
        + rng.normal(0, 0.8, n)
    )
    low_cut, high_cut = np.quantile(risk_score, [0.37, 0.72])
    labels = np.where(
        risk_score <= low_cut,
        "Low Risk",
        np.where(risk_score <= high_cut, "Medium Risk", "High Risk"),
    )

    return pd.DataFrame({
        "student_id": [f"COM{i:04d}" for i in range(1, n + 1)],
        "Accounting_Score": np.round(accounting, 1),
        "Business_Studies_Score": np.round(business, 1),
        "Economics_Score": np.round(economics, 1),
        "Attendance_Percentage": np.round(attendance, 1),
        "Subject_Average": np.round(average, 2),
        "risk_level": labels,
    })


def candidate_models() -> dict[str, object]:
    return {
        "Logistic Regression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE),
        "Decision Tree": DecisionTreeClassifier(max_depth=7, min_samples_leaf=8, class_weight="balanced", random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(
            n_estimators=180,
            max_depth=12,
            min_samples_leaf=3,
            max_features="sqrt",
            class_weight="balanced_subsample",
            n_jobs=1,
            random_state=RANDOM_STATE,
        ),
    }


def train_task(df: pd.DataFrame, features: list[str], target: str, task_slug: str):
    X = df[features].copy()
    y = df[target].copy()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )

    preprocessing = ColumnTransformer([
        ("numeric", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), features)
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    rows, fitted = [], {}
    for name, estimator in candidate_models().items():
        pipeline = Pipeline([("preprocess", preprocessing), ("model", estimator)])
        scores = cross_validate(
            pipeline,
            X_train,
            y_train,
            cv=cv,
            scoring={"accuracy": "accuracy", "balanced_accuracy": "balanced_accuracy", "macro_f1": "f1_macro"},
            n_jobs=1,
        )
        pipeline.fit(X_train, y_train)
        pred = pipeline.predict(X_test)
        row = {
            "Model": name,
            "Accuracy": accuracy_score(y_test, pred),
            "Balanced Accuracy": balanced_accuracy_score(y_test, pred),
            "Macro F1": f1_score(y_test, pred, average="macro"),
            "CV Accuracy": scores["test_accuracy"].mean(),
            "CV Balanced Accuracy": scores["test_balanced_accuracy"].mean(),
            "CV Macro F1": scores["test_macro_f1"].mean(),
        }
        rows.append(row)
        fitted[name] = (pipeline, pred)

    comparison = pd.DataFrame(rows).sort_values(
        ["Balanced Accuracy", "Macro F1"], ascending=False
    ).reset_index(drop=True)
    best_name = comparison.loc[0, "Model"]
    best_model, best_pred = fitted[best_name]

    comparison.to_csv(REPORTS / f"{task_slug}_model_comparison.csv", index=False)
    report = classification_report(y_test, best_pred, output_dict=True, zero_division=0)
    with open(REPORTS / f"{task_slug}_classification_report.json", "w") as f:
        json.dump(report, f, indent=2)

    labels = list(best_model.classes_)
    cm = confusion_matrix(y_test, best_pred, labels=labels)
    display = ConfusionMatrixDisplay(cm, display_labels=labels)
    display.plot(values_format="d")
    plt.title(f"{task_slug.replace('_', ' ').title()} – {best_name}")
    plt.tight_layout()
    plt.savefig(FIGURES / f"{task_slug}_final_confusion_matrix.png", dpi=180)
    plt.close()

    return best_model, best_name, comparison.iloc[0].to_dict(), labels


def main() -> None:
    pass_df = generate_pass_fail()
    commerce_df = generate_commerce_risk()

    pass_df.to_csv(RAW / "pass_fail_dataset.csv", index=False)
    pass_df.to_csv(PROCESSED / "pass_fail_processed.csv", index=False)
    commerce_df.to_csv(PROCESSED / "commerce_risk_dataset.csv", index=False)
    commerce_df.to_csv(PROCESSED / "multiclass_risk_processed.csv", index=False)

    pass_features = ["attendance_pct", "homework_pct", "midterm_score", "study_hours_per_week"]
    commerce_features = ["Accounting_Score", "Business_Studies_Score", "Economics_Score", "Attendance_Percentage"]

    pass_model, pass_name, pass_metrics, pass_labels = train_task(
        pass_df, pass_features, "pass", "pass_fail"
    )
    commerce_model, commerce_name, commerce_metrics, commerce_labels = train_task(
        commerce_df, commerce_features, "risk_level", "commerce_risk"
    )

    joblib.dump(pass_model, MODELS / "pass_fail_model.pkl")
    joblib.dump(pass_features, MODELS / "pass_fail_feature_columns.pkl")
    joblib.dump(commerce_model, MODELS / "multi_class_risk_model.pkl")
    joblib.dump(commerce_features, MODELS / "multi_class_feature_columns.pkl")

    pass_meta = {
        "task": "Pass/Fail prediction",
        "selected_model": pass_name,
        "features": pass_features,
        "labels": [int(x) for x in pass_labels],
        "rows": len(pass_df),
        "data_source": "Reproducible synthetic educational dataset with overlapping probabilistic labels",
        "metrics": pass_metrics,
    }
    commerce_meta = {
        "task": "Three-class Commerce student risk screening",
        "selected_model": commerce_name,
        "features": commerce_features,
        "labels": [str(x) for x in commerce_labels],
        "rows": len(commerce_df),
        "data_source": "Reproducible synthetic educational dataset with overlapping probabilistic labels",
        "metrics": commerce_metrics,
    }
    for filename, metadata in [("pass_fail_metadata.json", pass_meta), ("multi_class_metadata.json", commerce_meta)]:
        with open(MODELS / filename, "w") as f:
            json.dump(metadata, f, indent=2)

    summary = {
        "random_state": RANDOM_STATE,
        "important_note": "Synthetic datasets are explicitly disclosed. Labels include random variation and are not deterministic copies of model inputs.",
        "pass_fail": pass_meta,
        "commerce_risk": commerce_meta,
        "class_distributions": {
            "pass_fail": pass_df["pass"].value_counts().sort_index().to_dict(),
            "commerce_risk": commerce_df["risk_level"].value_counts().to_dict(),
        },
    }
    with open(REPORTS / "retrained_model_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
