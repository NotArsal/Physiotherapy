import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_health():
    print("Testing /health...")
    response = requests.get(f"{BASE_URL}/health")
    print(response.json())
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_exercises():
    print("\nTesting /exercises...")
    response = requests.get(f"{BASE_URL}/exercises")
    print(f"Exercises count: {len(response.json().get('exercises', []))}")
    assert response.status_code == 200
    assert "exercises" in response.json()
    assert len(response.json()["exercises"]) > 0

def test_auth_protection():
    print("\nTesting authentication requirement on protected endpoints...")
    # 1. Unauthenticated log_session should return 401
    res1 = requests.post(f"{BASE_URL}/log_session", json={"exercise": "squat", "total_reps": 10, "duration": 30})
    assert res1.status_code == 401
    assert res1.json()["success"] is False
    
    # 2. Unauthenticated get_sessions should return 401
    res2 = requests.get(f"{BASE_URL}/sessions/test_user")
    assert res2.status_code == 401
    assert res2.json()["success"] is False
    
    print("Authorization boundary protection verified successfully.")

def test_default_protocols():
    print("\nTesting /protocols/default...")
    response = requests.get(f"{BASE_URL}/protocols/default")
    print(f"Default protocols response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["protocols"]) > 0

if __name__ == "__main__":
    try:
        test_health()
        test_exercises()
        test_auth_protection()
        test_default_protocols()
        print("\nAll backend integration tests passed successfully!")
    except Exception as e:
        print(f"\nTests failed: {e}")
