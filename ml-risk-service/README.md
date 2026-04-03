# ML Services

This service now provides two ML capabilities:

1. Student risk prediction (Logistic Regression)
2. Timetable slot prediction (Random Forest + backend conflict resolver)

## 1) Install dependencies

```bash
pip install -r requirements.txt
```

## 2) Train model

```bash
python train_risk_model.py --csv path/to/student_data.csv
```

Output model file:
- `risk_model.pkl`

Train timetable slot model:

```bash
python train_slot_model.py
```

Output model file:
- `slot_model.pkl`

If `--csv` is not provided, the script tries:
1. `ml-risk-service/student_data.csv`
2. `/kaggle/input/student-performance-data/student_data.csv`

## 3) Run Flask API

```bash
python app.py
```

API endpoints:
- `GET /health`
- `POST /predict`
- `POST /predict-slot`
- `POST /predict-slots`

Sample request:

```json
{
  "attendance": 82,
  "exam": 61,
  "assignment": 58,
  "failures": 1,
  "study_time": 2
}
```

Sample response:

```json
{
  "risk": "MEDIUM",
  "confidence": 0.8421,
  "source": "ml"
}
```

Sample timetable batch request:

```json
{
  "items": [
    {
      "subject": "Operating Systems",
      "faculty": "F3",
      "semester": "4",
      "difficulty": "High",
      "sessionType": "Theory"
    },
    {
      "subject": "DBMS Lab",
      "faculty": "F2",
      "semester": "4",
      "difficulty": "Medium",
      "sessionType": "Lab"
    }
  ]
}
```

Sample timetable response:

```json
{
  "predictions": [
    {
      "day": "WEDNESDAY",
      "startTime": "09:00",
      "endTime": "10:00",
      "slot": "WEDNESDAY 09:00",
      "source": "ml"
    }
  ],
  "source": "ml"
}
```

## 4) Spring Boot integration

Backend reads these properties from `application.properties`:

- `app.ml.risk-api.enabled=true`
- `app.ml.risk-api.url=http://localhost:5001/predict`
- `app.ml.risk-api.connect-timeout-ms=2000`
- `app.ml.risk-api.read-timeout-ms=3000`

If Flask is unavailable, backend automatically falls back to existing rule-based logic.

Timetable slot predictor properties in Spring Boot:

- `app.ml.timetable-api.enabled=true`
- `app.ml.timetable-api.url=http://localhost:5001/predict-slots`

The backend applies clash resolution after ML prediction, so final timetable output remains valid.
