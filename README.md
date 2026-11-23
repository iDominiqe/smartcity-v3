# NEO Smart-City v3 (`smartcity-v3.idominiqe.com`)

Photorealistic studio-daylight 3D Smart City energy command dashboard combining the frosted-glass SolarSync / Suno visual system with WebGL (`Three.js`), `PMREMGenerator` / `RoomEnvironment` PBR lighting, custom **GLSL topographic shaders**, **WebAssembly (`projection.wat` / `projection-kernel.js`)** spatial projection & ROI math, and a background **Web Worker** telemetry stream.

## Architecture & Multi-Page Ecosystem
- **`index.html`** — Full-bleed 3D Smart City Diorama featuring the architectural white Solar Home V2H centerpiece, lush multi-cluster green & autumn-ochre trees, Solar Microgrid Hub, SafeCharge X1 EV Canopy, NEO Clim® Pavilion, and HUWART Eco-Parking, overlaid with floating frosted-glass telemetry widgets (dot-matrix efficiency chart, power spectrum bars, energy balance donut + striped progress bars, semicircular dial gauge, glossy 3D battery capsule, and sunlight arc weather card).
- **`home-studio.html`** — Isolated 3D Smart Solar Home V2H showcase.
- **`charger-studio.html`** — Isolated 3D SafeCharge X1 500V DC station + 100 kWh Na-ion pack.
- **`ac-studio.html`** — Isolated 3D NEO Clim® MZ Inverter HVAC showcase.
- **`parking-studio.html`** — Isolated 3D NEO® HUWART Solar & Bio-Permeable Eco-Parking.
- **`calculator.html`** — Zero-WebGL Engineering Calculators (Municipal Solar & LED ROI, Grid Simultaneity, Season 2027 AC Rental).

## Quality, Themes & Localization
- **Default Profile**: Bright SolarSync studio daylight (`Light`) + `HD` PBR lighting (`RoomEnvironment` + soft shadows + warm interior glow).
- **Additional Profiles**: `Dark` (warm obsidian glass), `Eco PC` (zero-blur / zero-shadow compositor mode), and `Clay` low-PC 3D maquette mode.
- **Languages**: `EN` (default), `FR`, `RU`, `BG`, `RO`.
