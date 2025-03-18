import sys
import json
import joblib
import pandas as pd

model = joblib.load("utils/risk_model.pkl")

if len(sys.argv) < 2:
    print("Error: No input provided. Please provide a JSON string as an argument.", file=sys.stderr)
    print("Example: python utils/predict_risk.py '{\"name_similarity\": 0.9, \"phone_match\": 1, ...}'", file=sys.stderr)
    sample_input = {
        "name_similarity": 0.9,
        "phone_match": 1,
        "credit_score": 750,
        "income_range": 3,
        "avg_monthly_spend": 150000,
        "existing_loans": 1,
        "loan_amount": 5000000,
        "loan_tenure": 120,
        "debt_to_income_ratio": 0.1,
        "pan_verified": 1,
        "aadhaar_verified": 1
    }
    input_json = json.dumps(sample_input)
else:
    input_json = sys.argv[1]

try:
    features = json.loads(input_json)
    df = pd.DataFrame([features])
    risk_prob = model.predict_proba(df)[0][1]
    risk_score = round(risk_prob * 10, 1)
    print(risk_score)  # Only output the score
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input provided. Details: {str(e)}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)