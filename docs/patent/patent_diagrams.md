# FORM 2: PROVISIONAL PATENT SPECIFICATION (DIAGRAMS)

When submitting your patent application, the examiner requires detailed "Flowcharts of the Algorithm". Because we have narrowed the scope of the patent to focus exclusively on the **Virtual Landmark Reconstruction Algorithm**, the following diagram breaks down that specific mathematical process step-by-step. 

This proves to the examiner that this is a concrete, reproducible technical method.

---

## FIG 1: Method for Adaptive Anthropometric Imputation of Occluded Landmarks

```mermaid
graph TD
    A[Start Frame Processing] --> B[Client-Side Optical Sensor Captures 2D Image]
    B --> C[Spatial Extraction Model Identifies Raw Coordinate Matrix]
    
    C --> D[Extract Left Acromion and Right Acromion Coordinates]
    D --> E[Calculate Euclidean Bi-Acromial Distance Scalar 'S']
    
    C --> F{Check Lower-Extremity Visibility}
    F -- Visibility > 0.5 --> G[Pass Raw Geometric Tensor to Classifier]
    
    F -- Visibility < 0.5 (Occlusion Detected) --> H[Initiate Dynamic Imputation Module]
    
    H --> I[Anchor Imputation Vectors to Visible Pelvic or Lumbar Nodes]
    I --> J[Project Anatomical Vectors Downward proportional to Scalar 'S']
    
    J --> K[Construct Reconstructed Lower-Body Matrix]
    K --> L[Merge Reconstructed Matrix with Upper-Body Matrix]
    
    L --> M[Output Fully Populated, Normalized 99-Feature Geometric Tensor]
    M --> N[Pass Geometric Tensor to BiLSTM Temporal Sequence Buffer]
    
    G --> N
    N --> O[Execute Temporal Classification without Zero-Data Corruption]
    O --> A
```

---

### How to use this for filing:
1. **Reference it in the text:** In your Detailed Description, you will say *"Referring now to FIG. 1, a method for dynamic occlusion imputation via anthropometric scaling is shown..."*
2. **Convert to Drawings:** If you file a formal Non-Provisional Patent later, a patent draftsperson will take this exact logical flow and convert it into standard black-and-white box drawings required by the USPTO or Indian Patent Office. For a Provisional Patent (PPA), this flowchart as-is is perfectly acceptable to establish your priority date!
