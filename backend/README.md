# Backend

This backend is a Flask API for:

- Loading the trained exercise classification model
- Predicting exercises from joint-angle input
- Tracking reps and movement phase
- Logging user sessions in memory

## Files

- [app.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/app.py): main Flask application and API routes
- [run.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/run.py): startup entrypoint
- [pose_utils.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/pose_utils.py): helper functions for pose-angle processing
- [requirements.txt](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/requirements.txt): Python dependencies

## Setup

Use Python 3.10:

```powershell
cd backend
py -3.10 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The service starts on `http://localhost:5000`.

## API Routes

- `GET /health`
- `GET /exercises`
- `POST /predict`
- `POST /reset_session`
- `POST /log_session`
- `GET /sessions/<user_id>`
- `GET /sessions`

## Notes

- Model files are expected in `backend/model`.
- The backend now uses project-relative path resolution, so it is no longer tied to one local machine.
- Session storage is in-memory only.
