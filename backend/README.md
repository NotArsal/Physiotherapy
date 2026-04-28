# Backend

This backend is a Flask API for:

- Loading the trained exercise classification model
- Predicting exercises from raw landmarks and joint-angle input
- Tracking reps and movement phase
- Persisting user sessions in a SQLite database

## Files

- [app.py](app.py): main Flask application and API routes
- [run.py](run.py): startup entrypoint
- [pose_utils.py](pose_utils.py): helper functions for pose-angle processing
- [requirements.txt](requirements.txt): Python dependencies
- [physio_sessions.db](physio_sessions.db): SQLite database for session storage

## Setup

Use Python 3.10 for the best compatibility with TensorFlow 2.13:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The service starts on `http://localhost:5000`.

## API Routes

- `GET /`: API status and welcome message
- `GET /health`: Health check with model and DB status
- `GET /exercises`: List available exercises
- `POST /predict`: Predict exercise from raw landmarks and angles
- `POST /reset_session`: Reset the current rep counter
- `POST /log_session`: Save a completed session to the database
- `GET /sessions/<user_id>`: Retrieve session history for a specific user
- `GET /sessions`: Retrieve all logged sessions

## Notes

- **Feature Alignment**: The classifier now receives raw landmarks (33 points) to match the original training data, significantly improving prediction accuracy.
- **Database**: Sessions are stored in `physio_sessions.db`. If the file doesn't exist, it is created automatically on startup.
- **CORS**: Configured to allow requests from the Vercel frontend and localhost.
- **Rep Counting**: Thresholds are defined in `detect_exercise_phase` and are tailored to specific joint angles per exercise.
