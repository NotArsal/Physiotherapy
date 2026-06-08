# Frontend

This frontend is a React + TypeScript app for:

- User authentication with Firebase
- Browser-side Pose Monitoring using MediaPipe
- Adaptive Calibration & Fall Detection
- Real-time repetition and safety feedback via Web Speech API
- Session dashboard and analytics

## Setup

```powershell
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000`.

## Environment Variables

Create a `.env` file in the root of the `frontend` directory:

```env
REACT_APP_API_BASE_URL=https://physiotherapy-backend-gw5s.onrender.com
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Main Components

- [src/components/ExerciseMonitor.tsx](src/components/ExerciseMonitor.tsx): Core component housing MediaPipe integration, Fall Detection, Asymmetry Tracking, and audio throttling.
- [src/utils/poseDetection.ts](src/utils/poseDetection.ts): Houses the advanced biomechanical mathematics, $dy/dt$ calculations, aspect ratio calculations, and hysteresis logic.
- [src/components/Dashboard.tsx](src/components/Dashboard.tsx): View session history fetched from MongoDB.
- [src/services/api.ts](src/services/api.ts): Communication with the Flask backend.

## Technical Notes

- **Emergency Fall Detection**: Analyzes velocity and Y-collapse dynamically at 30fps. Automatically triggers a UI lock and 10-second emergency therapist notification timer.
- **Performance Optimized**: `ExerciseMonitor.tsx` utilizes React `useRef` to bypass the 30fps state-update loop, rendering direct to the HTML5 canvas without causing DOM thrashing.
- **Audio Coaching Throttling**: The Web Speech API triggers are governed by strict 3.0s and 4.5s cooldown loops, utilizing `speechSynthesis.cancel()` to prevent browser queue crashing.
- **Intelligent API Fallback**: In `src/services/api.ts`, the frontend automatically attempts to connect to `http://localhost:5000` if the remote Render API times out due to cold starts.
- **Hosting**: Deployed on Vercel with automated CI/CD.
