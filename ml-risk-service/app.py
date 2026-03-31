from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request


MODEL_PATH = Path(__file__).parent / "risk_model.pkl"

app = Flask(__name__)
model_bundle = None


def load_model():
    global model_bundle
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Run train_risk_model.py first."
        )
    model_bundle = joblib.load(MODEL_PATH)


def to_float(value, default=0.0):
    try:
        if value is None:
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model_loaded": model_bundle is not None})


@app.post("/predict")
def predict():
    if model_bundle is None:
        return jsonify({"error": "Model not loaded"}), 503

    body = request.get_json(silent=True) or {}

    features = {
        "attendance": to_float(body.get("attendance"), 80.0),
        "exam": to_float(body.get("exam"), 50.0),
        "assignment": to_float(body.get("assignment"), 50.0),
        "failures": to_float(body.get("failures"), 0.0),
        "study_time": to_float(body.get("study_time"), 2.0),
    }

    cols = model_bundle["feature_columns"]
    X = pd.DataFrame([[features[c] for c in cols]], columns=cols)

    model = model_bundle["model"]
    risk = str(model.predict(X)[0]).upper()

    confidence = None
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X)[0]
        confidence = float(max(probs))

    return jsonify(
        {
            "risk": risk,
            "confidence": round(confidence, 4) if confidence is not None else None,
            "source": "ml",
        }
    )


if __name__ == "__main__":
    load_model()
    app.run(host="0.0.0.0", port=5001, debug=False)
