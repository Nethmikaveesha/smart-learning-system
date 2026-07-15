from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import pandas as pd

from utils.paths import (
    CORE_REQUIRED_MODELS,
    MODELS_DIR,
    MULTI_CLASS_FEATURE_COLUMNS,
    MULTI_CLASS_METADATA,
    MULTI_CLASS_RISK_MODEL,
    OPTIONAL_MODELS,
    PASS_FAIL_FEATURE_COLUMNS,
    PASS_FAIL_METADATA,
    PASS_FAIL_MODEL,
    RECOMMENDED_MODELS,
    XAPI_ENCODERS,
    XAPI_FEATURE_COLUMNS,
    XAPI_METADATA,
    XAPI_MODEL,
)

app = Flask(__name__)
CORS(app)

pass_fail_model = None
pass_fail_features = None
multi_class_model = None
multi_class_features = None
xapi_model = None
xapi_encoders = None
xapi_features = None


def core_models_ready():
    return all(path.exists() for path in CORE_REQUIRED_MODELS)


def recommended_models_ready():
    return all(path.exists() for path in RECOMMENDED_MODELS)


def optional_models_ready():
    return all(path.exists() for path in OPTIONAL_MODELS)


def load_core_models():
    global pass_fail_model, pass_fail_features

    if not core_models_ready():
        missing = [path.name for path in CORE_REQUIRED_MODELS if not path.exists()]
        raise FileNotFoundError(
            "Core model files not found. Run notebooks 03A, 04A, and 05, "
            "or execute: python3 train_all.py. "
            f"Missing: {', '.join(missing)}"
        )

    pass_fail_model = joblib.load(PASS_FAIL_MODEL)
    pass_fail_features = joblib.load(PASS_FAIL_FEATURE_COLUMNS)


def load_recommended_models():
    global multi_class_model, multi_class_features

    if not recommended_models_ready():
        missing = [path.name for path in RECOMMENDED_MODELS if not path.exists()]
        raise FileNotFoundError(
            "Recommended model files not found. Run notebooks 03B, 04B, and 05. "
            f"Missing: {', '.join(missing)}"
        )

    multi_class_model = joblib.load(MULTI_CLASS_RISK_MODEL)
    multi_class_features = joblib.load(MULTI_CLASS_FEATURE_COLUMNS)


def load_optional_models():
    global xapi_model, xapi_encoders, xapi_features

    if not optional_models_ready():
        missing = [path.name for path in OPTIONAL_MODELS if not path.exists()]
        raise FileNotFoundError(
            "Optional xAPI benchmark model not found. Run notebooks 03C, 04C, and 05. "
            f"Missing: {', '.join(missing)}"
        )

    xapi_model = joblib.load(XAPI_MODEL)
    xapi_encoders = joblib.load(XAPI_ENCODERS)
    xapi_features = joblib.load(XAPI_FEATURE_COLUMNS)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Smart Learning System ML API is running",
        "core_status": "ready" if core_models_ready() else "not_trained",
        "recommended_status": "ready" if recommended_models_ready() else "not_trained",
        "optional_status": "ready" if optional_models_ready() else "not_trained",
        "models_directory": str(MODELS_DIR),
        "models": {
            "mandatory": "Pass/Fail Risk Model",
            "recommended": "Multi-Class Risk Model",
            "optional": "xAPI Performance Benchmark Model",
        },
        "available_endpoints": [
            "/predict-final-risk",
            "/predict-multi-class-risk",
            "/predict-risk",
        ],
        "workflow": "Run notebooks 01-05 or: python3 train_all.py",
    })


@app.route("/predict-final-risk", methods=["POST"])
def predict_final_risk():
    try:
        load_core_models()
        data = request.json

        if not data:
            return jsonify({
                "success": False,
                "message": "No input data provided",
            }), 400

        input_df = pd.DataFrame([data])
        input_df = input_df[pass_fail_features]

        prediction = pass_fail_model.predict(input_df)[0]

        if int(prediction) == 1:
            risk_level = "Low Risk"
            predicted_result = "Pass"
        else:
            risk_level = "High Risk"
            predicted_result = "Fail"

        return jsonify({
            "success": True,
            "model": "Pass/Fail Risk Model",
            "pass_prediction": int(prediction),
            "predicted_result": predicted_result,
            "risk_level": risk_level,
        })

    except FileNotFoundError as error:
        return jsonify({"success": False, "message": str(error)}), 503
    except Exception as error:
        return jsonify({
            "success": False,
            "message": "Pass/Fail risk prediction failed",
            "error": str(error),
        }), 500


@app.route("/predict-multi-class-risk", methods=["POST"])
def predict_multi_class_risk():
    try:
        load_recommended_models()
        data = request.json

        if not data:
            return jsonify({
                "success": False,
                "message": "No input data provided",
            }), 400

        input_df = pd.DataFrame([data])
        input_df = input_df[multi_class_features]

        prediction = multi_class_model.predict(input_df)[0]

        return jsonify({
            "success": True,
            "model": "Multi-Class Risk Model",
            "risk_level": str(prediction),
        })

    except FileNotFoundError as error:
        return jsonify({"success": False, "message": str(error)}), 503
    except Exception as error:
        return jsonify({
            "success": False,
            "message": "Multi-class risk prediction failed",
            "error": str(error),
        }), 500


@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    try:
        load_optional_models()
        data = request.json

        if not data:
            return jsonify({
                "success": False,
                "message": "No input data provided",
            }), 400

        input_df = pd.DataFrame([data])
        input_df = input_df[xapi_features]

        for column, encoder in xapi_encoders.items():
            if column in input_df.columns:
                input_df[column] = encoder.transform(
                    input_df[column].astype(str)
                )

        prediction = xapi_model.predict(input_df)[0]

        return jsonify({
            "success": True,
            "model": "xAPI Performance Benchmark Model",
            "performance_class": str(prediction),
            "risk_status": str(prediction),
        })

    except FileNotFoundError as error:
        return jsonify({"success": False, "message": str(error)}), 503
    except Exception as error:
        return jsonify({
            "success": False,
            "message": "xAPI benchmark prediction failed",
            "error": str(error),
        }), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
