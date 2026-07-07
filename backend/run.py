#!/usr/bin/env python3
"""
PhysioTracker Backend Runner
Simple script to start the Flask backend server
"""

import os
import sys

from app import app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    print("=" * 60)
    print("PhysioTracker - AI Exercise Monitoring Backend")
    print("=" * 60)

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
