# FORM 2: PROVISIONAL PATENT SPECIFICATION
**TITLE OF INVENTION:** An Adaptive Edge-AI Physiotherapy System with Dynamic Occlusion Imputation, Context-Aware Fall Suppression, and Personalized Biomechanical Baselining.

---

## 1. FIELD OF THE INVENTION
The present invention relates generally to telehealth and digital rehabilitation. More specifically, it relates to a client-side computer vision system that utilizes edge-based machine learning for real-time kinematic tracking, incorporating dynamic occlusion imputation for missing skeletal landmarks and context-aware suppression of false-positive safety alerts.

## 2. BACKGROUND OF THE INVENTION / PRIOR ART LIMITATIONS
Existing camera-based physiotherapy systems (e.g., Microsoft Kinect-based systems, generic MediaPipe fitness trackers) suffer from significant technical limitations that prevent their widespread clinical adoption:
1. **Occlusion Vulnerability:** Monocular webcams in confined home environments frequently cut off the lower extremities of the patient. Existing systems fail or pause processing when critical joints (knees, ankles) drop below the camera frame.
2. **Alert Fatigue (False Positives):** Current kinematic fall detection algorithms rely on fixed vertical velocities. They routinely trigger false-positive emergency alerts when a patient safely moves to the floor for a prescribed mat-based exercise (e.g., glute bridges, push-ups).
3. **Generic Thresholding:** Standard systems utilize fixed, textbook joint-angle thresholds (e.g., 90-degree knee flexion) for all patients, failing to account for preexisting mobility limitations or patient-specific recovery arcs.
4. **Cloud Latency & Privacy:** Streaming high-resolution patient video to a cloud server for BiLSTM temporal processing introduces lag and violates patient data privacy protocols.

## 3. SUMMARY OF THE TECHNICAL SOLUTION
The present invention overcomes the aforementioned limitations via a multi-stage, edge-executed computational pipeline:
1. **Dynamic Occlusion Imputation:** The system calculates a proportional bi-acromial distance (shoulder width). If lower-extremity landmarks fall below a visibility threshold, the system mathematically imputes their geometric locations relative to the bi-acromial scale, preventing the tensor array from collapsing.
2. **Contextual Safety Filter:** The algorithm cross-references instantaneous kinematic drop velocity with the expected biomechanical baseline of the selected exercise. If the active protocol dictates a floor-based exercise, the system actively suppresses vertical-collapse fall detection, mitigating alert fatigue.
3. **Dynamic Personalized Biomechanical Calibration:** During the initial calibration subset (e.g., first 3 repetitions), the system tracks the patient's individual maximum safe range of motion (e.g., spinal deviation). It dynamically overwrites the global thresholds, establishing a personalized baseline that dictates subsequent repetition validity.
4. **Client-Side Edge Execution:** The entire pipeline—from 33-landmark spatial extraction to BiLSTM temporal sequence classification—executes entirely within the client's local browser memory, achieving zero-latency feedback without transmitting protected health information (PHI) over the network.

---

## 4. FORMAL CLAIMS
*(Note: These claims are structured to protect the specific mathematical and algorithmic workflows we built, which are much stronger than generic "AI Physio" claims).*

**Claim 1 (Independent):**
A method for real-time, monocular kinematic analysis in a telehealth environment, comprising:
- capturing a continuous video feed via a client-side optical sensor;
- extracting a plurality of spatial skeletal landmarks using an edge-executed spatial model;
- calculating a bi-acromial scaling factor based on the distance between identified shoulder landmarks;
- detecting the occlusion of lower-extremity landmarks below a predefined visibility threshold;
- dynamically imputing the geometric coordinates of said occluded lower-extremity landmarks as a mathematical function of the bi-acromial scaling factor; and
- passing the fully imputed geometric tensor to a temporal neural network for exercise phase classification.

**Claim 2 (Dependent on Claim 1):**
The method of Claim 1, wherein the entire spatial extraction, geometric imputation, and temporal classification pipeline executes locally within the client-side volatile memory, preventing transmission of raw video data to an external server.

**Claim 3 (Independent):**
A system for context-aware kinematic fall suppression in digital rehabilitation, comprising:
- a tracking module that calculates the instantaneous vertical velocity of a user's cranial landmark;
- a state-management module that identifies the currently active clinical protocol;
- a contextual safety filter that suppresses emergency alert generation if the calculated vertical velocity exceeds a critical threshold, provided that the active clinical protocol is classified as a floor-based biomechanical exercise (e.g., push-ups, glute bridges) or if the system is in an active calibration phase.

**Claim 4 (Independent):**
A method for adaptive exercise thresholding using personalized biomechanical baselining, comprising:
- initiating a calibration phase upon commencement of an exercise protocol;
- monitoring a user's joint-angle deviations during a predefined initial subset of repetitions;
- capturing the maximum safe angular deviation achieved by the user during said subset;
- dynamically overwriting the global kinematic thresholds with the user's captured maximum angular deviation plus a predefined safety margin; and
- utilizing the dynamically updated thresholds to calculate a multi-factor Kinematic Quality Score for all subsequent repetitions.
