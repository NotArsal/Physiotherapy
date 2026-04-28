#!/usr/bin/env python3
"""
PhysioTracker Backend Runner
Simple script to start the Flask backend server
"""

import os
import sys

from app import app, load_models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
MODEL_FILE = os.path.join(MODEL_DIR, "bilstm_exercise_classifier.h5")
ENCODER_FILE = os.path.join(MODEL_DIR, "label_encoder.pkl")


def main():
    print("=" * 60)
    print("PhysioTracker - AI Exercise Monitoring Backend")
    print("=" * 60)

    if not os.path.exists(MODEL_FILE):
        print("ERROR: BiLSTM model file not found!")
        print("   Please ensure 'bilstm_exercise_classifier.h5' is in the backend/model directory")
        sys.exit(1)

    if not os.path.exists(ENCODER_FILE):
        print("ERROR: Label encoder file not found!")
        print("   Please ensure 'label_encoder.pkl' is in the backend/model directory")
        sys.exit(1)

    print("Model files found")
    print("Loading AI models...")
    if not load_models():
        print("ERROR: Failed to load models")
        sys.exit(1)

    print("Models loaded successfully")
    print("Starting Flask server...")
    print("   Backend will be available at: http://localhost:5000")
    print("   Press Ctrl+C to stop the server")
    print("=" * 60)

    try:
        app.run(
            debug=True,
            host="0.0.0.0",
            port=int(os.getenv("PORT", "5000")),
            use_reloader=False,
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as exc:
        print(f"Server error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
