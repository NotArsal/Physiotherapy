import os
import pickle
import sqlite3
import re
from datetime import datetime
from pathlib import Path
import json

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import LSTM as KerasLSTM
import keras

@keras.saving.register_keras_serializable(package="app", name="LSTM")
class LSTM(KerasLSTM):
    def __init__(self, *args, **kwargs):
        kwargs.pop('time_major', None)
        super().__init__(*args, **kwargs)

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "bilstm_exercise_classifier.h5"
LABEL_ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"
DATABASE_PATH = BASE_DIR / "physio_sessions.db"
DATABASE_URL = os.getenv("DATABASE_URL") # Support for managed Postgres (Render/Heroku)

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://physiotherapy-frontend.vercel.app",
    "https://physiotherapy-frotend.vercel.app",
]
frontend_env = os.getenv("FRONTEND_URL")
if frontend_env:
    # Ensure whitespace is trimmed and trailing slashes are stripped
    frontend_env_clean = frontend_env.strip().rstrip("/")
    if frontend_env_clean and frontend_env_clean not in allowed_origins:
        allowed_origins.append(frontend_env_clean)

# Initialize standard Flask-CORS as primary handler for all resources
CORS(
    app,
    resources={r"/*": {
        "origins": allowed_origins + [re.compile(r"^https://.*\.vercel\.app$")],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Access-Control-Allow-Origin"]
    }},
    supports_credentials=True
)

# Custom robust preflight request handler to catch any edge cases or preflight failures
@app.before_request
def handle_options_preflight():
    if request.method == "OPTIONS":
        from flask import make_response
        response = make_response()
        response.status_code = 204
        
        origin = request.headers.get("Origin")
        if origin:
            origin_lower = origin.lower()
            if origin in allowed_origins or "vercel.app" in origin_lower or "localhost" in origin_lower or "127.0.0.1" in origin_lower:
                response.headers.pop("Access-Control-Allow-Origin", None)
                response.headers.pop("Access-Control-Allow-Credentials", None)
                response.headers.pop("Access-Control-Allow-Headers", None)
                response.headers.pop("Access-Control-Allow-Methods", None)
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
                response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response

# Custom post-request hook to guarantee CORS headers on all HTTP responses, including 500 error responses
@app.after_request
def inject_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin:
        origin_lower = origin.lower()
        if origin in allowed_origins or "vercel.app" in origin_lower or "localhost" in origin_lower or "127.0.0.1" in origin_lower:
            response.headers.pop("Access-Control-Allow-Origin", None)
            response.headers.pop("Access-Control-Allow-Credentials", None)
            response.headers.pop("Access-Control-Allow-Headers", None)
            response.headers.pop("Access-Control-Allow-Methods", None)
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response

model = None
label_encoder = None

# Stateless backend - current_exercise_state removed to support multi-worker environments

def init_db():
    if DATABASE_URL:
        # PostgreSQL Logic
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    exercise TEXT NOT NULL,
                    total_reps INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    session_data TEXT
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS protocols (
                    user_id TEXT NOT NULL,
                    exercise TEXT NOT NULL,
                    target_reps INTEGER NOT NULL DEFAULT 10,
                    safe_spine_angle REAL NOT NULL DEFAULT 30.0,
                    safe_knee_angle REAL NOT NULL DEFAULT 90.0,
                    safety_sensitivity TEXT NOT NULL DEFAULT 'medium',
                    PRIMARY KEY (user_id, exercise)
                )
            ''')
            # Seed default protocols
            default_protocols = [
                ('default', 'squat', 10, 30.0, 90.0, 'medium'),
                ('default', 'deadlift', 10, 25.0, 110.0, 'medium'),
                ('default', 'push_up', 10, 15.0, 90.0, 'medium'),
                ('default', 'barbell_biceps_curl', 12, 15.0, 150.0, 'medium'),
                ('default', 'shoulder_press', 10, 20.0, 140.0, 'medium'),
                ('default', 'plank', 1, 10.0, 180.0, 'medium'),
                ('default', 'leg_raises', 15, 15.0, 100.0, 'medium'),
                ('default', 'russian_twist', 20, 30.0, 90.0, 'medium'),
                ('default', 'glute_bridge', 10, 15.0, 90.0, 'medium'),
                ('default', 'clamshell', 12, 10.0, 90.0, 'medium'),
                ('default', 'bird_dog', 10, 15.0, 90.0, 'medium'),
                ('default', 'wall_slide', 10, 15.0, 140.0, 'medium'),
                ('default', 'straight_leg_raise', 12, 15.0, 160.0, 'medium'),
            ]
            for p in default_protocols:
                try:
                    cursor.execute('''
                        INSERT INTO protocols (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, exercise) DO NOTHING
                    ''', p)
                except Exception as e:
                    print(f"Error seeding PostgreSQL protocol: {e}")
            conn.commit()
            conn.close()
            print("PostgreSQL database and protocols initialized")
            return
        except ImportError:
            print("psycopg2 not found. Falling back to SQLite.")
        except Exception as e:
            print(f"PostgreSQL init failed: {e}. Falling back to SQLite.")

    # SQLite Fallback with a high timeout to prevent locks in concurrent startups
    conn = sqlite3.connect(DATABASE_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            exercise TEXT NOT NULL,
            total_reps INTEGER NOT NULL,
            duration INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            session_data TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS protocols (
            user_id TEXT NOT NULL,
            exercise TEXT NOT NULL,
            target_reps INTEGER NOT NULL DEFAULT 10,
            safe_spine_angle REAL NOT NULL DEFAULT 30.0,
            safe_knee_angle REAL NOT NULL DEFAULT 90.0,
            safety_sensitivity TEXT NOT NULL DEFAULT 'medium',
            PRIMARY KEY (user_id, exercise)
        )
    ''')
    # Seed defaults in SQLite
    default_protocols = [
        ('default', 'squat', 10, 30.0, 90.0, 'medium'),
        ('default', 'deadlift', 10, 25.0, 110.0, 'medium'),
        ('default', 'push_up', 10, 15.0, 90.0, 'medium'),
        ('default', 'barbell_biceps_curl', 12, 15.0, 150.0, 'medium'),
        ('default', 'shoulder_press', 10, 20.0, 140.0, 'medium'),
        ('default', 'plank', 1, 10.0, 180.0, 'medium'),
        ('default', 'leg_raises', 15, 15.0, 100.0, 'medium'),
        ('default', 'russian_twist', 20, 30.0, 90.0, 'medium'),
        ('default', 'glute_bridge', 10, 15.0, 90.0, 'medium'),
        ('default', 'clamshell', 12, 10.0, 90.0, 'medium'),
        ('default', 'bird_dog', 10, 15.0, 90.0, 'medium'),
        ('default', 'wall_slide', 10, 15.0, 140.0, 'medium'),
        ('default', 'straight_leg_raise', 12, 15.0, 160.0, 'medium'),
    ]
    for p in default_protocols:
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO protocols (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', p)
        except Exception as e:
            print(f"Error seeding SQLite protocol: {e}")
    conn.commit()
    conn.close()
    print(f"SQLite database and protocols initialized at {DATABASE_PATH}")

def get_db_connection():
    if DATABASE_URL:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(DATABASE_URL)
    # Add an extended timeout to SQLite to prevent "database is locked" errors in concurrent environments
    conn = sqlite3.connect(DATABASE_PATH, timeout=30)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    return conn

def load_models():
    """Load the trained model artifacts from the backend/model directory."""
    global model, label_encoder

    try:
        model = load_model(MODEL_PATH, custom_objects={'LSTM': LSTM})
        with open(LABEL_ENCODER_PATH, "rb") as file:
            label_encoder = pickle.load(file)
        print("BiLSTM model loaded successfully")
        print(f"Available exercises: {list(label_encoder.classes_)}")
        return True
    except Exception as exc:
        print(f"Error loading models: {exc}")
        import traceback
        traceback.print_exc()
        return False


# Global cache for latency optimization in real-time inference
_TIME_SCALE_CACHE = np.linspace(0.98, 1.02, 30, dtype=np.float32).reshape(30, 1)

def build_model_input(joint_angles, landmarks=None, selected_exercise=None):
    """
    Create deterministic time-series input for the BiLSTM model using raw landmarks.
    The model expects 33 landmarks (x, y, visibility) totaling 99 features.
    Supports either:
    1. A single frame of landmarks (represented as a list of 33 landmarks) -> tiles to 30 timesteps.
    2. A sequence of historical frames (represented as a list of lists of landmarks) -> uses true temporal motion.
    If leg landmarks are out of frame (low visibility), dynamically imputes a neutral
    standing posture under the shoulders to preserve upper-body exercise classification accuracy.
    If arm landmarks are out of frame, dynamically projects expected arm postures based on selected_exercise.
    """
    import math
    if not landmarks or len(landmarks) == 0:
        raise ValueError("Raw MediaPipe landmarks are required for accurate inference")

    # Helper to safely extract x, y, and visibility
    def get_lm_data(lm):
        if isinstance(lm, dict):
            return float(lm.get('x', 0.0)), float(lm.get('y', 0.0)), float(lm.get('visibility', 0.0))
        elif isinstance(lm, (list, tuple)) and len(lm) >= 3:
            return float(lm[0]), float(lm[1]), float(lm[2])
        return 0.0, 0.0, 0.0

    def flatten_and_impute_frame(frame_landmarks):
        if not frame_landmarks or len(frame_landmarks) < 33:
            return np.zeros(99, dtype=np.float32)

        # Create a mutable copy of landmarks
        imputed_frame = list(frame_landmarks)

        # Fetch shoulder positions to determine body scale and horizontal position
        ls_x, ls_y, ls_v = get_lm_data(frame_landmarks[11]) # Left Shoulder
        rs_x, rs_y, rs_v = get_lm_data(frame_landmarks[12]) # Right Shoulder

        # Calculate shoulder width for scaling, or use sensible default if not fully visible
        if ls_v > 0.5 and rs_v > 0.5:
            shoulder_width = math.sqrt((rs_x - ls_x)**2 + (rs_y - ls_y)**2)
        else:
            shoulder_width = 0.20 # screen ratio default

        # Check visibility of key lower-body joints: Hips (23, 24), Knees (25, 26), Ankles (27, 28)
        lower_body_key_indices = [23, 24, 25, 26, 27, 28]
        low_visibility_count = sum(1 for idx in lower_body_key_indices if get_lm_data(frame_landmarks[idx])[2] < 0.5)

        # If lower body is mostly occluded (e.g. seated/close camera view), impute neutral standing alignment
        if low_visibility_count >= 2:
            # Hips directly below shoulders, knees and ankles directly below hips
            hip_y = max(ls_y, rs_y) + 1.2 * shoulder_width
            knee_y = hip_y + 1.5 * shoulder_width
            ankle_y = knee_y + 1.5 * shoulder_width
            heel_y = ankle_y + 0.1 * shoulder_width
            toe_y = ankle_y + 0.2 * shoulder_width

            imputations = {
                23: (ls_x, hip_y, 1.0),       # Left Hip
                24: (rs_x, hip_y, 1.0),       # Right Hip
                25: (ls_x, knee_y, 1.0),      # Left Knee
                26: (rs_x, knee_y, 1.0),      # Right Knee
                27: (ls_x, ankle_y, 1.0),     # Left Ankle
                28: (rs_x, ankle_y, 1.0),     # Right Ankle
                29: (ls_x, heel_y, 1.0),      # Left Heel
                30: (rs_x, heel_y, 1.0),      # Right Heel
                31: (ls_x - 0.05, toe_y, 1.0),# Left Toe
                32: (rs_x + 0.05, toe_y, 1.0),# Right Toe
            }

            for idx, (x, y, v) in imputations.items():
                if idx < len(imputed_frame):
                    if isinstance(imputed_frame[idx], dict):
                        imputed_frame[idx] = {
                            'x': x,
                            'y': y,
                            'z': imputed_frame[idx].get('z', 0.0),
                            'visibility': v
                        }
                    else:
                        imputed_frame[idx] = [x, y, 0.0, v]

        # ----------------------------------------------------
        # DYNAMIC UPPER-BODY IMPUTATION FOR CLOSE-UP OCCLUSION
        # ----------------------------------------------------
        exercise_key = normalize_exercise_name(selected_exercise)
        
        # Check upper-body landmarks visibility: Elbows (13, 14), Wrists (15, 16)
        le_x, le_y, le_v = get_lm_data(frame_landmarks[13])
        re_x, re_y, re_v = get_lm_data(frame_landmarks[14])
        lw_x, lw_y, lw_v = get_lm_data(frame_landmarks[15])
        rw_x, rw_y, rw_v = get_lm_data(frame_landmarks[16])

        upper_body_imputations = {}

        if exercise_key in ["lat_pulldown", "pull_up", "shoulder_press", "wall_slide"]:
            # Overhead exercises - project hands/elbows overhead if occluded
            if lw_v < 0.4:
                upper_body_imputations[15] = (ls_x, ls_y - 1.5 * shoulder_width, 1.0)
            if rw_v < 0.4:
                upper_body_imputations[16] = (rs_x, rs_y - 1.5 * shoulder_width, 1.0)
            if le_v < 0.4:
                upper_body_imputations[13] = (ls_x - 0.2 * shoulder_width, ls_y - 0.7 * shoulder_width, 1.0)
            if re_v < 0.4:
                upper_body_imputations[14] = (rs_x + 0.2 * shoulder_width, rs_y - 0.7 * shoulder_width, 1.0)

        elif exercise_key in ["barbell_biceps_curl", "hammer_curl", "biceps_curl"]:
            # Biceps curls - project hands/elbows at chest/side level if occluded
            if lw_v < 0.4:
                upper_body_imputations[15] = (ls_x, ls_y + 0.3 * shoulder_width, 1.0)
            if rw_v < 0.4:
                upper_body_imputations[16] = (rs_x, rs_y + 0.3 * shoulder_width, 1.0)
            if le_v < 0.4:
                upper_body_imputations[13] = (ls_x, ls_y + 0.8 * shoulder_width, 1.0)
            if re_v < 0.4:
                upper_body_imputations[14] = (rs_x, rs_y + 0.8 * shoulder_width, 1.0)

        elif exercise_key in ["bench_press", "incline_bench_press", "decline_bench_press", "push_up", "chest_fly_machine"]:
            # Pressing exercises - project hands/elbows forward/outward if occluded
            if lw_v < 0.4:
                upper_body_imputations[15] = (ls_x - 0.5 * shoulder_width, ls_y + 0.5 * shoulder_width, 1.0)
            if rw_v < 0.4:
                upper_body_imputations[16] = (rs_x + 0.5 * shoulder_width, rs_y + 0.5 * shoulder_width, 1.0)
            if le_v < 0.4:
                upper_body_imputations[13] = (ls_x - 0.7 * shoulder_width, ls_y + 0.6 * shoulder_width, 1.0)
            if re_v < 0.4:
                upper_body_imputations[14] = (rs_x + 0.7 * shoulder_width, rs_y + 0.6 * shoulder_width, 1.0)

        else:
            # Default for other exercises - if any arm joint is occluded, project down posture
            if lw_v < 0.4 or rw_v < 0.4 or le_v < 0.4 or re_v < 0.4:
                if lw_v < 0.4:
                    upper_body_imputations[15] = (ls_x, ls_y + 1.8 * shoulder_width, 1.0)
                if rw_v < 0.4:
                    upper_body_imputations[16] = (rs_x, rs_y + 1.8 * shoulder_width, 1.0)
                if le_v < 0.4:
                    upper_body_imputations[13] = (ls_x, ls_y + 1.0 * shoulder_width, 1.0)
                if re_v < 0.4:
                    upper_body_imputations[14] = (rs_x, rs_y + 1.0 * shoulder_width, 1.0)

        for idx, (x, y, v) in upper_body_imputations.items():
            if idx < len(imputed_frame):
                if isinstance(imputed_frame[idx], dict):
                    imputed_frame[idx] = {
                        'x': x,
                        'y': y,
                        'z': imputed_frame[idx].get('z', 0.0),
                        'visibility': v
                    }
                else:
                    imputed_frame[idx] = [x, y, 0.0, v]

        flat_landmarks = [
            val 
            for lm in imputed_frame[:33] 
            for val in get_lm_data(lm)
        ]
        
        feature_vector = np.array(flat_landmarks, dtype=np.float32)
        return np.pad(feature_vector, (0, max(0, 99 - feature_vector.size)))[:99]

    # Detect if we were sent a sequence of frames or a single frame
    is_sequence = False
    if isinstance(landmarks, list) and len(landmarks) > 0:
        first_el = landmarks[0]
        # Check if first element is a container representing landmarks (like a list/dict of 33 points)
        if isinstance(first_el, list) and len(first_el) >= 33:
            is_sequence = True
        elif isinstance(first_el, list) and len(first_el) > 0 and isinstance(first_el[0], (dict, list, tuple)):
            is_sequence = True

    processed_frames = []
    if is_sequence:
        for frame in landmarks:
            processed_frames.append(flatten_and_impute_frame(frame))
        
        # Ensure we have exactly 30 frames for the BiLSTM
        if len(processed_frames) < 30:
            # Pad by repeating the latest frame
            padding = [processed_frames[-1]] * (30 - len(processed_frames))
            processed_frames.extend(padding)
        elif len(processed_frames) > 30:
            # Take only the last 30 frames
            processed_frames = processed_frames[-30:]
        
        time_series = np.stack(processed_frames, axis=0)
    else:
        # Single frame mode - flatten and tile 30 times
        flat = flatten_and_impute_frame(landmarks)
        time_series = np.tile(flat, (30, 1))

    return (time_series * _TIME_SCALE_CACHE).reshape(1, 30, 99)


def normalize_exercise_name(exercise_name):
    """Normalize exercise names so frontend and backend labels can be compared safely."""
    if not exercise_name:
        return ""
    return str(exercise_name).strip().lower().replace("-", "_").replace(" ", "_")





@app.errorhandler(500)
def handle_internal_server_error(e):
    import traceback
    error_details = traceback.format_exc()
    print(f"Internal Server Error: {error_details}")
    return jsonify(
        {
            "error": str(e.original_exception) if hasattr(e, 'original_exception') else str(e),
            "type": "Internal Server Error",
            "traceback": error_details.split('\n')
        }
    ), 500


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "message": "PhysioTracker API is running",
            "docs": "https://github.com/NotArsal/Physiotherapy",
            "health_check": "/health"
        }
    )


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify(
        {
            "status": "healthy",
            "model_loaded": model is not None,
            "encoder_loaded": label_encoder is not None,
            "database": os.path.exists(DATABASE_PATH)
        }
    )


@app.route("/exercises", methods=["GET"])
def get_exercises():
    if label_encoder is None:
        return jsonify({"error": "Label encoder not loaded"}), 500

    # Get model-trained exercises
    exercises = list(label_encoder.classes_)
    
    # Append the new clinical physiotherapy exercises (without duplicates)
    physio_exercises = ['glute_bridge', 'clamshell', 'bird_dog', 'wall_slide', 'straight_leg_raise']
    for ex in physio_exercises:
        if ex not in exercises:
            exercises.append(ex)

    return jsonify({"exercises": exercises})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        if model is None or label_encoder is None:
            return jsonify({"error": "Model is not loaded"}), 503

        data = request.get_json(silent=True) or {}
        joint_angles = data.get("joint_angles", [])
        landmarks = data.get("landmarks", []) # New: raw landmarks for feature alignment
        selected_exercise = data.get("selected_exercise")

        if not isinstance(joint_angles, list) or not joint_angles:
            return jsonify({"error": "Invalid joint angles data"}), 400

        try:
            joint_angles = [float(angle) for angle in joint_angles]
        except (TypeError, ValueError):
            return jsonify({"error": "Joint angles must be numeric values"}), 400

        # Basic pose visibility check
        zero_count = sum(1 for angle in joint_angles[:9] if abs(angle) < 5.0)
        
        # Bypass strict visibility check if selected exercise is an upper-body or posture correction exercise
        is_upper_body = False
        if selected_exercise:
            selected_ex_norm = normalize_exercise_name(selected_exercise)
            upper_body_exercises = [
                "shoulder_press", "barbell_biceps_curl", "hammer_curl", 
                "lateral_raise", "wall_slide", "chest_fly_machine", 
                "bench_press", "incline_bench_press", "decline_bench_press"
            ]
            is_upper_body = selected_ex_norm in upper_body_exercises

        if zero_count > 6 and not is_upper_body:
            return jsonify(
                {
                    "exercise": "unknown",
                    "confidence": 0.0,
                    "phase": "unknown",
                    "rep_count": 0,
                    "joint_angles": joint_angles[:9],
                    "timestamp": datetime.now().isoformat(),
                    "error": "Poor pose detection - please ensure you are fully visible in the camera",
                    "exercise_match": False,
                    "selected_exercise": selected_exercise,
                }
            )

        if len(joint_angles) > 9:
            joint_angles = joint_angles[:9]
        elif len(joint_angles) < 9:
            joint_angles.extend([0.0] * (9 - len(joint_angles)))

        # Use raw landmarks if available to match training distribution
        model_input = build_model_input(joint_angles, landmarks, selected_exercise)
        prediction = model.predict(model_input, verbose=0)

        predicted_class_idx = int(np.argmax(prediction[0]))
        confidence = float(np.max(prediction[0]))
        predicted_exercise = label_encoder.inverse_transform([predicted_class_idx])[0]
        predicted_exercise_normalized = normalize_exercise_name(predicted_exercise)
        selected_exercise_normalized = normalize_exercise_name(selected_exercise)

        # Ensure exercise_match is always defined
        exercise_match = False
        if selected_exercise_normalized:
            # Map clinical physiotherapy exercises to their closest biometric model equivalents
            physio_mappings = {
                'glute_bridge': 'hip_thrust',
                'clamshell': 'leg_raises',
                'bird_dog': 'plank',
                'wall_slide': 'shoulder_press',
                'straight_leg_raise': 'leg_raises'
            }
            mapped_selected = physio_mappings.get(selected_exercise_normalized, selected_exercise_normalized)
            
            # Check for direct equivalence
            if predicted_exercise_normalized == mapped_selected:
                exercise_match = True
            # Check for occlusion-induced upper-body equivalence under close-up seated views
            elif mapped_selected in ['lat_pulldown', 'pull_up'] and predicted_exercise_normalized in ['lat_pulldown', 'incline_bench_press', 'bench_press', 'pull_up', 'shoulder_press']:
                exercise_match = True
            elif mapped_selected in ['shoulder_press', 'wall_slide'] and predicted_exercise_normalized in ['shoulder_press', 'wall_slide', 'pull_up', 'lat_pulldown']:
                exercise_match = True
            else:
                exercise_match = False
        else:
            exercise_match = (confidence >= 0.7)

        response = {
            "exercise": predicted_exercise,
            "confidence": confidence,
            "rep_count": 0, # Rep counting is now handled on the frontend
            "joint_angles": joint_angles,
            "timestamp": datetime.now().isoformat(),
            "exercise_match": bool(exercise_match),
            "selected_exercise": selected_exercise,
            "success": True,
        }
        return jsonify(response)
    except Exception as exc:
        print(f"Prediction error: {exc}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Prediction failed: {exc}", "success": False}), 500


@app.route("/reset_session", methods=["POST"])
def reset_session():
    # Session reset is now handled on the frontend
    return jsonify({"message": "Session reset successfully", "success": True})


@app.route("/log_session", methods=["POST"])
def log_session():
    try:
        data = request.get_json(silent=True) or {}

        required_fields = ["user_id", "exercise", "total_reps", "duration"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        user_id = data["user_id"]
        exercise = data["exercise"]
        total_reps = data["total_reps"]
        duration = data["duration"]
        timestamp = datetime.now().isoformat()
        session_data = json.dumps(data.get("session_data", []))

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            if DATABASE_URL:
                # Postgres syntax
                cursor.execute('''
                    INSERT INTO sessions (user_id, exercise, total_reps, duration, timestamp, session_data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (user_id, exercise, total_reps, duration, timestamp, session_data))
                session_id = cursor.fetchone()[0]
            else:
                # SQLite syntax
                cursor.execute('''
                    INSERT INTO sessions (user_id, exercise, total_reps, duration, timestamp, session_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (user_id, exercise, total_reps, duration, timestamp, session_data))
                session_id = cursor.lastrowid
                
            conn.commit()
        finally:
            conn.close()

        return jsonify(
            {
                "message": "Session logged successfully",
                "session_id": session_id,
                "success": True,
            }
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to log session: {exc}", "success": False}), 500


@app.route("/sessions/<user_id>", methods=["GET"])
def get_user_sessions(user_id):
    conn = None
    try:
        conn = get_db_connection()
        if not DATABASE_URL:
            conn.row_factory = sqlite3.Row
        
        cursor = conn.cursor()
        
        if DATABASE_URL:
            # Postgres
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute('SELECT * FROM sessions WHERE user_id = %s ORDER BY timestamp DESC', (user_id,))
        else:
            # SQLite
            cursor.execute('SELECT * FROM sessions WHERE user_id = ? ORDER BY timestamp DESC', (user_id,))
            
        rows = cursor.fetchall()
    finally:
        if conn:
            conn.close()

    try:
        user_sessions = []
        for row in rows:
            session = dict(row)
            session["session_data"] = json.loads(session["session_data"]) if session["session_data"] else []
            user_sessions.append(session)

        total_sessions = len(user_sessions)
        total_reps = sum(session["total_reps"] for session in user_sessions)
        total_duration = sum(session["duration"] for session in user_sessions)

        exercise_stats = {}
        for session in user_sessions:
            exercise = session["exercise"]
            if exercise not in exercise_stats:
                exercise_stats[exercise] = {"sessions": 0, "total_reps": 0, "total_duration": 0}
            exercise_stats[exercise]["sessions"] += 1
            exercise_stats[exercise]["total_reps"] += session["total_reps"]
            exercise_stats[exercise]["total_duration"] += session["duration"]

        return jsonify(
            {
                "user_id": user_id,
                "sessions": user_sessions,
                "summary": {
                    "total_sessions": total_sessions,
                    "total_reps": total_reps,
                    "total_duration": total_duration,
                    "exercise_breakdown": exercise_stats,
                },
            }
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve sessions: {exc}", "success": False}), 500


@app.route("/sessions", methods=["GET"])
def get_all_sessions():
    conn = None
    try:
        conn = get_db_connection()
        if not DATABASE_URL:
            conn.row_factory = sqlite3.Row
        
        cursor = conn.cursor()
        
        if DATABASE_URL:
            # Postgres
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute('SELECT * FROM sessions ORDER BY timestamp DESC')
        else:
            # SQLite
            cursor.execute('SELECT * FROM sessions ORDER BY timestamp DESC')
            
        rows = cursor.fetchall()
    finally:
        if conn:
            conn.close()

    try:
        all_sessions = []
        for row in rows:
            session = dict(row)
            session["session_data"] = json.loads(session["session_data"]) if session["session_data"] else []
            all_sessions.append(session)

        return jsonify({"sessions": all_sessions})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve all sessions: {exc}", "success": False}), 500


@app.route("/protocols/default", methods=["GET"])
def get_default_protocols():
    conn = None
    try:
        conn = get_db_connection()
        if not DATABASE_URL:
            conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if DATABASE_URL:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM protocols WHERE user_id = 'default'")
        else:
            cursor.execute("SELECT * FROM protocols WHERE user_id = 'default'")
            
        rows = cursor.fetchall()
    finally:
        if conn:
            conn.close()
        
    try:
        protocols = [dict(row) for row in rows]
        return jsonify({"protocols": protocols, "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve default protocols: {exc}", "success": False}), 500


@app.route("/protocols/<user_id>", methods=["GET"])
def get_user_protocols(user_id):
    conn = None
    try:
        conn = get_db_connection()
        if not DATABASE_URL:
            conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if DATABASE_URL:
            from psycopg2.extras import RealDictCursor
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM protocols WHERE user_id = %s", (user_id,))
        else:
            cursor.execute("SELECT * FROM protocols WHERE user_id = ?", (user_id,))
            
        rows = cursor.fetchall()
        
        # If user has no custom protocols, fall back to 'default'
        if not rows:
            if DATABASE_URL:
                cursor.execute("SELECT * FROM protocols WHERE user_id = 'default'")
            else:
                cursor.execute("SELECT * FROM protocols WHERE user_id = 'default'")
            rows = cursor.fetchall()
    finally:
        if conn:
            conn.close()
            
    try:
        protocols = [dict(row) for row in rows]
        return jsonify({"user_id": user_id, "protocols": protocols, "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve protocols for {user_id}: {exc}", "success": False}), 500


@app.route("/protocols", methods=["POST"])
def save_protocol():
    try:
        data = request.get_json(silent=True) or {}
        
        if isinstance(data, list):
            protocols_list = data
        else:
            protocols_list = [data]
            
        if not protocols_list:
            return jsonify({"error": "No data provided", "success": False}), 400
            
        # Verify schema validity first, before opening connection
        for item in protocols_list:
            user_id = item.get("user_id")
            exercise = item.get("exercise")
            if not user_id or not exercise:
                return jsonify({"error": "Missing user_id or exercise in protocol data", "success": False}), 400
            
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            for item in protocols_list:
                user_id = item.get("user_id")
                exercise = item.get("exercise")
                target_reps = int(item.get("target_reps", 10))
                safe_spine_angle = float(item.get("safe_spine_angle", 30.0))
                safe_knee_angle = float(item.get("safe_knee_angle", 90.0))
                safety_sensitivity = item.get("safety_sensitivity", "medium")
                
                if DATABASE_URL:
                    cursor.execute('''
                        INSERT INTO protocols (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (user_id, exercise) DO UPDATE SET
                            target_reps = EXCLUDED.target_reps,
                            safe_spine_angle = EXCLUDED.safe_spine_angle,
                            safe_knee_angle = EXCLUDED.safe_knee_angle,
                            safety_sensitivity = EXCLUDED.safety_sensitivity
                    ''', (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity))
                else:
                    cursor.execute('''
                        INSERT OR REPLACE INTO protocols (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (user_id, exercise, target_reps, safe_spine_angle, safe_knee_angle, safety_sensitivity))
            conn.commit()
        finally:
            conn.close()
        
        return jsonify({"message": "Protocols saved successfully", "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to save protocols: {exc}", "success": False}), 500


# Initialize database and load models at module level with safety wraps for multi-worker startups
try:
    init_db()
except Exception as db_err:
    print(f"Database initialization warning (likely concurrent SQLite access in multi-worker environment): {db_err}")

try:
    load_models()
except Exception as model_err:
    print(f"Model loading warning: {model_err}")

if __name__ == "__main__":
    print("Starting Physiotherapy Exercise Monitoring Backend...")
    print("Models loaded successfully. Starting Flask server...")
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
