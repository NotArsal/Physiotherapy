# FORM 2: PROVISIONAL PATENT SPECIFICATION
**TITLE OF INVENTION:** A Computer-Implemented Method for Reconstructing Occluded Skeletal Landmarks Using Adaptive Anthropometric Scaling to Improve Temporal Rehabilitation Classification.

---

## 1. FIELD OF THE INVENTION
The present invention relates generally to computer vision and machine learning applied to digital rehabilitation. More specifically, it relates to a computational method for dynamically imputing missing or occluded lower-body skeletal landmarks during monocular pose estimation by leveraging adaptive bi-acromial anthropometric scaling, thereby preventing tensor collapse and preserving the temporal classification accuracy of a neural network.

## 2. BACKGROUND OF THE INVENTION / PRIOR ART LIMITATIONS
Tele-rehabilitation systems increasingly rely on monocular webcams and edge-based spatial models (e.g., MediaPipe) to track patient movements in domestic environments. However, these systems suffer from a critical failure mode:
1. **Self-Occlusion and Proximity Cropping:** When a patient is seated for upper-body exercises or positioned too close to the camera, the lower extremities (hips, knees, ankles) drop below the field of view or the algorithm's visibility confidence threshold ($v < 0.5$).
2. **Temporal Sequence Corruption:** Standard temporal classifiers (such as Bidirectional Long Short-Term Memory [BiLSTM] networks) expect a continuous, fixed-size input tensor of geometric coordinates. When lower-body landmarks are missing or returned as zeros by the spatial extractor, the temporal sequence is corrupted, causing catastrophic drops in classification accuracy (often plunging below 30%) or causing the classification pipeline to crash entirely.
3. **Prior Art Failures:** Existing solutions typically halt processing when critical joints are missing, or rely on computationally expensive 3D depth-estimation models that cannot run in real-time on consumer edge devices (e.g., standard web browsers).

## 3. SUMMARY OF THE CORE TECHNICAL SOLUTION
The present invention solves the occlusion problem via a mathematically deterministic pre-inference imputation algorithm. Rather than halting the system or relying on heavy 3D prediction networks, the system reconstructs the missing lower-body coordinates using real-time anatomical anchoring.

1. **Bi-acromial Scaling:** The system dynamically computes a localized scaling factor based on the Euclidean distance between the patient's continuously visible shoulder landmarks (the bi-acromial distance).
2. **Vector Projection:** If the visibility of the hips, knees, or ankles falls below a critical threshold, the system mathematically imputes their Cartesian coordinates by projecting neutral, standing-posture vectors downwards from the visible torso. The magnitude of these vectors is strictly proportional to the calculated bi-acromial scale.
3. **Tensor Preservation:** This scaling ensures that the imputed lower-body landmarks maintain anatomically correct proportions relative to the patient's perceived depth and distance from the camera. The fully populated 99-feature geometric tensor is then safely passed into the BiLSTM temporal classifier.
4. **Measurable Technical Improvement:** By maintaining a normalized, proportional geometric tensor even during severe lower-body occlusion, this method has been shown to preserve sequence classification accuracy above 80% on edge devices, a significant technical improvement over state-of-the-art fallback methods.

---

## 4. FORMAL CLAIMS

**Claim 1 (Independent):**
A computer-implemented method for reconstructing occluded skeletal landmarks during monocular motion analysis to improve temporal classification, the method comprising:
- capturing a continuous sequence of two-dimensional image frames via a monocular optical sensor;
- extracting a plurality of spatial skeletal landmarks, including a pair of shoulder landmarks, from the image frames using a spatial extraction model;
- calculating a dynamic anthropometric scaling factor derived from the Euclidean distance between said pair of shoulder landmarks;
- detecting an occlusion event wherein the visibility confidence of one or more lower-extremity landmarks falls below a predefined threshold;
- dynamically imputing the geometric coordinates of said occluded lower-extremity landmarks by projecting scaled anatomical vectors, wherein the magnitude of said vectors is strictly proportional to the dynamic anthropometric scaling factor; and
- passing a fully populated geometric tensor containing both the extracted and imputed geometric coordinates to a temporal neural network for sequence classification.

**Claim 2 (Dependent on Claim 1):**
The method of Claim 1, wherein the dynamic anthropometric scaling factor continuously updates on a per-frame basis to account for changes in the subject's proximity to the monocular optical sensor, ensuring depth-invariant proportional imputation.

**Claim 3 (Dependent on Claim 1):**
The method of Claim 1, wherein the imputed geometric coordinates form a neutral anatomical posture matrix that prevents zero-value data corruption within the temporal neural network's sequential memory blocks.

**Claim 4 (Dependent on Claim 1):**
The method of Claim 1, wherein the entire spatial extraction, geometric imputation, and temporal classification pipeline executes locally within a client-side volatile memory environment without transmitting raw video data to an external server.
