# Audit And Repair Log

This file records the system audit, fixes, cleanup, and follow-up recommendations applied to this project.

## Completed Changes

- Audited backend and frontend structure, dependencies, and integration points.
- Removed broken checked-in virtual environments and generated cache/build artifacts.
- Cleaned backend dependencies in [backend/requirements.txt](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/requirements.txt).
- Reworked backend model loading to use project-relative absolute paths in [backend/app.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/app.py).
- Hardened backend request validation and response behavior for `/predict` and session routes.
- Replaced random feature generation in backend prediction preprocessing with deterministic input shaping.
- Updated [backend/run.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/run.py) so startup is more portable.
- Fixed frontend API base URL handling in [frontend/src/services/api.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/services/api.ts).
- Removed duplicate Firebase config and made analytics initialization safer in [frontend/src/firebase.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/firebase.ts).
- Fixed exercise-name inconsistencies in [frontend/src/components/ExerciseSelector.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseSelector.tsx).
- Refined dashboard period filtering and data summarization in [frontend/src/components/Dashboard.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/Dashboard.tsx).
- Cleaned monitoring and debug flows in [frontend/src/components/ExerciseMonitor.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseMonitor.tsx) and [frontend/src/components/MediaPipeDebug.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/MediaPipeDebug.tsx).
- Updated rep counting in [backend/app.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/app.py) so selected-exercise sessions can keep counting even when classifier confidence is low or the predicted exercise label is noisy.
- Added explicit webcam stream shutdown and more stable MediaPipe lifecycle handling in [frontend/src/components/ExerciseMonitor.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseMonitor.tsx) and [frontend/src/components/MediaPipeDebug.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/MediaPipeDebug.tsx).
- Removed the stale `@mediapipe/camera_utils` runtime dependency and simplified [frontend/src/utils/poseDetection.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/utils/poseDetection.ts) to match the current frontend architecture.
- Hardened [backend/pose_utils.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/pose_utils.py) against zero-length angle calculations.
- Updated documentation and ignore rules to reflect the actual current repo state.
- Implemented SQLite session persistence in [backend/app.py](C:/Users/shada/Desktop/Physiotherapy-project-main/backend/app.py) to replace in-memory storage.
- Aligned backend model input features with the original training data distribution by adding support for raw landmarks.
- Updated frontend [frontend/src/services/api.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/services/api.ts) and [frontend/src/components/ExerciseMonitor.tsx](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/components/ExerciseMonitor.tsx) to send raw landmarks for higher prediction accuracy.
- Moved Firebase configuration to environment variables in [frontend/.env](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/.env) and updated [frontend/src/firebase.ts](C:/Users/shada/Desktop/Physiotherapy-project-main/frontend/src/firebase.ts).
- Added a root route (`/`) to the backend to provide a status message and prevent 404 logs during deployment health checks.
- Implemented a **Global Error Handler** (`@app.errorhandler(500)`) in the backend to provide detailed JSON tracebacks for production debugging.
- Added **Email/Password Authentication** alongside Google Sign-In, including registration and password reset support.
- Implemented a **Stateless Backend Architecture** in [backend/app.py](backend/app.py) to support production scaling (Gunicorn multi-worker).
- Migrated repetition counting and exercise phase detection logic to the frontend [frontend/src/utils/poseDetection.ts](frontend/src/utils/poseDetection.ts).
- Integrated `localStorage` caching in the frontend to mitigate Render backend cold starts.
- Implemented **Hysteresis-based counting** for robust repetition detection across different body types.
- Fixed anatomical angle mapping (Shoulder vs Elbow) to ensure accurate classification.
- Resolved a critical `NameError` in the backend `/predict` endpoint.
- Fixed a TypeScript `setLoading` reference error in `ExerciseMonitor.tsx` to unblock Vercel builds.
- Integrated **Virtual Lower-Body Landmark Imputation** in the backend (`build_model_input` in [backend/app.py](backend/app.py)) to dynamically reconstruct neutral legs when hips/knees/ankles are out-of-frame, preserving upper-body classifier accuracy.
- Added **Exercise-Aware Rejection Bypass** in the backend `/predict` endpoint to prevent "Poor pose detection" errors during upper-body and posture exercises.
- Upgraded the frontend [frontend/src/components/ExerciseMonitor.tsx](frontend/src/components/ExerciseMonitor.tsx) to maintain and send a **True Temporal 30-Frame Rolling Window Buffer** to the backend, enabling true motion sequence classification rather than static tiled frames.
- Implemented **Biomechanical Posture Correction Checks** in [frontend/src/utils/poseDetection.ts](frontend/src/utils/poseDetection.ts) for Forward Head Carriage (horizontal ear-to-shoulder offset) and Slouching (vertical head drop ratio) with live visual and vocal feedback warnings.
- Added comprehensive **Exercise Form & Range-of-Motion (ROM) Correction Rules** in [frontend/src/utils/poseDetection.ts](frontend/src/utils/poseDetection.ts) to correct the execution of multiple exercises in real-time:
  * **Biceps Curls**: Detects elbow swing/cheating using shoulders (shoulder angle > 40°).
  * **Shoulder Press**: Detects asymmetric arm extension (delta > 25°) and incomplete lockouts (overhead angle < 130°).
  * **Push-Ups & Bench Press**: Detects elbow flaring (shoulder angle > 85°) to protect rotator cuffs.
  * **Straight Leg Raise**: Detects legs raised too high (hip angle < 125° / > 55°) to prevent lower back strain.
  * **Glute Bridge**: Detects lower back hyperextension/arching (spine angle > 25°).
  * **Bird Dog**: Detects over-extended vertical leg kicks to maintain a neutral horizontal posture.
- Structured clean session lifecycle handlers in the frontend to clear the temporal buffer upon starting and stopping exercise sessions.
- Resolved TypeScript compiler warnings by removing the unused `earMidY` variable.
- Verified backend end-to-end API suite (`test_api.py`) and compiled an optimized production build of the frontend with zero errors.

## Removed Unnecessary Files

- Root checked-in `venv`
- `backend/venv`
- `backend/__pycache__`
- `frontend/node_modules`
- `frontend/build`
- unused duplicate `frontend/src/firebase/config.ts`
- unused CRA boilerplate files including `frontend/src/App.css`, `frontend/src/logo.svg`, and the old `frontend/README.md`

## Verification Performed

- Frontend `npm run build` completed successfully after fixes.
- Backend `python -m py_compile app.py run.py pose_utils.py` passed.
- Backend model loading and API smoke tests passed in a fresh Python 3.10 virtual environment.
- Backend rep-count smoke test passed: a selected `squat` session moved from `down` to `up` and incremented reps from `0` to `1` across two `/predict` calls.

## Remaining Recommendations



- Add automated tests for API routes, authentication flow, and live monitoring flow.

- Gradually modernize the CRA-based frontend dependency tree to address the remaining `npm audit` vulnerabilities.
