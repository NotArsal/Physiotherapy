import os
import pickle
import sqlite3
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

CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000", os.getenv("FRONTEND_URL", "*")],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"],
    supports_credentials=True,
)

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

    # SQLite Fallback
    conn = sqlite3.connect(DATABASE_PATH)
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
    return sqlite3.connect(DATABASE_PATH)

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





def build_model_input(joint_angles, landmarks=None):
    """
    Create deterministic time-series input for the BiLSTM model using raw landmarks.
    The model expects 33 landmarks (x, y, visibility) totaling 99 features.
    """
    if not landmarks or len(landmarks) < 33:
        raise ValueError("Raw MediaPipe landmarks (33 points) are required for accurate inference")

    # Extract raw landmarks (x, y, visibility for 33 points = 99 features)
    flat_landmarks = []
    for lm in landmarks[:33]:
        if isinstance(lm, dict):
            flat_landmarks.extend([lm.get('x', 0), lm.get('y', 0), lm.get('visibility', 0)])
        else:
            # Assume list or array [x, y, visibility]
            flat_landmarks.extend(lm[:3])
    
    feature_vector = np.array(flat_landmarks, dtype=np.float32)
    feature_vector = np.pad(feature_vector, (0, max(0, 99 - feature_vector.size)))[:99]

    timesteps = 30
    # Create a simple time series by tiling the single frame
    # (Matches training data shape: 30 timesteps per sample)
    time_series = np.tile(feature_vector, (timesteps, 1))
    time_scale = np.linspace(0.98, 1.02, timesteps, dtype=np.float32).reshape(timesteps, 1)

    return (time_series * time_scale).reshape(1, timesteps, 99)


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

    return jsonify({"exercises": list(label_encoder.classes_)})


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
        if zero_count > 6:
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
        model_input = build_model_input(joint_angles, landmarks)
        prediction = model.predict(model_input, verbose=0)

        predicted_class_idx = int(np.argmax(prediction[0]))
        confidence = float(np.max(prediction[0]))
        predicted_exercise = label_encoder.inverse_transform([predicted_class_idx])[0]
        predicted_exercise_normalized = normalize_exercise_name(predicted_exercise)
        selected_exercise_normalized = normalize_exercise_name(selected_exercise)

        # Ensure exercise_match is always defined
        exercise_match = False
        if selected_exercise_normalized:
            exercise_match = (predicted_exercise_normalized == selected_exercise_normalized)
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
        conn.close()

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
        conn.close()

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
        conn.close()
        
        protocols = [dict(row) for row in rows]
        return jsonify({"protocols": protocols, "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve default protocols: {exc}", "success": False}), 500


@app.route("/protocols/<user_id>", methods=["GET"])
def get_user_protocols(user_id):
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
            
        conn.close()
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
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for item in protocols_list:
            user_id = item.get("user_id")
            exercise = item.get("exercise")
            
            if not user_id or not exercise:
                conn.close()
                return jsonify({"error": "Missing user_id or exercise in protocol data", "success": False}), 400
                
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
        conn.close()
        
        return jsonify({"message": "Protocols saved successfully", "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to save protocols: {exc}", "success": False}), 500


# Initialize database and load models at module level for Gunicorn compatibility
init_db()
load_models()

if __name__ == "__main__":
    print("Starting Physiotherapy Exercise Monitoring Backend...")
    print("Models loaded successfully. Starting Flask server...")
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
