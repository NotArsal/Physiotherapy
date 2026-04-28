# Frontend

This frontend is a React + TypeScript app for:

- User authentication with Firebase
- Exercise selection
- Webcam-based pose monitoring
- Real-time rep and phase feedback
- Session dashboard and debug tooling

## Setup

```powershell
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000`.

## Environment

The frontend uses `REACT_APP_API_BASE_URL` when provided. If unset, it defaults to `http://localhost:5000`.

Example:

```powershell
$env:REACT_APP_API_BASE_URL="http://localhost:5000"
npm start
```

## Main Areas

- [src/App.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/App.tsx): app shell and navigation
- [src/components/ExerciseSelector.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseSelector.tsx): exercise browser
- [src/components/ExerciseMonitor.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseMonitor.tsx): live monitoring screen
- [src/components/Dashboard.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/Dashboard.tsx): analytics view
- [src/components/MediaPipeDebug.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/MediaPipeDebug.tsx): pose-debug page
- [src/services/api.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/services/api.ts): API client
- [src/firebase.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/firebase.ts): Firebase bootstrapping

## Notes

- MediaPipe assets are loaded from a CDN during runtime.
- Firebase authentication depends on the config currently committed in `src/firebase.ts`.
- The frontend build was validated successfully after the audit fixes.
