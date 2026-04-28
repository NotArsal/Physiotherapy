# PhysioTracker

PhysioTracker is a full-stack physiotherapy exercise monitoring system with a Flask backend, a React + TypeScript frontend, browser-side MediaPipe pose detection, and Firebase authentication.

## Structure

```text
Physiotherapy-project-main/
|-- backend/
|   |-- README.md
|   |-- app.py
|   |-- run.py
|   |-- pose_utils.py
|   |-- requirements.txt
|   `-- model/
|-- frontend/
|   |-- README.md
|   |-- package.json
|   |-- tsconfig.json
|   |-- public/
|   `-- src/
|-- CHANGELOG_AUDIT.md
|-- .gitignore
`-- README.md
```

## Quick Start

Use Python 3.10 for backend setup because the TensorFlow dependency in this project is pinned for that runtime.

### Backend

```powershell
cd backend
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend starts on `http://localhost:5000`.

### Frontend

```powershell
cd frontend
npm install
npm start
```

The frontend starts on `http://localhost:3000`.

If the API is hosted on a different port, set the frontend API base URL before `npm start`:

```powershell
$env:REACT_APP_API_BASE_URL="http://localhost:5001"
```

## Validation

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend syntax validation:

```powershell
cd backend
python -m py_compile app.py run.py pose_utils.py
```

## Current Behavior

- The backend resolves model files from `backend/model` using absolute paths relative to [backend/app.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/app.py).
- Session history is stored in memory, so data resets when the backend restarts.
- Firebase config is defined in [frontend/src/firebase.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/firebase.ts).
- MediaPipe pose assets load from the jsDelivr CDN at runtime.
- Repetition counting now follows the user-selected exercise flow, so rep detection can continue even when the classifier confidence is low.
- The live monitor and debug views now keep tighter control over MediaPipe and webcam cleanup to reduce repeated WebGL/context churn.

## Documentation

- Root overview: [README.md](C:/Users/shada/Desktop/Physiotherapy-project-main/README.md)
- Backend details: [backend/README.md](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/README.md)
- Frontend details: [frontend/README.md](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/README.md)
- Audit and repair log: [CHANGELOG_AUDIT.md](C:/Users/shada/Desktop/Physiotherapy-project-main/CHANGELOG_AUDIT.md)

## Follow-Up Improvements

- Persist session history in a real database instead of process memory.
- Move Firebase configuration to environment variables for safer deployment.
- Add automated API and UI tests for the webcam and prediction flow.
- Replace the current feature-engineering bridge with preprocessing that matches the original model training pipeline exactly.
- Refresh the frontend dependency stack over time; the current CRA-based tree still reports known audit vulnerabilities.
