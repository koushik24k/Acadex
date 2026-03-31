# ML Risk Service

This service adds ML-based student risk prediction using Logistic Regression.

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

## 4) Spring Boot integration

Backend reads these properties from `application.properties`:

- `app.ml.risk-api.enabled=true`
- `app.ml.risk-api.url=http://localhost:5001/predict`
- `app.ml.risk-api.connect-timeout-ms=2000`
- `app.ml.risk-api.read-timeout-ms=3000`

If Flask is unavailable, backend automatically falls back to existing rule-based logic.
