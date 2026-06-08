# Backend

This backend is a Flask API for:

- Loading the trained exercise classification BiLSTM model
- Predicting exercises from raw 33 landmarks
- Tracking reps and movement phase via dynamic thresholds
- Persisting user sessions in MongoDB Atlas

## Files

- [app.py](app.py): main Flask application, CORS setup, and API routes
- [run.py](run.py): startup entrypoint
- [pose_utils.py](pose_utils.py): helper functions for pose-angle processing and virtual imputation
- [requirements.txt](requirements.txt): Python dependencies

## Setup

Use Python 3.10 for the best compatibility with TensorFlow 2.13:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Set the `MONGO_URI` environment variable before running to connect to the cloud database.

## API Routes

- `GET /`: API status and welcome message
- `GET /health`: Health check with model and MongoDB Atlas status
- `GET /exercises`: List available exercises
- `POST /predict`: Predict exercise from raw landmarks and angles
- `POST /reset_session`: Reset the current rep counter
- `POST /log_session`: Save a completed session to MongoDB Atlas
- `GET /sessions/<user_id>`: Retrieve session history for a specific user
- `GET /sessions`: Retrieve all logged sessions
- `GET /protocols`: Retrieve clinical exercise protocols

## Notes

- **Feature Alignment**: The classifier receives raw landmarks (33 points) to match the original training data, significantly improving prediction accuracy.
- **Database**: Sessions and default clinical protocols are stored securely in **MongoDB Atlas** using `pymongo`. 
- **CORS**: Robustly configured to allow requests from the Vercel frontend, supporting dynamic URL resolution and wildcard regex mapping.
- **Imputation Logic**: Located in `pose_utils.py`, it leverages Bi-acromial distance scaling to impute missing lower-body joints on camera crops.
