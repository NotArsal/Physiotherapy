import os
from dotenv import load_dotenv
load_dotenv()
import pickle
import re
from datetime import datetime
from pathlib import Path
import json

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_talisman import Talisman
from pymongo import MongoClient
from bson.objectid import ObjectId

import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps
import logging
from pythonjsonlogger import jsonlogger

# Configure structured JSON logging
logger = logging.getLogger("physio_api")
logger.setLevel(logging.INFO)
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s')
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)



app = Flask(__name__)
Talisman(app, content_security_policy=None) # CSP can be tricky with APIs, so we just add basic headers (HSTS, X-Frame-Options) first.

BASE_DIR = Path(__file__).resolve().parent
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/physio_db")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database(default="physio_db")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")

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

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        # Check if FIREBASE_CREDENTIALS path is provided in .env
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized via certificate path.")
        else:
            # Fallback to default application credentials (e.g. env var GOOGLE_APPLICATION_CREDENTIALS)
            firebase_admin.initialize_app()
            logger.info("Firebase Admin initialized via default application credentials.")
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

# Decorator to enforce authentication
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header", "success": False}), 401
        
        token = auth_header.split(" ")[1]
        try:
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token  # attach to request
        except Exception as e:
            logger.warning(f"Auth token verification failed: {e}")
            return jsonify({"error": "Invalid or expired authorization token", "success": False}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def format_session_doc(doc):
    session = dict(doc)
    if "_id" in session:
        session["id"] = str(session.pop("_id"))
    if isinstance(session.get("session_data"), str):
        try:
            session["session_data"] = json.loads(session["session_data"])
        except json.JSONDecodeError:
            session["session_data"] = []
    elif not session.get("session_data"):
        session["session_data"] = []
    return session


# Stateless backend - current_exercise_state removed to support multi-worker environments

def init_db():
    try:
        db.protocols.create_index([("user_id", 1), ("exercise", 1)], unique=True)
        # Check if default protocols exist to prevent redundant bulk upserts on every boot
        if db.protocols.count_documents({"user_id": "default"}) < 10:
            default_protocols = [
                {'user_id': 'default', 'exercise': 'squat', 'target_reps': 10, 'safe_spine_angle': 30.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'deadlift', 'target_reps': 10, 'safe_spine_angle': 25.0, 'safe_knee_angle': 110.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'push_up', 'target_reps': 10, 'safe_spine_angle': 15.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'barbell_biceps_curl', 'target_reps': 12, 'safe_spine_angle': 15.0, 'safe_knee_angle': 150.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'shoulder_press', 'target_reps': 10, 'safe_spine_angle': 20.0, 'safe_knee_angle': 140.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'plank', 'target_reps': 1, 'safe_spine_angle': 10.0, 'safe_knee_angle': 180.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'leg_raises', 'target_reps': 15, 'safe_spine_angle': 15.0, 'safe_knee_angle': 100.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'russian_twist', 'target_reps': 20, 'safe_spine_angle': 30.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'glute_bridge', 'target_reps': 10, 'safe_spine_angle': 15.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'clamshell', 'target_reps': 12, 'safe_spine_angle': 10.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'bird_dog', 'target_reps': 10, 'safe_spine_angle': 15.0, 'safe_knee_angle': 90.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'wall_slide', 'target_reps': 10, 'safe_spine_angle': 15.0, 'safe_knee_angle': 140.0, 'safety_sensitivity': 'medium'},
                {'user_id': 'default', 'exercise': 'straight_leg_raise', 'target_reps': 12, 'safe_spine_angle': 15.0, 'safe_knee_angle': 160.0, 'safety_sensitivity': 'medium'},
            ]
            for p in default_protocols:
                db.protocols.update_one(
                    {'user_id': p['user_id'], 'exercise': p['exercise']},
                    {'$set': p},
                    upsert=True
                )
            logger.info("MongoDB initialized and defaults seeded")
        else:
            logger.info("MongoDB initialized (defaults already seeded)")
    except Exception as e:
        logger.error(f"Error initializing MongoDB: {e}")







@app.errorhandler(500)
def handle_internal_server_error(e):
    import traceback
    error_details = traceback.format_exc()
    logger.error("Internal Server Error", extra={"traceback": error_details, "exception": str(e)})
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
            "database": db is not None
        }
    )


@app.route("/exercises", methods=["GET"])
def get_exercises():
    exercises = [
        'barbell_biceps_curl', 'bench_press', 'chest_fly_machine', 'deadlift', 
        'hammer_curl', 'hip_thrust', 'incline_bench_press', 'lat_pulldown', 
        'leg_extension', 'leg_raises', 'plank', 'pull_up', 'push_up', 
        'romanian_deadlift', 'russian_twist', 'shoulder_press', 'squat', 
        't_bar_row', 'tricep_dips', 'glute_bridge', 'clamshell', 'bird_dog', 
        'wall_slide', 'straight_leg_raise'
    ]

    return jsonify({"exercises": exercises})





@app.route("/log_session", methods=["POST"])
@require_auth
def log_session():
    try:
        data = request.get_json(silent=True) or {}

        required_fields = ["exercise", "total_reps", "duration"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Ignore client-provided user_id and use the verified token uid
        user_id = request.user.get("uid")
        
        exercise = data["exercise"]
        total_reps = data["total_reps"]
        duration = data["duration"]
        timestamp = datetime.now().isoformat()
        session_data = json.dumps(data.get("session_data", []))

        try:
            result = db.sessions.insert_one({
                "user_id": user_id,
                "exercise": exercise,
                "total_reps": total_reps,
                "duration": duration,
                "timestamp": timestamp,
                "session_data": session_data
            })
            session_id = str(result.inserted_id)
        except Exception as e:
            return jsonify({"error": f"Database error: {e}"}), 500

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
@require_auth
def get_user_sessions(user_id):
    if request.user.get("uid") != user_id:
        return jsonify({"error": "Forbidden: You cannot access sessions for another user", "success": False}), 403
        
    try:
        rows = list(db.sessions.find({"user_id": user_id}).sort("timestamp", -1))
        user_sessions = [format_session_doc(row) for row in rows]

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
@require_auth
def get_all_sessions():
    try:
        rows = list(db.sessions.find().sort("timestamp", -1))
        all_sessions = [format_session_doc(row) for row in rows]
        return jsonify({"sessions": all_sessions})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve all sessions: {exc}", "success": False}), 500


@app.route("/protocols/default", methods=["GET"])
def get_default_protocols():
    try:
        rows = list(db.protocols.find({"user_id": "default"}))
        protocols = []
        for row in rows:
            row["id"] = str(row.pop("_id"))
            protocols.append(row)
        return jsonify({"protocols": protocols, "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve default protocols: {exc}", "success": False}), 500


@app.route("/protocols/<user_id>", methods=["GET"])
@require_auth
def get_user_protocols(user_id):
    if request.user.get("uid") != user_id:
        return jsonify({"error": "Forbidden", "success": False}), 403
        
    try:
        rows = list(db.protocols.find({"user_id": user_id}))
        
        # If user has no custom protocols, fall back to 'default'
        if not rows:
            rows = list(db.protocols.find({"user_id": "default"}))
            
        protocols = []
        for row in rows:
            row["id"] = str(row.pop("_id"))
            protocols.append(row)
        return jsonify({"user_id": user_id, "protocols": protocols, "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve protocols for {user_id}: {exc}", "success": False}), 500


@app.route("/protocols", methods=["POST"])
@require_auth
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
            exercise = item.get("exercise")
            if not exercise:
                return jsonify({"error": "Missing exercise in protocol data", "success": False}), 400
            
        # Ignore client user_id and use token identity
        user_id = request.user.get("uid")
        
        for item in protocols_list:
            exercise = item.get("exercise")
            
            doc = {
                "user_id": user_id,
                "exercise": exercise,
                "target_reps": int(item.get("target_reps", 10)),
                "safe_spine_angle": float(item.get("safe_spine_angle", 30.0)),
                "safe_knee_angle": float(item.get("safe_knee_angle", 90.0)),
                "safety_sensitivity": item.get("safety_sensitivity", "medium")
            }
            
            db.protocols.update_one(
                {"user_id": user_id, "exercise": exercise},
                {"$set": doc},
                upsert=True
            )
        
        return jsonify({"message": "Protocols saved successfully", "success": True})
    except Exception as exc:
        return jsonify({"error": f"Failed to save protocols: {exc}", "success": False}), 500


# Initialize database and load models at module level with safety wraps for multi-worker startups
try:
    init_db()
except Exception as db_err:
    logger.warning(f"Database initialization warning: {db_err}")

if __name__ == "__main__":
    logger.info("Starting Physiotherapy API Backend...")
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
