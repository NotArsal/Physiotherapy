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

def test_predict_with_landmarks():
    print("\nTesting /predict with raw landmarks...")
    # Mock landmarks (33 points with x, y, visibility)
    landmarks = [{"x": 0.5, "y": 0.5, "visibility": 1.0} for _ in range(33)]
    joint_angles = [90.0] * 9
    
    data = {
        "joint_angles": joint_angles,
        "landmarks": landmarks,
        "selected_exercise": "barbell_biceps_curl"
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=data)
    print(response.json())
    assert response.status_code == 200
    assert "exercise" in response.json()

def test_predict_occluded_closeup():
    print("\nTesting /predict under extreme close-up occlusion...")
    # Mock landmarks: 33 points, lower-body, elbows, and wrists occluded (low visibility)
    landmarks = []
    for i in range(33):
        if i == 11: # Left Shoulder
            landmarks.append({"x": 0.45, "y": 0.3, "visibility": 0.9})
        elif i == 12: # Right Shoulder
            landmarks.append({"x": 0.55, "y": 0.3, "visibility": 0.9})
        else:
            # Out of frame or occluded
            landmarks.append({"x": 0.0, "y": 0.0, "visibility": 0.1})
            
    joint_angles = [90.0] * 9
    
    data = {
        "joint_angles": joint_angles,
        "landmarks": landmarks,
        "selected_exercise": "lat_pulldown"
    }
    
    response = requests.post(f"{BASE_URL}/predict", json=data)
    res_data = response.json()
    print(res_data)
    assert response.status_code == 200
    assert res_data.get("success") is True
    assert "exercise" in res_data

def test_session_persistence():
    print("\nTesting session persistence...")
    user_id = f"test_user_{int(time.time())}"
    
    # 1. Log a session
    log_data = {
        "user_id": user_id,
        "exercise": "squat",
        "total_reps": 15,
        "duration": 60,
        "session_data": [{"some": "data"}]
    }
    response = requests.post(f"{BASE_URL}/log_session", json=log_data)
    print(f"Log session response: {response.json()}")
    assert response.status_code == 200
    
    # 2. Retrieve sessions
    response = requests.get(f"{BASE_URL}/sessions/{user_id}")
    data = response.json()
    print(f"Retrieve sessions response: {data}")
    assert response.status_code == 200
    assert data["summary"]["total_sessions"] == 1
    assert data["sessions"][0]["exercise"] == "squat"

def test_protocols():
    print("\nTesting protocols API...")
    # 1. Fetch default protocols
    response = requests.get(f"{BASE_URL}/protocols/default")
    print(f"Default protocols response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert len(response.json()["protocols"]) > 0

    # 2. Fetch non-existing user protocols (should fallback to default)
    user_id = f"test_user_{int(time.time())}"
    response = requests.get(f"{BASE_URL}/protocols/{user_id}")
    print(f"Fallback protocols response for {user_id}: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["user_id"] == user_id
    assert len(response.json()["protocols"]) > 0

    # 3. Save custom protocol
    custom_protocol = {
        "user_id": user_id,
        "exercise": "squat",
        "target_reps": 12,
        "safe_spine_angle": 28.5,
        "safe_knee_angle": 95.0,
        "safety_sensitivity": "high"
    }
    response = requests.post(f"{BASE_URL}/protocols", json=custom_protocol)
    print(f"Save protocol response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 4. Fetch custom protocol and verify fields
    response = requests.get(f"{BASE_URL}/protocols/{user_id}")
    print(f"Custom protocols response for {user_id}: {response.json()}")
    assert response.status_code == 200
    protocols = response.json()["protocols"]
    squat_proto = next((p for p in protocols if p["exercise"] == "squat"), None)
    assert squat_proto is not None
    assert squat_proto["target_reps"] == 12
    assert squat_proto["safe_spine_angle"] == 28.5
    assert squat_proto["safe_knee_angle"] == 95.0
    assert squat_proto["safety_sensitivity"] == "high"

if __name__ == "__main__":
    try:
        test_health()
        test_predict_with_landmarks()
        test_predict_occluded_closeup()
        test_session_persistence()
        test_protocols()
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nTests failed: {e}")

