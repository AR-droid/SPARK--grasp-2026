import pandas as pd
import numpy as np
import os
import shutil
import wave
import struct
import random

DATA_DIR = "data"

def create_directory(path):
    os.makedirs(path, exist_ok=True)

def generate_noise(base_val, count, noise_level=0.05):
    return np.random.normal(base_val, base_val * noise_level, count)

def generate_trend(start, end, count):
    return np.linspace(start, end, count)

def create_dummy_wav(filename, duration_sec=1):
    """Generates a 1-second white noise WAV file."""
    sample_rate = 44100
    num_samples = duration_sec * sample_rate
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1) # Mono
        wav_file.setsampwidth(2) # 2 bytes per sample
        wav_file.setframerate(sample_rate)
        
        # Generate white noise
        data = []
        for _ in range(num_samples):
            value = random.randint(-32767, 32767)
            data.append(struct.pack('<h', value))
            
        wav_file.writeframes(b''.join(data))
    print(f"Generated WAV: {filename}")

def generate_csv(path, filename, data_dict):
    full_path = os.path.join(path, filename)
    df = pd.DataFrame(data_dict)
    df.to_csv(full_path, index=False)
    print(f"Generated CSV: {full_path}")

def generate_dataset():
    # Define the structure based on user request
    # Key: Folder Path, Value: List of files (name, type, generator_func)
    
    # Common Time
    n = 1000
    time_series = np.arange(n)
    
    structure = {
        "pressure_vessels": {
            "sensor_timeseries": [
                ("pressure.csv", {"time": time_series, "value": generate_noise(150, n), "unit": "psi"}),
                ("temperature.csv", {"time": time_series, "value": generate_noise(350, n), "unit": "C"}),
                ("pressure_cycles.csv", {"time": time_series, "cycle_count": np.cumsum(np.random.randint(0, 2, n)), "unit": "count"})
            ],
            "acoustic_emission": [
                ("crack_signals.wav", "wav"),
                ("leak_hiss.wav", "wav")
            ],
            "inspection_data": [
                ("wall_thickness.csv", {"date": pd.date_range(start='1/1/2023', periods=10, freq='M'), "thickness_mm": generate_trend(12.0, 11.5, 10)}),
                ("corrosion_rates.csv", {"date": pd.date_range(start='1/1/2023', periods=10, freq='M'), "rate_mpy": generate_noise(5, 10)}),
                ("inspection_log.csv", {"date": pd.date_range(start='1/1/2023', periods=5, freq='Q'), "inspector": ["Eng A"]*5, "finding": ["No issues", "Minor pitting", "Monitor", "Monitor", "Repair needed"]})
            ],
            "geometry/digital_twin": [],
            "synthetic_data": [
                ("corrosion_growth.csv", {"time_days": np.arange(3650), "depth_mm": generate_trend(0, 2.5, 3650)}),
                ("crack_initiation.csv", {"cycle": np.arange(10000), "crack_len_mm": np.exp(np.linspace(0, 2, 10000))})
            ]
        },
        "heat_exchangers": {
            "sensor_timeseries": [
                ("inlet_temperature.csv", {"time": time_series, "value": generate_noise(120, n), "unit": "C"}),
                ("outlet_temperature.csv", {"time": time_series, "value": generate_noise(80, n), "unit": "C"}),
                ("flow_rate.csv", {"time": time_series, "value": generate_noise(500, n), "unit": "kg/s"}),
                ("pressure_drop.csv", {"time": time_series, "value": generate_trend(5, 8, n), "unit": "psi"})
            ],
            "audio": [("cavitation.wav", "wav"), ("flow_instability.wav", "wav")],
            "inspection_data": [
                ("tube_thickness.csv", {"tube_id": range(1, 11), "thickness_mm": generate_noise(3.0, 10)}),
                ("fouling_index.csv", {"date": pd.date_range(start='1/1/2023', periods=12, freq='M'), "rf_value": generate_trend(0.001, 0.005, 12)})
            ],
            "geometry/digital_twin": [],
            "synthetic_data": [
                ("fouling_buildup.csv", {"time_hrs": np.arange(500), "resistance": np.linspace(0, 0.01, 500)}),
                ("heat_transfer_degradation.csv", {"time_hrs": np.arange(500), "u_value": np.linspace(500, 300, 500)})
            ]
        },
        "storage_tanks": {
            "sensor_timeseries": [
                ("internal_pressure.csv", {"time": time_series, "value": generate_noise(14.7, n, 0.01), "unit": "psi"}),
                ("temperature.csv", {"time": time_series, "value": generate_noise(25, n, 0.1), "unit": "C"}),
                ("level_data.csv", {"time": time_series, "value": generate_noise(80, n, 0.05), "unit": "%"})
            ],
            "acoustic_emission": [("stress_crack_events.wav", "wav"), ("shell_popping.wav", "wav")],
            "inspection_data": [
                ("floor_thickness.csv", {"point_id": range(1, 21), "thickness_mm": generate_noise(8.0, 20)}),
                ("shell_corrosion.csv", {"height_m": range(1, 11), "loss_mm": generate_noise(0.5, 10)}),
                ("settlement_log.csv", {"date": pd.date_range(start='1/1/2020', periods=4, freq='Y'), "settlement_mm": [2, 5, 8, 12]})
            ],
            "geometry/digital_twin": [],
            "synthetic_data": [
                ("thermal_stress_events.csv", {"event_id": range(10), "stress_mpa": generate_noise(150, 10)}),
                ("leak_initiation.csv", {"time_days": np.arange(100), "leak_rate_lph": np.linspace(0, 5, 100)})
            ]
        },
        "piping_networks": {
            "sensor_timeseries": [
                ("pressure.csv", {"time": time_series, "value": generate_noise(60, n), "unit": "psi"}),
                ("flow_rate.csv", {"time": time_series, "value": generate_noise(100, n), "unit": "m3/hr"}),
                ("pressure_drop.csv", {"time": time_series, "value": generate_trend(2, 4, n), "unit": "psi"})
            ],
            "audio": [("leak_hiss.wav", "wav"), ("turbulence.wav", "wav"), ("vibration.wav", "wav")],
            "inspection_data": [
                ("wall_thickness.csv", {"elbow_id": range(1, 11), "thickness_mm": generate_noise(6.0, 10)}),
                ("weld_inspection.csv", {"weld_id": range(1, 6), "defect_found": [False, False, True, False, False]}),
                ("corrosion_map.csv", {"segment_id": range(1, 6), "corrosion_rate_mpy": generate_noise(3, 5)})
            ],
            "geometry/digital_twin": [],
            "synthetic_data": [
                ("pinhole_leak_growth.csv", {"time_d": np.arange(50), "hole_dia_mm": np.linspace(0.1, 2.0, 50)}),
                ("erosion_corrosion.csv", {"velocity_mps": np.linspace(1, 10, 50), "erosion_rate": np.linspace(1, 10, 50)**2})
            ]
        },
        "rotating_equipment": {
            "sensor_timeseries": [
                ("vibration.csv", {"time": time_series, "rms_x": generate_noise(2, n), "rms_y": generate_noise(2.5, n), "unit": "mm/s"}),
                ("temperature.csv", {"time": time_series, "bearing_temp": generate_noise(65, n), "unit": "C"}),
                ("rpm.csv", {"time": time_series, "speed": generate_noise(1500, n, 0.01), "unit": "rpm"}),
                ("load.csv", {"time": time_series, "load_pct": generate_noise(85, n), "unit": "%"})
            ],
            "audio": [("bearing_fault.wav", "wav"), ("misalignment.wav", "wav"), ("cavitation.wav", "wav")],
            "inspection_data": [
                ("bearing_health.csv", {"date": pd.date_range(start='1/1/2023', periods=12, freq='M'), "condition": ["Good"]*10 + ["Warning", "Alarm"]}),
                ("lubrication_log.csv", {"date": pd.date_range(start='1/1/2023', periods=36, freq='M'), "action": ["Refill"]*36})
            ],
            "geometry/digital_twin": [],
            "synthetic_data": [
                ("bearing_degradation.csv", {"run_hours": np.arange(2000), "health_index": np.linspace(1, 0, 2000)}),
                ("fatigue_accumulation.csv", {"cycles": np.arange(1e6, step=1000), "damage_fraction": np.linspace(0, 1, 1000)})
            ]
        },
        "shared": {
            "cost_lca": [
                ("repair_costs.csv", {"action": ["Weld Repair", "Bearing Replace", "Seal Replace"], "cost_usd": [5000, 2000, 1500]}),
                ("lifecycle_impact.csv", {"action": ["Repair", "Replace"], "co2_kg": [100, 2000]})
            ],
            "metadata": [
                ("asset_registry.csv", {"asset_id": ["PV-01", "HE-01", "ST-01", "PN-01", "RE-01"], "type": ["Pressure Vessel", "Heat Exchanger", "Storage Tank", "Piping", "Rotating Eq"], "location": ["Zone A"]*5})
            ]
        }
    }

    # Execute Generation
    for folder, subfolders in structure.items():
        base_path = os.path.join(DATA_DIR, folder)
        create_directory(base_path)
        
        for sub_name, contents in subfolders.items():
            sub_path = os.path.join(base_path, sub_name)
            create_directory(sub_path)
            
            for item in contents:
                if isinstance(item, tuple):
                    fname, data = item
                    if data == "wav":
                        create_dummy_wav(os.path.join(sub_path, fname))
                    else:
                        generate_csv(sub_path, fname, data)

if __name__ == "__main__":
    print("Re-structuring and populating Data folder...")
    if os.path.exists(DATA_DIR):
        print(f"Cleaning {DATA_DIR}...")
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)
    
    generate_dataset()
    print("Optimization Complete: All folders and files created.")
