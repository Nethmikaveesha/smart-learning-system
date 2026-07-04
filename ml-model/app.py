from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib

app = Flask(__name__)
CORS(app)

# =========================================================
# MODEL 1: xAPI Student Performance Model
# =========================================================

model = joblib.load("student_risk_model.pkl")
encoders = joblib.load("encoders.pkl")
feature_columns = joblib.load("feature_columns.pkl")


# =========================================================
# MODEL 2: Final Pass/Fail Risk Model
# =========================================================

pass_fail_model = joblib.load(
    "final-risk-model/pass_fail_model.pkl"
)

pass_fail_features = joblib.load(
    "final-risk-model/pass_fail_feature_columns.pkl"
)


# =========================================================
# HOME ROUTE
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Smart Learning System ML API is running",
        "available_endpoints": [
            "/predict-risk",
            "/predict-final-risk"
        ]
    })


# =========================================================
# MODEL 1 ENDPOINT
# xAPI Performance Prediction
# =========================================================

@app.route("/predict-risk", methods=["POST"])
def predict_risk():

    try:
        data = request.json

        if not data:
            return jsonify({
                "success": False,
                "message": "No input data provided"
            }), 400

        input_df = pd.DataFrame([data])

        # Arrange columns in correct training order
        input_df = input_df[feature_columns]

        # Encode categorical columns
        for column, encoder in encoders.items():
            if column in input_df.columns:
                input_df[column] = encoder.transform(
                    input_df[column].astype(str)
                )

        # Prediction
        prediction = model.predict(input_df)[0]

        return jsonify({
            "success": True,
            "performance_class": str(prediction)
        })

    except Exception as error:
        return jsonify({
            "success": False,
            "message": "xAPI prediction failed",
            "error": str(error)
        }), 500


# =========================================================
# MODEL 2 ENDPOINT
# Final Pass/Fail Risk Prediction
# =========================================================

@app.route("/predict-final-risk", methods=["POST"])
def predict_final_risk():

    try:
        data = request.json

        if not data:
            return jsonify({
                "success": False,
                "message": "No input data provided"
            }), 400

        input_df = pd.DataFrame([data])

        # Arrange columns in exact training order
        input_df = input_df[pass_fail_features]

        # Prediction
        prediction = pass_fail_model.predict(input_df)[0]

        # Convert prediction to academic risk
        if int(prediction) == 1:
            risk_level = "Low Risk"
            predicted_result = "Pass"
        else:
            risk_level = "High Risk"
            predicted_result = "Fail"

        return jsonify({
            "success": True,
            "pass_prediction": int(prediction),
            "predicted_result": predicted_result,
            "risk_level": risk_level
        })

    except Exception as error:
        return jsonify({
            "success": False,
            "message": "Final risk prediction failed",
            "error": str(error)
        }), 500


# =========================================================
# RUN FLASK SERVER
# =========================================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )