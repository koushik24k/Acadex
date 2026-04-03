from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


DATASET_PATH = Path(__file__).parent / "timetable_slot_data.csv"
MODEL_PATH = Path(__file__).parent / "slot_model.pkl"
ALLOWED_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
ALLOWED_START_TIMES = ["08:15", "09:05", "10:10", "11:00", "11:50", "12:45", "13:30", "14:20", "15:10"]


def ensure_dataset():
    if DATASET_PATH.exists():
        return

    rows = [
        ["Math", "F1", "3", "High", "Theory", "MONDAY", "09:00"],
        ["Data Structures", "F2", "3", "Medium", "Theory", "TUESDAY", "11:00"],
        ["Operating Systems", "F3", "4", "High", "Theory", "WEDNESDAY", "09:00"],
        ["DBMS Lab", "F2", "4", "Medium", "Lab", "THURSDAY", "14:00"],
        ["Networks", "F4", "5", "Medium", "Theory", "FRIDAY", "11:00"],
        ["AI Lab", "F5", "5", "High", "Lab", "MONDAY", "14:00"],
        ["Compiler Design", "F6", "6", "High", "Theory", "TUESDAY", "09:00"],
        ["Software Engineering", "F1", "6", "Low", "Theory", "THURSDAY", "11:00"],
    ]
    df = pd.DataFrame(rows, columns=["subject", "faculty", "semester", "difficulty", "sessionType", "day", "startTime"])
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATASET_PATH, index=False)


def choose_slot(row, seed):
    difficulty = str(row.get("difficulty", "Medium") or "Medium").lower()
    session_type = str(row.get("sessionType", "Theory") or "Theory").lower()

    if "lab" in session_type or "practical" in session_type:
        preferred_times = ["12:45", "13:30", "14:20", "15:10"]
    elif "high" in difficulty:
        preferred_times = ["08:15", "09:05", "10:10", "11:00"]
    elif "low" in difficulty:
        preferred_times = ["11:00", "11:50", "12:45", "13:30"]
    else:
        preferred_times = ["09:05", "10:10", "11:00", "11:50", "12:45"]

    time = preferred_times[seed % len(preferred_times)]
    day = ALLOWED_DAYS[seed % len(ALLOWED_DAYS)]
    return day, time


def augment_dataset(df, min_samples=250):
    if len(df) >= min_samples:
        return df

    base = df[["subject", "faculty", "semester", "difficulty", "sessionType"]].astype(str)
    augmented_rows = []
    repeats = max(1, (min_samples - len(df)) // max(1, len(base)) + 1)

    for rep in range(repeats):
        for _, row in base.iterrows():
            key = "|".join([
                row["subject"],
                row["faculty"],
                row["semester"],
                row["difficulty"],
                row["sessionType"],
                str(rep),
            ])
            seed = abs(hash(key))
            day, start = choose_slot(row, seed)
            augmented_rows.append({
                "subject": row["subject"],
                "faculty": row["faculty"],
                "semester": row["semester"],
                "difficulty": row["difficulty"],
                "sessionType": row["sessionType"],
                "day": day,
                "startTime": start,
            })
            if len(df) + len(augmented_rows) >= min_samples:
                break
        if len(df) + len(augmented_rows) >= min_samples:
            break

    if not augmented_rows:
        return df

    return pd.concat([df, pd.DataFrame(augmented_rows)], ignore_index=True)


def normalize_start_time(raw):
    value = str(raw or "").strip()
    if value in ALLOWED_START_TIMES:
        return value
    if value == "14:00":
        return "14:20"
    if value == "09:00":
        return "09:05"
    if value == "10:00":
        return "10:10"
    if value == "12:00":
        return "11:50"
    return ALLOWED_START_TIMES[abs(hash(value)) % len(ALLOWED_START_TIMES)]


def main():
    ensure_dataset()
    df = pd.read_csv(DATASET_PATH)

    required = ["subject", "faculty", "semester", "difficulty", "sessionType", "day", "startTime"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    df["day"] = df["day"].astype(str).str.upper()
    df["startTime"] = df["startTime"].apply(normalize_start_time)
    df = augment_dataset(df)

    X = df[["subject", "faculty", "semester", "difficulty", "sessionType"]].astype(str)
    y_day = df["day"].astype(str).str.upper()
    y_time = df["startTime"].astype(str)

    indices = X.index
    train_idx, test_idx = train_test_split(
        indices,
        test_size=0.2,
        random_state=42,
        stratify=y_day if y_day.nunique() > 1 and y_day.value_counts().min() > 1 else None,
    )

    X_train = X.loc[train_idx]
    X_test = X.loc[test_idx]
    y_day_train = y_day.loc[train_idx]
    y_day_test = y_day.loc[test_idx]
    y_time_train = y_time.loc[train_idx]
    y_time_test = y_time.loc[test_idx]

    categorical = ["subject", "faculty", "semester", "difficulty", "sessionType"]
    preprocessor = ColumnTransformer(
        transformers=[("cat", OneHotEncoder(handle_unknown="ignore"), categorical)]
    )

    day_model = Pipeline(
        steps=[
            ("prep", preprocessor),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )

    time_model = Pipeline(
        steps=[
            ("prep", preprocessor),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced_subsample",
                ),
            ),
        ]
    )

    day_model.fit(X_train, y_day_train)
    time_model.fit(X_train, y_time_train)

    day_preds = day_model.predict(X_test)
    time_preds = time_model.predict(X_test)
    day_acc = accuracy_score(y_day_test, day_preds)
    time_acc = accuracy_score(y_time_test, time_preds)

    print(f"Dataset: {DATASET_PATH}")
    print(f"Samples: {len(df)}")
    print(f"Day Accuracy: {day_acc:.4f}")
    print(classification_report(y_day_test, day_preds, zero_division=0))
    print(f"Time Accuracy: {time_acc:.4f}")
    print(classification_report(y_time_test, time_preds, zero_division=0))

    payload = {
        "day_model": day_model,
        "time_model": time_model,
        "feature_columns": categorical,
        "label_format": "DAY + HH:MM",
        "day_accuracy": float(day_acc),
        "time_accuracy": float(time_acc),
    }
    joblib.dump(payload, MODEL_PATH)
    print(f"Saved slot model to: {MODEL_PATH}")


if __name__ == "__main__":
    main()
