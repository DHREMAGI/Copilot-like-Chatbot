# main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
import base64
import os
from dotenv import load_dotenv
import openai

# ----------------------- Load environment -----------------------
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# ----------------------- FastAPI setup -----------------------
app = FastAPI(title="DataCopilot Chatbot")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ----------------------- Load datasets -----------------------
DATA_FOLDER = "data"
DATA_FILES = {
    "shipments": "shipments.json",
    "sales": "sales.json"
}
loaded_data = {}
for name, filename in DATA_FILES.items():
    path = os.path.join(DATA_FOLDER, filename)
    if os.path.exists(path):
        if filename.endswith(".csv"):
            loaded_data[name] = pd.read_csv(path)
        elif filename.endswith(".json"):
            loaded_data[name] = pd.read_json(path)

# ----------------------- Frontend -----------------------
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "datasets": list(loaded_data.keys())})

# ----------------------- Get table data -----------------------
@app.get("/get_data")
async def get_data(dataset: str, rows: int = 10):
    df = loaded_data.get(dataset)
    if df is None:
        return JSONResponse([])
    # Convert datetime columns to string
    df_safe = df.copy()
    for col in df_safe.select_dtypes(include=['datetime64[ns]']).columns:
        df_safe[col] = df_safe[col].astype(str)
    return JSONResponse(df_safe.head(int(rows)).to_dict(orient="records"))

# ----------------------- Query endpoint -----------------------
@app.post("/query")
async def query(request: Request):
    data = await request.json()
    dataset_name = data.get("dataset")
    user_question = data.get("query")
    chart_type = data.get("chart_type", "bar")

    df = loaded_data.get(dataset_name)
    if df is None:
        return JSONResponse({"question": user_question, "answer": "Dataset not found"})

    # ----------------------- OpenAI Prompt -----------------------
    prompt = f"""
You are a Python pandas assistant. The dataframe is called df.
Convert this natural language question into Python code using pandas.
Assign the result to 'result_df'. Use only pandas, no explanation.
DataFrame columns: {list(df.columns)}
Question: "{user_question}"
"""

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        code = response.choices[0].message.content
        print("Generated code:\n", code)
    except Exception as e:
        return JSONResponse({"question": user_question, "answer": f"OpenAI Error: {str(e)}"})

    local_vars = {"df": df.copy(), "pd": pd, "np": __import__("numpy")}
    try:
        exec(code, {}, local_vars)
        result = local_vars.get("result_df", None)

        if result is None:
            result = pd.DataFrame([{"Answer": "No result"}])

        if isinstance(result, (int, float, str)):
            result = pd.DataFrame([{"Answer": result}])
        elif isinstance(result, pd.Series):
            result = result.reset_index()
            result.columns = ["Index", "Value"]
        elif isinstance(result, pd.DataFrame):
            pass
        else:
            result = pd.DataFrame([{"Answer": str(result)}])

        # Convert any datetime columns to string
        for col in result.select_dtypes(include=['datetime64[ns]']).columns:
            result[col] = result[col].astype(str)

        numeric_cols = result.select_dtypes(include=['int64','float64']).columns.tolist()
        is_analytic = len(result) > 1 and len(numeric_cols) > 0

        chart_base64 = None
        if is_analytic and numeric_cols:
            plt.clf()
            y_col = numeric_cols[0]
            x_cols = [c for c in result.columns if c not in numeric_cols]
            x_col = x_cols[0] if x_cols else None
            kind = chart_type.lower()
            if x_col:
                result.plot(x=x_col, y=y_col, kind=kind, legend=False)
                plt.xlabel(x_col)
            else:
                result[y_col].plot(kind=kind)
            plt.ylabel(y_col)
            buf = BytesIO()
            plt.tight_layout()
            plt.savefig(buf, format="png")
            buf.seek(0)
            chart_base64 = base64.b64encode(buf.getvalue()).decode()

        return JSONResponse({
            "question": user_question,
            "answer": "" if result.empty else "See table below",
            "table": result.head(50).to_dict(orient="records"),  # return top 50 rows
            "is_analytic": is_analytic,
            "numeric_cols": numeric_cols,
            "chart": chart_base64
        })

    except Exception as e:
        return JSONResponse({"question": user_question, "answer": f"Execution error: {str(e)}"})
