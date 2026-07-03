# FORM 2: PROVISIONAL PATENT SPECIFICATION (DIAGRAMS)

When submitting your patent application, the examiner will want to see "Flowcharts of the Algorithm" rather than standard software architecture diagrams. These diagrams demonstrate the specific *methods* and *processes* your system executes, proving it is a novel technical solution rather than an abstract idea.

You can use these flowcharts in your application (many patent attorneys use Mermaid or similar tools to generate the final black-and-white vector graphics required for formal filings).

---

## FIG 1: The Zero-Latency Edge Pipeline & Imputation Method
This diagram illustrates the core processing loop, specifically highlighting the novel **Dynamic Occlusion Imputation** method claimed in the specification.

```mermaid
graph TD
    A[Start Active Session] --> B[Capture Frame via Client Optical Sensor]
    B --> C[Edge Spatial Model: Extract 33 Raw Landmarks]
    
    C --> D{Are Lower Extremities Occluded?}
    D -- Yes (Visibility < 0.5) --> E[Calculate Bi-Acromial Scaling Factor]
    E --> F[Execute Dynamic Imputation Algorithm]
    F --> G[Generate 99-Feature Geometric Tensor]
    D -- No --> G
    
    G --> H[Push to Rolling 30-Frame Sequence Buffer]
    H --> I[Edge Temporal Model: BiLSTM Inference]
    I --> J[Classify Exercise Phase & Count Repetition]
    J --> B
```

---

## FIG 2: Contextual Safety Filter & Fall Suppression
This diagram illustrates how the system intelligently suppresses false-positive alerts, a core claim of the invention.

```mermaid
graph TD
    A[Extract Spatial Landmarks] --> B[Calculate Cranial Vertical Drop Velocity]
    B --> C{Drop Velocity > Threshold?}
    
    C -- Yes --> D[Query State Management Module]
    D --> E{Is Active Protocol Floor-Based?}
    
    E -- Yes e.g. Glute Bridge --> F[Suppress Emergency Alert]
    F --> G[Log 'Expected Biomechanical Baseline']
    
    E -- No e.g. Squat --> H{Is System in Setup Phase?}
    H -- Yes --> F
    
    H -- No --> I[Trigger Emergency Protocol]
    I --> J[Halt Session & Notify Clinician]
    
    C -- No --> K[Continue Normal Processing]
```

---

## FIG 3: Dynamic Personalized Biomechanical Calibration
This diagram proves the algorithm adapts to the specific patient rather than using hardcoded textbook thresholds, forming the basis for the multi-factor scoring claim.

```mermaid
graph TD
    A[Initiate Exercise Protocol] --> B[Enter 10-Second Calibration Phase]
    B --> C[User Performs Initial Baseline Repetitions]
    
    C --> D[Track Maximum Safe Angular Deviations]
    D --> E[End Calibration Phase]
    
    E --> F[Calculate Personalized Thresholds \n e.g. Max Spine Angle + 10 deg]
    F --> G[Overwrite Global Protocol Thresholds]
    
    G --> H[Commence Kinematic Quality Scoring KQS]
    H --> I[Evaluate Subsequent Reps Against Personalized Baseline]
```

---

### How to use these for filing:
1. **Reference them in the text:** In your Detailed Description, you will say *"Referring now to FIG. 1, a method for dynamic occlusion imputation is shown wherein..."*
2. **Convert to Drawings:** If you file a formal Non-Provisional Patent later, a patent draftsperson will take these exact logical flows and convert them into the standard black-and-white box drawings required by the USPTO or Indian Patent Office. For a Provisional Patent (PPA), these flowcharts as-is are perfectly acceptable to establish your priority date!
