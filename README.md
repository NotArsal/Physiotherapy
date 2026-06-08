# PhysioTracker

PhysioTracker is a full-stack physiotherapy exercise monitoring system with a Flask backend, a React + TypeScript frontend, browser-side MediaPipe pose detection, MongoDB Atlas for persistence, and Firebase authentication.

## Structure

```text
Physiotherapy-project-main/
|-- backend/
|   |-- app.py
|   |-- run.py
|   `-- requirements.txt
|-- frontend/
|   |-- package.json
|   |-- tsconfig.json
|   |-- public/
|   `-- src/
|-- docs/
|   `-- system_architecture_diagrams.md
|-- CHANGELOG_AUDIT.md
`-- README.md
```

## Quick Start

### Backend

The backend now acts purely as a stateless MongoDB session logger.

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend starts on `http://localhost:5000` (or the default Render port).

### Frontend

```powershell
cd frontend
npm install
npm start
```

The frontend starts on `http://localhost:3000`.

Before starting, ensure you have a `.env` file in the `frontend` directory with your Firebase configuration.

## Deployment

- **Backend**: Hosted on Render at [https://physiotherapy-backend-gw5s.onrender.com](https://physiotherapy-backend-gw5s.onrender.com)
- **Frontend**: Hosted on Vercel at [https://physiotherapy-frontend.vercel.app](https://physiotherapy-frontend.vercel.app)
- **Database**: Hosted on MongoDB Atlas.

## Current Behavior & Advanced Features

- **Zero-Latency Edge AI Inference**: Deep learning classification (BiLSTM) is executed entirely within the browser via **TensorFlow.js (WebGL)**, eliminating backend network latency and massive RAM usage.
- **Ambient Fall Detection**: Optical, zero-wearable safety monitoring that calculates $dy/dt$ nose drop velocity combined with 33-point bounding box horizontal aspect ratio collapse to detect medical emergencies. Includes a 10-second therapist alert protocol.
- **Adaptive Hysteresis-Based Form Tracking**: Incorporates a 10-second mandatory calibration phase to calculate personal ROM baselines. Uses an Exponential Moving Average (EMA) and dual-threshold state machine to guarantee true repetition counts.
- **Virtual Lower-Body Landmark Imputation**: For close-up or seated views, the frontend dynamically imputes neutral standing leg coordinates scaled to the shoulders via bi-acromial measurement, keeping classification accuracy exceptionally high (>80%).
- **Fatigue & Asymmetry Detection**: Automatically monitors repetition velocity degradation (>30% slowdown) and tracks left-right joint angular variance (e.g., uneven elbow angles) to ensure biomechanical symmetry.
- **Persistence**: Session history and clinical protocols are persisted via **MongoDB Atlas** (replacing the legacy SQLite setup).
- **Intelligent API Fallback**: The frontend automatically detects remote backend timeouts and seamlessly falls back to a healthy local backend (`http://localhost:5000`) if available.
- **Performance**: Utilizes optimized React state rendering and Web Speech API throttling to maintain a perfect 30 FPS inference loop in the browser without UI stuttering.

## Documentation

- Root overview: [README.md](README.md)
- Backend details: [backend/README.md](backend/README.md)
- Frontend details: [frontend/README.md](frontend/README.md)
- Patent Claims & Architecture: [docs/system_architecture_diagrams.md](docs/system_architecture_diagrams.md)

## Follow-Up Improvements

- Add automated API and UI tests for the webcam and prediction flow.
- Build the final Therapist Dashboard to close the prescription loop.
