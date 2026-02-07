# SPARK — Industry & Device-Specific Intelligence

This spec is the RBI-grade reasoning layer used by SPARK for onboarding, RoF/CoF weighting, agentic reasoning, and explainability.

## Industry-Specific Onboarding

Industry selection drives rules, templates, severity weighting, and prior failure probabilities.

- Chemical manufacturing
- Oil & gas refining
- Petrochemical
- Fertilizer
- Power & utilities

SPARK loads:
- RBI templates and failure libraries
- Regulatory context and thresholds
- Process criticality and severity weighting
- Typical failure modes (priors)

## Device-Level Onboarding (Asset Discovery)

From drawings + images, SPARK classifies assets:
- Pressure vessels
- Heat exchangers
- Storage tanks
- Piping networks
- Rotating equipment

Each asset is onboarded with a device-specific integrity model.

## Pressure Vessels

Failure Modes:
- Uniform corrosion
- Pitting corrosion
- Stress corrosion cracking
- Fatigue cracking
- Overpressure rupture
- Brittle fracture risk

Tracked Parameters:
- Wall thickness
- Corrosion rate
- Pressure cycles
- Operating temperature
- Acoustic emission activity

RoF:
`RoF = f(corrosion_rate, thickness_margin, pressure_cycles, AE_activity)`

CoF:
- Chemical: toxic release, human harm
- Refining: fire, explosion
- Fertilizer: environmental damage

Explainability example:
"RoF increased due to accelerated corrosion near weld seam; CoF high due to toxic chemical inventory."

## Heat Exchangers

Failure Modes:
- Tube fouling
- Tube corrosion
- Tube rupture
- Cavitation erosion
- Thermal fatigue

Tracked Parameters:
- ΔT
- Pressure drop
- Flow instability
- Cavitation acoustics
- Tube thickness

RoF:
`RoF = f(ΔT deviation, pressure_drop, cavitation_noise, inspection_age)`

CoF:
- Process inefficiency
- Downstream overheating
- Production loss
- Secondary equipment damage

Explainability example:
"RoF elevated due to fouling-driven pressure drop; CoF moderate due to downtime impact."

## Storage Tanks

Failure Modes:
- Bottom corrosion
- Shell cracking
- Settlement-induced buckling
- Nozzle leaks
- Roof seal leakage

Tracked Parameters:
- Floor thickness
- Settlement data
- Temperature gradients
- Acoustic emission bursts

RoF:
`RoF = f(floor_thickness_loss, settlement_rate, AE_events)`

CoF:
- Spill volume
- Environmental contamination
- Fire risk

Explainability example:
"Acoustic emissions suggest crack propagation; CoF driven by spill potential."

## Piping Networks

Failure Modes:
- Pinhole leaks
- Erosion–corrosion
- Flow-induced fatigue
- Support failure
- Gasket failure

Tracked Parameters:
- Pressure drop
- Flow velocity
- Audio turbulence
- Vibration at supports
- Wall thickness

RoF:
`RoF = f(flow_velocity, thickness_loss, acoustic_anomaly)`

CoF:
- Localized leaks
- Fire/explosion with hazardous fluid
- Cascading asset damage

Explainability example:
"Acoustic turbulence and pressure loss indicate early leak; CoF elevated due to ignition proximity."

## Rotating Equipment (Pumps)

Failure Modes:
- Cavitation damage
- Seal leakage
- Bearing wear
- Shaft misalignment
- Flow starvation

Tracked Parameters:
- Vibration RMS & spectrum
- Audio high-frequency energy
- Bearing temperature
- Load/RPM

RoF:
`RoF = f(vibration_drift, audio_energy, bearing_temperature)`

CoF:
- Sudden stoppage
- Pipe rupture
- Downstream process upset

Explainability example:
"RoF driven by bearing wear detected via high-frequency audio; CoF high due to dependency of upstream vessel."

## Agentic Reasoning

Inputs:
- RoF per asset
- CoF per asset
- Connectivity graph
- Cost & lifecycle data

Actions:
- Simulate degradation progression
- Evaluate repair, monitor, defer
- Calculate risk reduction per cost

Output:
"Repair pump P-07 now reduces system RoF by 38% and prevents downstream vessel overpressure."

## Explainability (Per Failure Type)

Every decision includes:
- Failure mode
- RoF drivers
- CoF drivers
- Confidence
- Assumptions
