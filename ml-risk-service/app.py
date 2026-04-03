from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request


MODEL_PATH = Path(__file__).parent / "risk_model.pkl"
SLOT_MODEL_PATH = Path(__file__).parent / "slot_model.pkl"

app = Flask(__name__)
model_bundle = None
slot_bundle = None
ALLOWED_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
SLOT_PERIODS = {
    "08:15": "09:05",
    "09:05": "09:55",
    "10:10": "11:00",
    "11:00": "11:50",
    "11:50": "12:45",
    "12:45": "13:30",
    "13:30": "14:20",
    "14:20": "15:10",
    "15:10": "16:00",
}
ALLOWED_START_TIMES = list(SLOT_PERIODS.keys())


def load_model():
    global model_bundle, slot_bundle
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Run train_risk_model.py first."
        )
    model_bundle = joblib.load(MODEL_PATH)
    if SLOT_MODEL_PATH.exists():
        slot_bundle = joblib.load(SLOT_MODEL_PATH)


def to_float(value, default=0.0):
    try:
        if value is None:
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "model_loaded": model_bundle is not None,
            "slot_model_loaded": slot_bundle is not None,
        }
    )


def normalize_slot_features(row):
    return {
        "subject": str(row.get("subject", "General") or "General"),
        "faculty": str(row.get("faculty", "F1") or "F1"),
        "semester": str(row.get("semester", "1") or "1"),
        "difficulty": str(row.get("difficulty", "Medium") or "Medium"),
        "sessionType": str(row.get("sessionType", "Theory") or "Theory"),
    }


def fallback_slot(features):
    difficulty = features["difficulty"].lower()
    session_type = features["sessionType"].lower()
    semester = str(features["semester"])

    if "high" in difficulty:
        preferred_times = ["08:15", "09:05", "10:10", "11:00"]
    elif "lab" in session_type or "practical" in session_type:
        preferred_times = ["12:45", "13:30", "14:20", "15:10"]
    else:
        preferred_times = ["09:05", "10:10", "11:00", "11:50", "12:45"]

    idx = abs(hash(features["subject"] + features["faculty"] + semester))
    day = ALLOWED_DAYS[idx % len(ALLOWED_DAYS)]
    start = preferred_times[idx % len(preferred_times)]
    end = SLOT_PERIODS[start]
    return {"day": day, "startTime": start, "endTime": end}


def model_slot(features):
    if slot_bundle is None:
        return fallback_slot(features), "heuristic"

    frame = pd.DataFrame([features])
    day_model = slot_bundle.get("day_model")
    time_model = slot_bundle.get("time_model")

    if day_model is not None and time_model is not None:
        day = str(day_model.predict(frame)[0])
        start = str(time_model.predict(frame)[0])
    else:
        model = slot_bundle.get("model")
        if model is None:
            return fallback_slot(features), "heuristic"

        pred = str(model.predict(frame)[0])
        if "|" in pred:
            day, start = pred.split("|", 1)
        else:
            parts = pred.split()
            if len(parts) >= 2:
                day, start = parts[0], parts[1]
            else:
                f = fallback_slot(features)
                return f, "heuristic"

    day = day.strip().upper()
    start = start.strip()
    if len(start) == 4:
        start = "0" + start

    if day not in ALLOWED_DAYS:
        f = fallback_slot(features)
        return f, "heuristic"
    if start not in ALLOWED_START_TIMES:
        f = fallback_slot(features)
        return f, "heuristic"

    end = SLOT_PERIODS.get(start)
    if end is None:
        f = fallback_slot(features)
        return f, "heuristic"

    return {"day": day, "startTime": start, "endTime": end}, "ml"


@app.post("/predict-slot")
def predict_slot():
    body = request.get_json(silent=True) or {}
    features = normalize_slot_features(body)
    slot, source = model_slot(features)
    return jsonify({"slot": f"{slot['day']} {slot['startTime']}", **slot, "source": source})


@app.post("/predict-slots")
def predict_slots():
    body = request.get_json(silent=True) or {}
    items = body.get("items") if isinstance(body, dict) else None
    if not isinstance(items, list):
        return jsonify({"error": "items must be an array"}), 400

    predictions = []
    source_used = "ml" if slot_bundle is not None else "heuristic"
    for item in items:
        features = normalize_slot_features(item if isinstance(item, dict) else {})
        slot, source = model_slot(features)
        if source != "ml":
            source_used = "hybrid"
        predictions.append(
            {
                "day": slot["day"],
                "startTime": slot["startTime"],
                "endTime": slot["endTime"],
                "slot": f"{slot['day']} {slot['startTime']}",
                "source": source,
            }
        )

    return jsonify({"predictions": predictions, "source": source_used})


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
