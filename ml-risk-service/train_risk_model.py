import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


RISK_LABELS = ["LOW", "MEDIUM", "HIGH"]


def resolve_dataset_path(cli_path: str | None) -> Path:
    if cli_path:
        return Path(cli_path)

    local_default = Path(__file__).parent / "student_data.csv"
    if local_default.exists():
        return local_default

    # Kaggle path from the provided notebook (fallback for direct notebook workflows)
    kaggle_path = Path("/kaggle/input/student-performance-data/student_data.csv")
    if kaggle_path.exists():
        return kaggle_path

    raise FileNotFoundError(
        "Dataset not found. Provide --csv path or place student_data.csv in ml-risk-service/."
    )


def build_attendance_percentage(df: pd.DataFrame) -> pd.Series:
    if "attendance" in df.columns:
        return pd.to_numeric(df["attendance"], errors="coerce").clip(0, 100)

    if "absences" in df.columns:
        absences = pd.to_numeric(df["absences"], errors="coerce")
        max_abs = max(float(absences.max(skipna=True) or 1.0), 1.0)
        return (100.0 - (absences / max_abs) * 100.0).clip(0, 100)

    return pd.Series(np.full(len(df), 80.0), index=df.index)


def build_exam_score(df: pd.DataFrame) -> pd.Series:
    if {"G1", "G2"}.issubset(df.columns):
        g1 = pd.to_numeric(df["G1"], errors="coerce")
        g2 = pd.to_numeric(df["G2"], errors="coerce")
        return ((g1 + g2) / 2.0).clip(0, 100)

    for col in ["exam", "exam_score", "average_marks", "avg_score"]:
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").clip(0, 100)

    return pd.Series(np.full(len(df), 50.0), index=df.index)


def build_assignment_score(df: pd.DataFrame, exam_score: pd.Series) -> pd.Series:
    for col in ["assignment", "assignment_score", "assignment_avg"]:
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").clip(0, 100)

    # If assignments are missing in raw dataset, use exam trend as proxy.
    return exam_score.copy()


def build_failures(df: pd.DataFrame) -> pd.Series:
    if "failures" in df.columns:
        return pd.to_numeric(df["failures"], errors="coerce").clip(lower=0)
    return pd.Series(np.zeros(len(df)), index=df.index)


def build_study_time(df: pd.DataFrame) -> pd.Series:
    for col in ["studytime", "study_time"]:
        if col in df.columns:
            return pd.to_numeric(df[col], errors="coerce").clip(lower=0)
    return pd.Series(np.full(len(df), 2.0), index=df.index)


def build_risk_label(df: pd.DataFrame) -> pd.Series:
    if "G3" in df.columns:
        final_score = pd.to_numeric(df["G3"], errors="coerce")
    elif "final_score" in df.columns:
        final_score = pd.to_numeric(df["final_score"], errors="coerce")
    else:
        raise ValueError("Dataset must contain G3 or final_score column to build risk labels.")

    conditions = [
        final_score >= 70,
        (final_score >= 40) & (final_score < 70),
        final_score < 40,
    ]
    choices = ["LOW", "MEDIUM", "HIGH"]
    return pd.Series(np.select(conditions, choices, default="MEDIUM"), index=df.index)


def train_and_save(csv_path: Path, model_out: Path) -> None:
    df = pd.read_csv(csv_path)

    attendance = build_attendance_percentage(df)
    exam = build_exam_score(df)
    assignment = build_assignment_score(df, exam)
    failures = build_failures(df)
    study_time = build_study_time(df)
    risk = build_risk_label(df)

    features = pd.DataFrame(
        {
            "attendance": attendance,
            "exam": exam,
            "assignment": assignment,
            "failures": failures,
            "study_time": study_time,
        }
    )

    # Clean missing values
    for col in features.columns:
        features[col] = pd.to_numeric(features[col], errors="coerce")
        features[col] = features[col].fillna(features[col].median())

    X_train, X_test, y_train, y_test = train_test_split(
        features,
        risk,
        test_size=0.2,
        random_state=42,
        stratify=risk,
    )

    model = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    multi_class="multinomial",
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"Dataset: {csv_path}")
    print(f"Samples: {len(features)}")
    print(f"Test Accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred, labels=RISK_LABELS, zero_division=0))

    payload = {
        "model": model,
        "feature_columns": ["attendance", "exam", "assignment", "failures", "study_time"],
        "risk_labels": RISK_LABELS,
        "accuracy": float(accuracy),
    }
    joblib.dump(payload, model_out)
    print(f"Saved model to: {model_out}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train logistic regression model for student risk")
    parser.add_argument("--csv", type=str, default=None, help="Path to CSV dataset")
    parser.add_argument(
        "--out",
        type=str,
        default=str(Path(__file__).parent / "risk_model.pkl"),
        help="Output model path",
    )
    args = parser.parse_args()

    csv_path = resolve_dataset_path(args.csv)
    out_path = Path(args.out)
    train_and_save(csv_path, out_path)


if __name__ == "__main__":
    main()
