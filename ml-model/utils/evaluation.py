import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


def compute_metrics(y_true, y_pred):
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision": float(
            precision_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "recall": float(
            recall_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "f1_score": float(
            f1_score(y_true, y_pred, average="weighted", zero_division=0)
        ),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classification_report": classification_report(
            y_true,
            y_pred,
            output_dict=True,
            zero_division=0,
        ),
    }


def evaluate_classifier(model, X_test, y_test, report_name, reports_dir):
    y_pred = model.predict(X_test)
    metrics = compute_metrics(y_test, y_pred)

    report_path = Path(reports_dir) / f"{report_name}.json"
    report_path.write_text(json.dumps(metrics, indent=2))

    return metrics, y_pred


def plot_confusion_matrix(y_test, y_pred, title, output_path, labels=None):
    matrix = confusion_matrix(y_test, y_pred, labels=labels)

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(matrix, cmap="Blues")
    ax.set_title(title)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")

    if labels:
        ax.set_xticks(range(len(labels)))
        ax.set_yticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=45, ha="right")
        ax.set_yticklabels(labels)

    for row in range(matrix.shape[0]):
        for col in range(matrix.shape[1]):
            ax.text(col, row, matrix[row, col], ha="center", va="center")

    fig.colorbar(im, ax=ax)
    fig.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)


def summarize_dataset(df, name):
    return {
        "name": name,
        "rows": int(len(df)),
        "columns": list(df.columns),
        "missing_values": df.isna().sum().to_dict(),
    }


def save_json_report(data, output_path):
    Path(output_path).write_text(json.dumps(data, indent=2, default=str))


def metrics_table_rows(comparison_results):
    rows = []
    for model_name, result in comparison_results.items():
        metrics = result.get("test_metrics", result)
        rows.append({
            "model": model_name,
            "accuracy": metrics["accuracy"],
            "balanced_accuracy": metrics["balanced_accuracy"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1_score": metrics["f1_score"],
            "cv_score": result.get("cv_score", metrics.get("cv_score")),
        })

    return sorted(
        rows,
        key=lambda row: (row["balanced_accuracy"], row["f1_score"], row["cv_score"] or 0),
        reverse=True,
    )
