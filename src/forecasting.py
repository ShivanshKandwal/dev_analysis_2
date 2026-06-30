import os
import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
import logging

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use("Agg")
warnings.filterwarnings("ignore")

from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
import plotly.graph_objects as go
import plotly.io as pio

from config import PROCESSED_DIR, BASE_DIR

logger = logging.getLogger(__name__)

# Set up local directories
MODELS_DIR = Path(PROCESSED_DIR) / "models"
REPORTS_DIR = Path(BASE_DIR) / "monitoring"
for folder in [MODELS_DIR, REPORTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# ALL INCLUSIVE MASTER FORECASTING MATRICES
TECHNOLOGIES = {
    "Languages": [
        "Lang_Python", "Lang_JavaScript", "Lang_TypeScript", "Lang_Rust", 
        "Lang_Go", "Lang_Java", "Lang_C#", "Lang_C++", "Lang_Kotlin", "Lang_Swift"
    ],
    "Databases": [
        "DB_PostgreSQL", "DB_MySQL", "DB_MongoDB", "DB_Redis", 
        "DB_SQLite", "DB_Elasticsearch", "DB_Supabase"
    ],
    "Cloud & DevOps": [
        "Cloud_AWS", "Cloud_Google_Cloud", "Cloud_Microsoft_Azure",
        "Tool_Docker", "Tool_Kubernetes"
    ],
    "Frameworks": [
        "Webframe_React", "Webframe_Next_js", "Webframe_FastAPI", 
        "Webframe_Django", "Webframe_Vue_js", "Webframe_Angular"
    ]
}
FLAT_TECHNOLOGIES = {col: cat for cat, cols in TECHNOLOGIES.items() for col in cols}

def compute_all_adoption_rates(df: pd.DataFrame) -> pd.DataFrame:
    print("Aggregating multi-year longitudinal adoption ratios across master columns...")
    rows = []
    for col, category in FLAT_TECHNOLOGIES.items():
        if col not in df.columns:
            # check case insensitive or alternative binarizations
            alt_col = col.replace("_", "__", 1)
            if alt_col in df.columns:
                col = alt_col
            else:
                # print(f"Skipping technology: {col} (not found in dataset)")
                continue
                
        by_year = df.groupby("SurveyYear")[col].agg(adoption_pct=lambda x: x.mean() * 100).reset_index()
        by_year["technology"] = col
        by_year["category"] = category
        by_year["tech_name"] = col.replace("Lang_", "").replace("DB_", "").replace("Cloud_", "").replace("Tool_", "").replace("Webframe_", "").replace("AITool_", "").replace("_", " ")
        rows.append(by_year)
        
    if not rows:
        raise ValueError("Structural error: No matching tech stack prefixes discovered in master table.")
        
    return pd.concat(rows, ignore_index=True).round(2)

def _fit_prophet(train: pd.DataFrame, forecast_years: list[int]) -> pd.DataFrame:
    prophet_df = train.rename(columns={"SurveyYear": "ds", "adoption_pct": "y"})
    prophet_df["ds"] = pd.to_datetime(prophet_df["ds"].astype(str) + "-01-01")

    # Fit simple linear growth with Prophet
    model = Prophet(
        yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False,
        changepoint_prior_scale=0.3, interval_width=0.90, growth="linear"
    )
    model.fit(prophet_df, iter=150)

    future_dates = pd.DataFrame({"ds": pd.to_datetime([f"{y}-01-01" for y in forecast_years])})
    forecast = model.predict(future_dates)
    forecast["year"] = forecast["ds"].dt.year
    return forecast.rename(columns={"yhat": "prophet", "yhat_lower": "lower_bound", "yhat_upper": "upper_bound"})[["year", "prophet", "lower_bound", "upper_bound"]]

def _fit_arima(values: list, steps: int) -> list:
    try:
        model = ARIMA(values, order=(1, 1, 0))
        fit = model.fit()
        return [max(0.0, min(100.0, float(v))) for v in fit.forecast(steps=steps)]
    except Exception:
        return _fit_linear(values, steps)

def _fit_linear(values: list, steps: int) -> list:
    X = np.arange(len(values)).reshape(-1, 1)
    y = np.array(values)
    reg = LinearRegression().fit(X, y)
    future_X = np.arange(len(values), len(values) + steps).reshape(-1, 1)
    return [max(0.0, min(100.0, float(v))) for v in reg.predict(future_X)]

def generate_interactive_plot(all_results: dict, output_path: Path):
    print("Generating interactive Plotly dashboard...")
    fig = go.Figure()

    category_colors = {
        "Languages": "#1f77b4",
        "Databases": "#ff7f0e",
        "Cloud & DevOps": "#d62728",
        "Frameworks": "#9467bd"
    }

    for tech_name, data in all_results.items():
        category = data["category"]
        color = category_colors.get(category, "#7f7f7f")

        hist_years = [h["year"] for h in data["historical"]]
        hist_vals = [h["adoption_pct"] for h in data["historical"]]
        fc_years = data["forecast"]["years"]
        ensemble_vals = data["forecast"]["ensemble"]

        # Connect history and forecast
        combined_years = hist_years + fc_years
        combined_vals = hist_vals + ensemble_vals

        # Add Historical Track
        fig.add_trace(go.Scatter(
            x=hist_years, 
            y=hist_vals,
            mode='lines+markers',
            name=f"{tech_name} (Hist)",
            legendgroup=tech_name,
            line=dict(color=color, width=3),
            hovertemplate=f"<b>{tech_name}</b><br>Year: %{{x}}<br>Adoption: %{{y}}%<br><i>Historical</i><extra></extra>"
        ))

        # Add Forecast Track
        fig.add_trace(go.Scatter(
            x=[hist_years[-1]] + fc_years,
            y=[hist_vals[-1]] + ensemble_vals,
            mode='lines+markers',
            name=f"{tech_name} (Forecast)",
            legendgroup=tech_name,
            showlegend=False,
            line=dict(color=color, width=2, dash='dash'),
            hovertemplate=f"<b>{tech_name}</b><br>Year: %{{x}}<br>Adoption: %{{y}}%<br><i>Forecast</i><extra></extra>"
        ))

    fig.update_layout(
        title="Technology Adoption Rates: Historical Trends & Future Forecasts",
        xaxis=dict(title="Survey Year", tickmode='linear', dtick=1, gridcolor='rgba(200, 200, 200, 0.2)'),
        yaxis=dict(title="Adoption Percentage (%)", ticksuffix="%", range=[0, 100], gridcolor='rgba(200, 200, 200, 0.2)'),
        hovermode="closest",
        template="plotly_dark",
        legend=dict(
            title="Technologies (Click to Toggle)",
            font=dict(size=11),
            orientation="v",
            yanchor="top",
            y=1,
            xanchor="left",
            x=1.02
        ),
        margin=dict(r=250, l=50, t=80, b=50)
    )

    # Save to JSON for React-Plotly
    json_path = REPORTS_DIR / "interactive_forecasts.json"
    with open(json_path, "w") as f:
        f.write(pio.to_json(fig))
    print(f"Saved Plotly JSON forecasts to: {json_path}")
    
    # Copy to frontend/public
    fe_public = Path(BASE_DIR) / "frontend" / "public"
    if fe_public.exists():
        fe_path = fe_public / "interactive_forecasts.json"
        with open(fe_path, "w") as f:
            f.write(pio.to_json(fig))
        print(f"Copied Plotly JSON forecasts to frontend: {fe_path}")

    # Save HTML
    fig.write_html(str(output_path))
    print(f"Interactive plot compiled successfully: {output_path}")

def run_technology_forecasting(forecast_years: list[int] = [2024, 2025, 2026]):
    print("=" * 60)
    print("RUNNING EXTENDED MULTI-MODEL FORECASTING ENSEMBLE PIPELINE")
    print("=" * 60)

    master_path = os.path.join(PROCESSED_DIR, "master_table_v2.csv")
    if not os.path.exists(master_path):
        print(f"Error: Missing master file. Complete data cleaning loops first.")
        return

    df = pd.read_csv(master_path)
    adoption_df = compute_all_adoption_rates(df)
    
    all_results = {}
    for col, category in FLAT_TECHNOLOGIES.items():
        tech_data = adoption_df[adoption_df["technology"] == col].sort_values("SurveyYear").reset_index(drop=True)
        if len(tech_data) < 2:
            continue

        tech_name = tech_data["tech_name"].iloc[0]
        years = tech_data["SurveyYear"].tolist()
        values = tech_data["adoption_pct"].tolist()

        prophet_out = _fit_prophet(tech_data, forecast_years)
        arima_out = _fit_arima(values, len(forecast_years))
        linear_out = _fit_linear(values, len(forecast_years))

        ensemble = [
            round((p + a + l) / 3, 2) 
            for p, a, l in zip(prophet_out["prophet"].tolist(), arima_out, linear_out)
        ]

        all_results[tech_name] = {
            "tech_name": tech_name,
            "category": category,
            "historical": [{"year": int(y), "adoption_pct": float(v)} for y, v in zip(years, values)],
            "forecast": {
                "years": forecast_years,
                "prophet": prophet_out["prophet"].round(2).tolist(),
                "arima": [round(v, 2) for v in arima_out],
                "linear": [round(v, 2) for v in linear_out],
                "ensemble": ensemble,
                "lower_bound": prophet_out["lower_bound"].round(2).tolist(),
                "upper_bound": prophet_out["upper_bound"].round(2).tolist(),
            },
            "trend_direction": "rising" if ensemble[-1] > values[-1] else "falling",
            "pct_change_forecast": round(ensemble[-1] - values[-1], 2)
        }

    # Save JSON artifact
    with open(MODELS_DIR / "forecast_results.json", "w") as f:
        json.dump(all_results, f, indent=2)
        
    html_report_path = REPORTS_DIR / "interactive_forecasts.html"
    generate_interactive_plot(all_results, html_report_path)
        
    print("\n" + "=" * 60)
    print(f"PIPELINE EXPORTS SECURELY WRITTEN: {len(all_results)} Technologies Configured!")
    print("=" * 60)

if __name__ == "__main__":
    run_technology_forecasting()
