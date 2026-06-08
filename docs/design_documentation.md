# PhysioTracker System Design & Technical Documentation

This document outlines the underlying **Mathematical Methodology**, **Machine Learning Architecture**, and **Biomechanical Tracking Logic** of the **PhysioTracker** system. It has been prepared for your Engineering Design & Innovation (EDI) project and details how the application achieves high-performance, zero-latency physical rehabilitation tracking.

For visual diagrams of the system infrastructure and client-server flow, please refer to the [System Architecture Diagrams](system_architecture_diagrams.md).

---

## 1. System Architecture Highlights

The **PhysioTracker** system is built on a highly modular Client-Server architecture designed to optimize rendering performance, ensure local responsiveness, and utilize deep-learning models for precise exercise classification.

- **Decoupled Real-Time Core**: Rep-counting, phase detection, joint angle calculations, fall detection, and skeletal rendering run completely client-side in React at a buttery-smooth **30 FPS**.
- **Asynchronous Deep Learning**: Heavy inference using the 30-frame temporal BiLSTM classifier is performed asynchronously in the background at 600ms intervals, preventing UI freeze or input lag.
- **Fail-Safe High Availability**: If the backend server goes offline or encounters a CORS block, the client seamlessly falls back to a healthy local backend.
- **Database Scalability**: Session logging and clinical protocol storage have been fully migrated from local SQLite to **MongoDB Atlas**, enabling global cloud synchronization and flexible document-based schemas for therapy analytics.

---

## 2. Advanced Safety & Emergency Protocols

### A. Ambient Fall Detection (Optical Zero-Wearable Safety)
To protect elderly or injured patients during remote physical therapy without requiring them to wear medical pendants, PhysioTracker implements a dual-factor temporal analysis pipeline:
1. **Critical Head Velocity Spikes**: The system calculates the first derivative of the user's nose landmark ($dy/dt$) across consecutive frames.
   $$ V_{nose} = \frac{|Y_{t} - Y_{t-1}|}{\Delta t} $$
   If the downward velocity exceeds the dynamic threshold ($> 2.5$ normalized screen units per second), a rapid descent flag is raised.
2. **Floor Proximity & Aspect Ratio Collapse (Y-Collapse)**: Rapid descent alone is insufficient (as it could be a fast squat). The system calculates the absolute Y-coordinate of the head relative to the frame ($> 0.5$ threshold). Simultaneously, it computes the bounding box of all 33 visible landmarks. If the overall aspect ratio of the bounding box collapses horizontally ($Width / Height < 0.8$), the system mathematically confirms a horizontal collapse near the floor.

When a fall is confirmed, the system instantly pauses the session, triggers a loud visual/audio warning, and begins a **10-Second Therapist Alert Countdown**.

### B. Fatigue & Asymmetry Detection
- **Fatigue Tracking**: The state machine tracks the duration of both concentric and eccentric phases. It dynamically calculates a baseline velocity using the first 3 repetitions. If subsequent repetitions take $> 30\%$ longer than the baseline, the system triggers vocal encouragement and logs fatigue.
- **Asymmetry Scoring**: During bilateral exercises (e.g., Squats, Biceps Curls), the system continually measures the absolute delta between left and right limb extensions. If the angular variance exceeds $15^\circ$, an audio correction is fired to prevent musculoskeletal imbalances.

---

## 3. Mathematical Methodology

PhysioTracker combines multi-joint kinematics, real-time signal filtering, and temporal recurrent neural networks to deliver precise clinical assessment.

### A. Biometric Landmark Extraction
Webcam input is processed using **MediaPipe Pose**, a machine-learning model based on the BlazePose architecture. BlazePose tracks **33 3-dimensional skeletal landmarks** ($x, y, z$) in real-time, along with a per-landmark model visibility confidence ($v \in [0.0, 1.0]$).

### B. Trigonometric Joint Angle Extraction
To convert raw $x, y$ coordinates into biomechanical metrics, the system models the human body as a series of connected vectors. For any joint $B$ connected to adjacent landmarks $A$ and $C$, two vectors are defined:
$$\vec{u} = A - B = (x_a - x_b, y_a - y_b)$$
$$\vec{v} = C - B = (x_c - x_b, y_c - y_b)$$

The joint angle $\theta$ (in degrees) is calculated using the dot product and magnitude relations:
$$\cos(\theta) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|} = \frac{u_x v_x + u_y v_y}{\sqrt{u_x^2 + u_y^2} \sqrt{v_x^2 + v_y^2}}$$
$$\theta = \arccos\left(\text{clamp}(\cos(\theta), -1.0, 1.0)\right) \times \left(\frac{180}{\pi}\right)$$

This formula is applied to extract **9 distinct joint flexions** (Shoulders, Elbows, Hips, Knees, Spine).

### C. Signal Denoising (EMA Filter)
Webcam video streams suffer from high-frequency coordinate jitter due to lighting changes, pixel noise, and clothing movement. To prevent jitter from corrupting our phase triggers, we apply an **Exponential Moving Average (EMA)** filter to all extracted joint angles:
$$S_t = \alpha \cdot Y_t + (1 - \alpha) \cdot S_{t-1}$$
- $Y_t$: Raw angle value computed from the current frame.
- $S_t$: Denoised, smoothed angle output.
- $\alpha$: Smoothing factor, set to **$0.40$** to prioritize rapid response while suppressing jitter.

### D. Adaptive Calibration & Hysteresis State Machine
Standard single-threshold rep-counters flicker and double-count when a patient pauses or shakes near a transition point. Furthermore, static thresholds fail across different human body types.
To solve this, PhysioTracker implements an **Adaptive Calibration Phase** followed by a **Finite State Machine (FSM)** with **hysteresis (dual boundaries)**:

1. **Calibration (10 Seconds)**: Before a session begins, the user performs a test repetition. The system scans the continuous data stream to identify the global minimum and maximum angles for the active joints, establishing personalized boundaries.
2. **Hysteresis Counters**: For example, during a **Knee Squat**:
   - **Concentric Phase ('up' -> 'down')**: Triggered only when the knee angle falls below the personalized deep threshold.
   - **Eccentric Phase ('down' -> 'up')**: Triggered only when the knee angle rises above the personalized standing threshold.
   - **Hysteresis Zone**: The space between boundaries where the system holds the previous phase, safely absorbing postural tremors without false counts.

### E. Deep Learning Temporal Classification (BiLSTM)
While client-side heuristics count repetitions safely, a backend deep-learning classifier evaluates movement classification.
1. **Temporal Features**: The frontend captures a rolling window of **consecutive frames**. It sends the raw coordinates to the backend payload. For 33 landmarks, this yields an input size of $\text{frames} \times 99 \text{ features}$ ($33 \times [x, y, v]$).
2. **Virtual Lower-Body Landmark Imputation**: If the webcam is positioned too close to the body (e.g. seated chest exercises), leg landmarks have low visibility ($v < 0.45$). To prevent TensorFlow errors and maintain upper-body classification accuracy, the backend dynamically scales and reconstructs neutral standing leg vectors using the horizontal bi-acromial distance (shoulder width).
3. **BiLSTM Neural Network Architecture**:
   - The inputs are passed to a **Bidirectional Long Short-Term Memory (BiLSTM)** layer with 64 units.
   - The Bidirectional structure processes the time-series both forward (past contexts) and backward (future predictions), creating a highly robust representation of dynamic curves.
   - Dense layers with ReLU activations output probabilities over the trained exercise catalog via a final **Softmax activation** layer.
   - The predicted class is checked against the patient's selected exercise. If they mismatch, the skeleton is colored **Blue** to signal a form error.
