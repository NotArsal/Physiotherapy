# Patent Claims Blueprint: PhysioTracker

This document serves as the technical foundation for your Engineering Design & Innovation (EDI) panel defense and future patent filings. It translates the raw codebase logic into defensible, novel technical claims.

---

## Claim 1: Wearable-Free Ambient Fall Detection During Exercise

**The Innovation:** A purely optical, mathematical method for distinguishing between intentional rapid biomechanical descent (e.g., dropping into a squat or push-up) and an unintentional fall, without the need for accelerometers or wearable devices.

### Technical Implementation Details
The system utilizes a dual-factor temporal analysis pipeline running locally in the browser:
1. **Critical Head Velocity Spikes:** The system calculates the first derivative of the user's nose landmark ($dy/dt$) across consecutive frames. If the downward velocity exceeds the dynamic threshold ($> 2.5$ normalized screen units per second), a rapid descent flag is raised.
2. **Floor Proximity & Aspect Ratio Collapse (Y-Collapse):** Rapid descent alone is insufficient (as it could be a fast squat). The system calculates the absolute Y-coordinate of the head relative to the frame ($> 0.5$ threshold). Simultaneously, it computes the bounding box of all 33 visible landmarks. If the overall aspect ratio of the bounding box collapses horizontally ($< 0.8$), the system mathematically confirms a horizontal collapse near the floor.

**Patentable Advantage:** By combining $dy/dt$ tracking with holistic bounding-box aspect ratio monitoring, the system provides zero-latency emergency monitoring that protects patients without requiring them to wear restrictive smartwatches or medical pendants.

---

## Claim 2: Virtual Landmark Imputation via Anatomical Scaling

**The Innovation:** A real-time fallback mechanism that maintains deep learning inference accuracy even when the camera's field of view is obstructed or incomplete (e.g., lower body occluded by furniture).

### Technical Implementation Details
When raw MediaPipe landmarks drop below a visibility confidence threshold, the `pose_utils.py` preprocessing pipeline intervenes before sending data to the BiLSTM model:
1. **Anatomical Anchor Points:** The system identifies high-confidence, rigid anchor points, primarily the bi-acromial distance (shoulder width).
2. **Proportional Estimation:** Using standard human biomechanical ratios, the system scales the expected locations of missing joints. For instance, if the knees are occluded during a lat-pulldown, the system calculates the hip-to-knee vector based on the measured shoulder width.
3. **Data Integrity Conservation:** Rather than feeding `0.0` or `NaN` coordinates to the BiLSTM (which would cause massive prediction drift), the imputed coordinates preserve the spatial structure of the tensor.

**Patentable Advantage:** This ensures uninterrupted ML monitoring in unpredictable home environments, significantly increasing the robustness of telehealth physiotherapy applications where perfect camera framing is rarely achievable.

---

## Claim 3: Adaptive Hysteresis-Based Repetition and Form Tracking

**The Innovation:** A temporal smoothing technique and dual-threshold state machine that prevents false-positive repetition counts caused by noisy webcam data or muscular tremors.

### Technical Implementation Details
The `detectExercisePhase` module utilizes a complex state machine tailored to individual exercises:
1. **Exponential Moving Average (EMA) Smoothing:** Raw angular vectors are passed through a low-pass EMA filter ($\alpha = 0.4$) to dampen high-frequency camera noise and subtle human tremors, creating a clean continuous signal.
2. **Dual-Threshold Logic:** Instead of a single trigger point (e.g., "count a rep when the arm hits 90 degrees"), the system uses high and low boundaries (e.g., $> 150^{\circ}$ for eccentric completion, $< 60^{\circ}$ for concentric completion). The state cannot transition to `'up'` until the low threshold is explicitly crossed, and cannot transition to `'down'` until the high threshold is crossed.
3. **Fatigue & Velocity Degradation:** The state machine calculates phase durations. It establishes a baseline velocity from the first 3 repetitions and tracks deviation. If velocity drops $> 30\%$, fatigue is quantitatively identified.

**Patentable Advantage:** The integration of EMA smoothing with exercise-specific, adaptive hysteresis thresholds completely eliminates the "double-counting" errors ubiquitous in single-threshold fitness tracking systems.
