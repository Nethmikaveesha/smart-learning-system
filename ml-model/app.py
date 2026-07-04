from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib

app = Flask(__name__)
CORS(app)

model = joblib.load("student_risk_model.pkl")
encoders = joblib.load("encoders.pkl")
feature_columns = joblib.load("feature_columns.pkl")

@app.route("/predict-risk", methods=["POST"])
def predict_risk():
    data = request.json

    input_df = pd.DataFrame([data])
    input_df = input_df[feature_columns]

    for column, encoder in encoders.items():
        if column in input_df.columns:
            input_df[column] = encoder.transform(input_df[column].astype(str))

    prediction = model.predict(input_df)[0]

    return jsonify({
        "risk_status": prediction
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)