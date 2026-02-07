import json
from datetime import datetime
from .rbi_library import get_industry_profile, get_asset_profile, normalize_asset_type, METRIC_TO_FAILURE_HINTS

ASSET_COF_WEIGHTS = {
    "pressure_vessel": 0.9,
    "heat_exchanger": 0.6,
    "storage_tank": 0.85,
    "piping_network": 0.7,
    "pump": 0.65,
    "motor": 0.55,
    "compressor": 0.7,
}


def compute_cof(industry, asset_type):
    industry_profile = get_industry_profile(industry)
    base = industry_profile.get("severity_weight", 0.7)
    asset_key = normalize_asset_type(asset_type)
    asset_weight = ASSET_COF_WEIGHTS.get(asset_key, 0.6)
    cof = min(base * asset_weight + 0.1, 1.0)
    return cof, industry_profile


def build_explainability(asset, industry, metric, rof_score, cof_score, signal_weights=None):
    industry_profile = get_industry_profile(industry)
    asset_profile = get_asset_profile(asset.type)

    failure_hints = []
    for key, hints in METRIC_TO_FAILURE_HINTS.items():
        if metric and key in metric.lower():
            failure_hints.extend(hints)

    explain = {
        "timestamp": datetime.utcnow().isoformat(),
        "asset_id": asset.id,
        "asset_type": asset.type,
        "industry": industry,
        "rof_score": round(float(rof_score), 4),
        "cof_score": round(float(cof_score), 4),
        "rof_drivers": [
            f"Anomaly score from ML on metric '{metric}'",
            "Baseline deviation and temporal drift",
        ],
        "cof_drivers": industry_profile.get("cof_drivers", []),
        "failure_mode_candidates": failure_hints or (asset_profile or {}).get("failure_modes", []),
        "assumptions": [
            "Time column interpreted as seconds offset",
            "Risk is proportional to anomaly magnitude and industry severity",
        ],
    }
    if signal_weights:
        explain["signal_weights"] = signal_weights

    if asset_profile:
        explain["asset_parameters"] = asset_profile.get("parameters", [])
        explain["rof_formula"] = asset_profile.get("rof_formula")

    return explain


def choose_degradation_type(explain):
    candidates = explain.get("failure_mode_candidates", [])
    return candidates[0] if candidates else "Unknown"


def serialize_explainability(explain_dict):
    return json.dumps(explain_dict)
