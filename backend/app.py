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
from pymongo import MongoClient
from bson.objectid import ObjectId



app = Flask(__name__)

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



# Stateless backend - current_exercise_state removed to support multi-worker environments

def init_db():
    try:
        db.protocols.create_index([("user_id", 1), ("exercise", 1)], unique=True)
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
        print("MongoDB initialized and defaults seeded")
    except Exception as e:
        print(f"Error initializing MongoDB: {e}")







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
def get_user_sessions(user_id):
    try:
        rows = list(db.sessions.find({"user_id": user_id}).sort("timestamp", -1))
        
        user_sessions = []
        for row in rows:
            session = row
            session["id"] = str(session.pop("_id"))
            if isinstance(session.get("session_data"), str):
                try:
                    session["session_data"] = json.loads(session["session_data"])
                except:
                    session["session_data"] = []
            elif not session.get("session_data"):
                session["session_data"] = []
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
        rows = list(db.sessions.find().sort("timestamp", -1))
        
        all_sessions = []
        for row in rows:
            session = row
            session["id"] = str(session.pop("_id"))
            if isinstance(session.get("session_data"), str):
                try:
                    session["session_data"] = json.loads(session["session_data"])
                except:
                    session["session_data"] = []
            elif not session.get("session_data"):
                session["session_data"] = []
            all_sessions.append(session)

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
def get_user_protocols(user_id):
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
            
        for item in protocols_list:
            user_id = item.get("user_id")
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
    print(f"Database initialization warning (likely concurrent SQLite access in multi-worker environment): {db_err}")

if __name__ == "__main__":
    print("Starting Physiotherapy API Backend...")
    print("Database connection established. Starting Flask server...")
    app.run(debug=True, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
