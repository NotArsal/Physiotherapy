# PhysioTracker: System Architecture & Flow Diagrams

This document contains the structural architecture and execution workflows of the PhysioTracker platform. These diagrams accurately reflect the production implementation, including the advanced biomechanical features and emergency fall detection.

## 1. High-Level System Architecture

This diagram illustrates the separation of concerns between the client-side edge computing (MediaPipe), the RESTful ML API, and the persistence layer.

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef backend fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#fff;
    classDef database fill:#7c2d12,stroke:#f97316,stroke-width:2px,color:#fff;
    classDef user fill:#333333,stroke:#777777,stroke-width:2px,color:#fff;

    %% Nodes
    U((User / Web Camera)):::user
    
    subgraph Client [Frontend Edge Computing - React.js / Vercel]
        UI[React UI Dashboard]:::frontend
        MP[MediaPipe Pose Model]:::frontend
        EM[ExerciseMonitor & Form Logic]:::frontend
        TS[Speech Synthesis / Audio Alerts]:::frontend
    end
    
    subgraph Server [Backend Inference API - Flask / Render]
        API[Flask REST API]:::backend
        PU[Pose Preprocessing & Imputation]:::backend
        ML[BiLSTM TensorFlow Model]:::backend
    end
    
    subgraph Storage [Cloud Data - MongoDB Atlas]
        DB[(MongoDB Cluster)]:::database
        CL_Sessions[Sessions Collection]:::database
        CL_Protocols[Protocols Collection]:::database
    end

    %% Connections
    U -- "Live Video Stream (30fps)" --> MP
    MP -- "33 Raw Landmarks" --> EM
    EM -- "Visual / Audio Feedback" --> UI
    UI -- "Voice Alerts" --> TS
    
    EM -- "POST /predict\n(Landmarks + Angles)" --> API
    API -- "Sanitize & Impute" --> PU
    PU -- "Tensor [1, 1, 99]" --> ML
    ML -- "Exercise Class & Confidence" --> API
    API -- "JSON Prediction" --> EM
    
    EM -- "POST /log_session\nGET /protocols" --> API
    API -- "PyMongo Driver" --> DB
    DB --- CL_Sessions
    DB --- CL_Protocols
```

---

## 2. Real-Time Form Analysis & Fall Detection Flow

This flowchart describes the 30fps client-side loop that evaluates patient safety and tracks adaptive exercise repetitions without making external network calls.

```mermaid
flowchart TD
    %% Styles
    classDef process fill:#2563eb,stroke:#fff,color:#fff
    classDef decision fill:#d97706,stroke:#fff,color:#fff
    classDef alert fill:#dc2626,stroke:#fff,color:#fff
    classDef endpoint fill:#16a34a,stroke:#fff,color:#fff

    Start([Receive Video Frame]):::process --> MP[MediaPipe Pose Extraction]:::process
    MP --> ExtractAngles[Calculate 9 Joint Angles]:::process
    
    ExtractAngles --> Smoothing[Apply EMA Smoothing Alpha=0.4]:::process
    
    Smoothing --> FallCheck{Check dy/dt Velocity\n& Aspect Ratio}:::decision
    
    FallCheck -- "Critical Velocity \n& Y-Collapse" --> FallAlert[Trigger CRITICAL FALL DETECTED\nPause Session]:::alert
    FallCheck -- "Safe" --> AsymCheck{Check Left vs Right\nJoint Variance}:::decision
    
    FallAlert --> Timer[Start 10s Dismiss Timer]:::process
    Timer -- "Timer Expires" --> Therapist[Send Emergency Alert to Therapist]:::endpoint
    Timer -- "User Clicks Dismiss" --> Resume([Resume Session]):::process

    AsymCheck -- "Delta > 15°" --> AsymAlert[Trigger Asymmetry Audio Warning]:::alert
    AsymCheck -- "Balanced" --> FatigueCheck{Check Eccentric/Concentric\nPhase Velocity}:::decision
    AsymAlert --> FatigueCheck
    
    FatigueCheck -- "Duration > 130% Baseline" --> FatigueAlert[Trigger Fatigue Audio Motivation]:::alert
    FatigueCheck -- "Normal Speed" --> RepLogic[Dual-Threshold Hysteresis State Machine]:::process
    FatigueAlert --> RepLogic
    
    RepLogic --> Render([Update Skeleton Overlay & UI]):::process
```

---

## 3. Machine Learning Inference Pipeline

This sequence details how the raw camera data is transformed into a BiLSTM prediction via the backend API.

```mermaid
sequenceDiagram
    autonumber
    actor User as Web Client
    participant Frontend as ExerciseMonitor.tsx
    participant Flask as Flask API (/predict)
    participant Preproc as pose_utils.py
    participant Model as BiLSTM Neural Network
    
    User->>Frontend: Performs exercise movement
    Frontend->>Frontend: Extract 33 Landmarks & 9 Angles
    Frontend->>Frontend: Push frame to History Buffer
    Frontend->>Flask: POST /predict (Payload: History + Angles + Target)
    Flask->>Preproc: Pass Raw Landmarks
    
    alt Visibility < Confidence Threshold
        Preproc->>Preproc: Estimate missing joints via Bi-acromial scaling
    end
    
    Preproc->>Preproc: Flatten to 99-feature array (x, y, v)
    Preproc->>Flask: Return Cleaned Tensor
    Flask->>Model: model.predict(Tensor)
    Model-->>Flask: Output Softmax Probabilities
    
    alt Prediction matches Selected Exercise
        Flask-->>Frontend: Success! (Return Confidence)
    else Mismatch Detected
        Flask-->>Frontend: Warning! (Return Predicted Exercise)
    end
    
    Frontend->>User: Render Model UI (Green/Red Confidence Bar)
```
