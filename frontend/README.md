# Frontend

This frontend is a React + TypeScript app for:

- User authentication with Firebase
- Exercise selection
- Webcam-based pose monitoring using MediaPipe
- Real-time rep and phase feedback
- Session dashboard and analytics

## Setup

```powershell
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000`.

## Environment Variables

The frontend relies on environment variables for API and Firebase configuration. Create a `.env` file in the root of the `frontend` directory:

```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Main Components

- [src/components/ExerciseMonitor.tsx](src/components/ExerciseMonitor.tsx): Live monitoring with MediaPipe integration.
- [src/components/Dashboard.tsx](src/components/Dashboard.tsx): View session history and progress.
- [src/services/api.ts](src/services/api.ts): Communication with the Flask backend.
- [src/firebase.ts](src/firebase.ts): Firebase initialization using environment variables.

## Technical Notes

- **Pose Detection**: Uses MediaPipe Pose (Task API) loaded via CDN.
- **Intelligent API Fallback**: In `src/services/api.ts`, the frontend automatically attempts to connect to `http://localhost:5000` if the remote Render API times out due to cold starts.
- **Clinical Exercises**: Includes a customized Therapist Portal and tailored UI for 5 new clinical physiotherapy exercises.
- **Feature Alignment**: The monitor now sends raw landmarks to the backend for improved BiLSTM classification.
- **Cleanup**: Implementation includes explicit webcam and MediaPipe context cleanup to prevent memory leaks during exercise transitions.
- **Hosting**: Deployed on Vercel with automated CI/CD.
