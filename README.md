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
|   |-- physio_sessions.db
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

### Backend

Use Python 3.10 or 3.13. For deployment on Render, Python 3.10 is recommended for TensorFlow 2.13 compatibility.

```powershell
cd backend
python -m venv .venv
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

Before starting, ensure you have a `.env` file in the `frontend` directory with your Firebase configuration.

## Deployment

- **Backend**: Hosted on Render at [https://physiotracker-backend.onrender.com](https://physiotracker-backend.onrender.com)
- **Frontend**: Hosted on Vercel at [https://physiotherapy-frotend.vercel.app](https://physiotherapy-frotend.vercel.app)

## Current Behavior

- **Model Loading**: The backend resolves model files from `backend/model` using absolute paths.
- **Persistence**: Session history is persisted in a local **SQLite database** (`physio_sessions.db`).
- **Feature Alignment**: The system uses raw landmarks (33 points) for the BiLSTM classifier to match the original training data distribution.
- **Environment Variables**: Firebase configuration and API base URLs are managed via environment variables.
- **Authentication**: Supports both Google Sign-In and traditional Email/Password accounts.
- **Debugging**: Backend includes a global error handler for detailed production traceback reporting.
- **MediaPipe**: Pose detection assets load from the jsDelivr CDN at runtime.
- **Repetition Counting**: Follows the user-selected exercise flow, ensuring stability even with noisy classifier predictions.

## Documentation

- Root overview: [README.md](README.md)
- Backend details: [backend/README.md](backend/README.md)
- Frontend details: [frontend/README.md](frontend/README.md)
- Audit and repair log: [CHANGELOG_AUDIT.md](CHANGELOG_AUDIT.md)

## Follow-Up Improvements

- Add automated API and UI tests for the webcam and prediction flow.
- Refresh the frontend dependency stack to address remaining `npm audit` vulnerabilities.
- Implement more complex form analysis (e.g., velocity tracking, ROM depth analysis).
