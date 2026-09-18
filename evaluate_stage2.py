
import os
import glob
import cv2
import mediapipe as mp
import math
import json
import numpy as np
import sys

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Need a model asset
import urllib.request
if not os.path.exists("pose_landmarker.task"):
    urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", "pose_landmarker.task")

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path="pose_landmarker.task"),
    running_mode=VisionRunningMode.VIDEO)

landmarker = PoseLandmarker.create_from_options(options)

def calculate_angle(a, b, c):
    ang = math.degrees(math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0]))
    return abs(ang) if abs(ang) <= 180 else 360 - abs(ang)

def extract_joint_angles(landmarks):
    def get_pt(idx):
        lm = landmarks[idx]
        return [lm.x, lm.y, lm.visibility]

    def ang(a,b,c):
        return calculate_angle(get_pt(a), get_pt(b), get_pt(c))

    angles = [0]*9
    angles[0] = ang(23, 11, 13)
    angles[1] = ang(24, 12, 14)
    angles[2] = ang(11, 13, 15)
    angles[3] = ang(12, 14, 16)
    angles[4] = ang(11, 23, 25)
    angles[5] = ang(12, 24, 26)
    angles[6] = ang(23, 25, 27)
    angles[7] = ang(24, 26, 28)
    
    mid_shoulder = [(get_pt(11)[0]+get_pt(12)[0])/2, (get_pt(11)[1]+get_pt(12)[1])/2]
    mid_hip = [(get_pt(23)[0]+get_pt(24)[0])/2, (get_pt(23)[1]+get_pt(24)[1])/2]
    dx = mid_shoulder[0] - mid_hip[0]
    dy = mid_shoulder[1] - mid_hip[1]
    angles[8] = abs(math.degrees(math.atan2(dy, dx)) + 90)
    
    return angles

def detect_injury_risk(landmarks, joint_angles, exercise_key):
    risk_score = 0
    safe_spine_angle = 15.0
    safe_knee_angle = 90.0
    
    spine_angle = joint_angles[8]
    spine_risk = 0
    if spine_angle > safe_spine_angle:
        spine_risk = min(100, ((spine_angle - safe_spine_angle) / 10) * 50 + 50)
    
    knee_flexion_risk = 0
    if exercise_key in ["squat", "leg_extension"]:
        knee_angle = min(joint_angles[6], joint_angles[7])
        if knee_angle < safe_knee_angle:
            knee_flexion_risk = min(100, ((safe_knee_angle - knee_angle) / 20) * 50 + 50)
            
    exercise_correction_risk = 0
    if exercise_key in ["lateral_raise", "front_raise", "Arm Raise"]:
        min_elbow = min(joint_angles[2], joint_angles[3])
        if min_elbow < 140:
            exercise_correction_risk = max(exercise_correction_risk, min(100, ((140 - min_elbow) / 30) * 50 + 50))
            
    max_risk = max(spine_risk, knee_flexion_risk, exercise_correction_risk)
    return max_risk

def process_video(video_path, exercise_key):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    max_risk = 0
    frame_index = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        timestamp_ms = int(frame_index * 1000 / fps)
        results = landmarker.detect_for_video(mp_image, timestamp_ms)
        if results.pose_landmarks and len(results.pose_landmarks) > 0:
            lms = results.pose_landmarks[0]
            angles = extract_joint_angles(lms)
            risk = detect_injury_risk(lms, angles, exercise_key)
            if risk > max_risk: max_risk = risk
        frame_index += 1
    cap.release()
    return max_risk > 50

def evaluate():
    mapping = {
        "Arm Raise": "lateral_raise",
        "Knee Extension": "leg_extension",
        "Sit To Stand": "squat"
    }
    
    results = {}
    total = 0
    for ex_name, ex_key in mapping.items():
        results[ex_name] = {"TP": 0, "FP": 0, "TN": 0, "FN": 0}
        
        correct_dir = f"dataset/extracted/Blurred/{ex_name} Correct"
        if os.path.exists(correct_dir):
            for f in glob.glob(os.path.join(correct_dir, "*.*")):
                if f.endswith(".mp4") or f.endswith(".mov"):
                    is_unsafe = process_video(f, ex_key)
                    if not is_unsafe: results[ex_name]["TN"] += 1
                    else: results[ex_name]["FP"] += 1
                    total += 1
                        
        incorrect_dir = f"dataset/extracted/Blurred/{ex_name} Incorrect"
        if os.path.exists(incorrect_dir):
            for f in glob.glob(os.path.join(incorrect_dir, "*.*")):
                if f.endswith(".mp4") or f.endswith(".mov"):
                    is_unsafe = process_video(f, ex_key)
                    if is_unsafe: results[ex_name]["TP"] += 1
                    else: results[ex_name]["FN"] += 1
                    total += 1
                        
    print(json.dumps(results, indent=2))
    print(f"Total processed: {total}")

if __name__ == "__main__":
    evaluate()

