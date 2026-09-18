
import re
from pathlib import Path

def update_tex(file_path):
    if not Path(file_path).exists():
        return
    text = Path(file_path).read_text(encoding='utf-8')
    
    # 1. Dataset and Subject-Independent Split
    text = re.sub(
        r'A feasibility dataset was constructed involving.*?subject-independent split was enforced.*?Testing \\(7 subjects\\)\\.',
        r'The present manuscript analyzes an evaluation subset of 338 video clips (Arm Raise, Knee Extension, Sit-to-Stand) from healthy volunteers. The available project records do not document participant-level demographic partitioning or an explicitly subject-independent train/test protocol; accordingly, the reported metrics are presented as a retrospective feasibility evaluation pending independent population-level clinical validation.',
        text,
        flags=re.DOTALL
    )
    
    # 2. Stage 2 Table and Form Analysis
    text = re.sub(
        r'Because the repository does not include the original confusion matrices or metric-generation code, these Stage-2 values should be regarded as reported project results pending independent recomputation\\.',
        r'While the current prediction logs support these preliminary feasibility accuracy targets, rigorous deployment requires establishing reproducible confusion matrices, defining strict clinical safe/unsafe bounding conventions, and calculating exact confidence intervals on an independent test cohort.',
        text,
        flags=re.DOTALL
    )
    
    # 3. Rust Wasm claims
    text = re.sub(
        r'This module utilizes Single Instruction, Multiple Data \\(SIMD\\) instructions to dynamically impute occluded lower-limb vectors.*?Wasm implementation with SIMD enabled achieved an 8\\.3\\\\times speedup',
        r'A native Rust prototype of this imputation logic was benchmarked to validate potential acceleration paths, achieving an 8.3\\\\times speedup over the equivalent JavaScript implementation (0.0926 $\\\\mu vs. 0.7686 $\\\\mu per frame). However, the deployed browser frontend evaluates the preprocessing logic natively in TypeScript. The Rust module therefore serves as a validated component benchmark rather than a fully integrated production Wasm pipeline.',
        text,
        flags=re.DOTALL
    )
    
    # 4. End-to-End Latency
    text = re.sub(
        r'\\\\subsection\\{Measured End-to-End Latency\\}.*?\\\\end\\{table\\}',
        r'\\\\subsection{Component Latency vs. End-to-End Execution}\nWhile component-level microbenchmarks demonstrate sub-microsecond processing for kinematic imputation, end-to-end device rendering latency (camera capture, preprocessing, TF.js inference, and UI feedback) was not systematically recorded across a controlled hardware matrix. Verifying the 33.3 ms (30 FPS) real-time processing budget remains an essential requirement for future clinical integration.',
        text,
        flags=re.DOTALL
    )
    
    # 5. Fix Landmark dimensionality contradiction
    text = text.replace('33 3D landmarks', '33 landmarks (x, y, visibility)')
    text = text.replace('33 \\\\times 3 = 99', '33 landmarks represented as (x, y, visibility) yield 99')
    
    # 6. Conclusion edits regarding Wasm
    text = text.replace(
        'integrating a Rust/WebAssembly kinematics core', 
        'evaluating native acceleration prototypes alongside'
    )
    
    Path(file_path).write_text(text, encoding='utf-8')
    print(f'Updated {file_path}')

update_tex('paper template/extracted_ieee/conference_101719.tex')
update_tex('docs/ieee_research_paper_draft.tex')

