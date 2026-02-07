"""
Industry + device-specific RBI library.
Used for onboarding templates, RoF/CoF weighting, and explainability.
"""

INDUSTRY_PROFILES = {
    "Chemical": {
        "severity_weight": 0.85,
        "cof_drivers": ["toxic_release", "human_harm", "environmental_impact"],
        "regulatory_context": ["OSHA PSM", "EPA RMP"],
    },
    "Refining": {
        "severity_weight": 0.9,
        "cof_drivers": ["fire_explosion", "blast_radius", "production_loss"],
        "regulatory_context": ["API 580/581", "OSHA PSM"],
    },
    "Energy": {
        "severity_weight": 0.75,
        "cof_drivers": ["grid_reliability", "thermal_runaway", "personnel_safety"],
        "regulatory_context": ["NERC", "OSHA"],
    },
    "Petrochemical": {
        "severity_weight": 0.88,
        "cof_drivers": ["flammable_release", "toxic_release", "domino_effect"],
        "regulatory_context": ["API 580/581", "OSHA PSM"],
    },
    "Fertilizer": {
        "severity_weight": 0.8,
        "cof_drivers": ["toxic_release", "environmental_damage", "offsite_impact"],
        "regulatory_context": ["EPA RMP", "OSHA"],
    },
}

ASSET_LIBRARY = {
    "pressure_vessel": {
        "category": "Pressure Vessels",
        "failure_modes": [
            "Uniform corrosion",
            "Pitting corrosion",
            "Stress corrosion cracking",
            "Fatigue cracking",
            "Overpressure rupture",
            "Brittle fracture risk",
        ],
        "parameters": [
            "wall_thickness",
            "corrosion_rate",
            "pressure_cycles",
            "operating_temperature",
            "acoustic_emission",
        ],
        "rof_formula": "f(corrosion_rate, thickness_margin, pressure_cycles, AE_activity)",
    },
    "heat_exchanger": {
        "category": "Heat Exchangers",
        "failure_modes": [
            "Tube fouling",
            "Tube corrosion",
            "Tube rupture",
            "Cavitation erosion",
            "Thermal fatigue",
        ],
        "parameters": [
            "delta_t",
            "pressure_drop",
            "flow_instability",
            "cavitation_acoustics",
            "tube_thickness",
        ],
        "rof_formula": "f(ΔT deviation, pressure_drop, cavitation_noise, inspection_age)",
    },
    "storage_tank": {
        "category": "Storage Tanks",
        "failure_modes": [
            "Bottom corrosion",
            "Shell cracking",
            "Settlement-induced buckling",
            "Nozzle leaks",
            "Roof seal leakage",
        ],
        "parameters": [
            "floor_thickness",
            "settlement_rate",
            "temperature_gradient",
            "acoustic_emission",
        ],
        "rof_formula": "f(floor_thickness_loss, settlement_rate, AE_events)",
    },
    "piping_network": {
        "category": "Piping Networks",
        "failure_modes": [
            "Pinhole leaks",
            "Erosion-corrosion",
            "Flow-induced fatigue",
            "Support failure",
            "Gasket failure",
        ],
        "parameters": [
            "pressure_drop",
            "flow_velocity",
            "acoustic_turbulence",
            "vibration_support",
            "wall_thickness",
        ],
        "rof_formula": "f(flow_velocity, thickness_loss, acoustic_anomaly)",
    },
    "pump": {
        "category": "Rotating Equipment – Pumps",
        "failure_modes": [
            "Cavitation damage",
            "Seal leakage",
            "Bearing wear",
            "Shaft misalignment",
            "Flow starvation",
        ],
        "parameters": [
            "vibration_rms",
            "pressure_flow_deviation",
            "seal_integrity",
            "bearing_temperature",
        ],
        "rof_formula": "f(vibration_drift, audio_energy, bearing_temperature)",
    },
    "motor": {
        "category": "Rotating Equipment – Motors",
        "failure_modes": [
            "Bearing failure",
            "Overheating",
            "Electrical imbalance",
            "Shaft misalignment",
        ],
        "parameters": [
            "temperature_rise",
            "vibration_harmonics",
            "load_deviation",
            "rul_estimate",
        ],
        "rof_formula": "f(vibration_drift, temperature_rise, load_deviation)",
    },
    "compressor": {
        "category": "Rotating/Static Hybrid – Compressors",
        "failure_modes": [
            "Valve fatigue",
            "Overheating",
            "Pressure surges",
            "Seal failure",
        ],
        "parameters": [
            "acoustic_anomaly",
            "pressure_stability",
            "energy_efficiency_drop",
        ],
        "rof_formula": "f(acoustic_anomaly, pressure_stability, efficiency_drop)",
    },
}

METRIC_TO_FAILURE_HINTS = {
    "vibration": ["Bearing wear", "Unbalance / Misalignment"],
    "temperature": ["Overheating", "Lubrication Failure"],
    "pressure_drop": ["Leak Detection", "Fouling"],
    "pressure": ["Overpressure rupture"],
    "flow": ["Cavitation damage", "Flow starvation"],
    "acoustic": ["Leak Detection", "Valve fatigue"],
}


def normalize_asset_type(asset_type: str) -> str:
    t = (asset_type or "").lower()
    if "pressure" in t and "vessel" in t:
        return "pressure_vessel"
    if "vessel" in t:
        return "pressure_vessel"
    if "heat" in t and "exchanger" in t:
        return "heat_exchanger"
    if "exchanger" in t:
        return "heat_exchanger"
    if "storage" in t and "tank" in t:
        return "storage_tank"
    if "tank" in t:
        return "storage_tank"
    if "piping" in t or "pipe" in t:
        return "piping_network"
    if "pump" in t:
        return "pump"
    if "motor" in t:
        return "motor"
    if "compressor" in t:
        return "compressor"
    return ""


def get_industry_profile(industry: str):
    return INDUSTRY_PROFILES.get(industry, {
        "severity_weight": 0.7,
        "cof_drivers": ["generic_safety"],
        "regulatory_context": [],
    })


def get_asset_profile(asset_type: str):
    key = normalize_asset_type(asset_type)
    return ASSET_LIBRARY.get(key)
