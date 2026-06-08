# PhysioTracker [![Edge AI](https://img.shields.io/badge/Edge%20AI-TensorFlow.js-FF6F00?logo=tensorflow)](https://github.com/NotArsal/Physiotherapy) [![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://physiotherapy-frontend.vercel.app)

> An Edge-Optimized Biomechanical Monitoring Framework for Automated Posture Correction & Physical Therapy.

PhysioTracker is a full-stack tele-rehabilitation system designed to provide objective, real-time biomechanical feedback to patients in their homes. It converts standard monocular webcams into high-precision, AI-powered skeletal trackers. By pushing heavy Deep Learning inference entirely to the Edge (Client's Browser), the system achieves zero-latency classification while preserving patient privacy and massively reducing cloud computing costs.

## Features

* **Zero-Latency Edge AI Inference:** Deep learning classification (BiLSTM) is executed entirely within the browser via TensorFlow.js (WebGL).
* **Ambient Fall Detection:** Optical, zero-wearable safety monitoring that uses a 33-point bounding box horizontal aspect ratio collapse to detect medical emergencies.
* **Adaptive Hysteresis-Based Form Tracking:** 10-second mandatory calibration phase calculates personal Range of Motion (ROM) baselines to guarantee true repetition counts.
* **Virtual Lower-Body Landmark Imputation:** Dynamically imputes neutral standing leg coordinates scaled to the shoulders via bi-acromial measurement.
* **Fatigue & Asymmetry Detection:** Monitors repetition velocity degradation and tracks left-right joint angular variance to ensure biomechanical symmetry.
* **Intelligent API Fallback:** The frontend automatically detects remote backend timeouts and seamlessly falls back to a local backend if available.

## Architecture

The system cleanly separates the Edge AI React Engine from the Microservice Backend:

* **Frontend (`/frontend`)**: React + TypeScript + TensorFlow.js. Handles all real-time MediaPipe skeletal rendering and Edge AI Inference.
* **Backend (`/backend`)**: Flask + MongoDB. A hyper-optimized, lightweight, stateless session logger and authentication microservice.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/)
* [Python 3.10](https://www.python.org/)

### Local Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/NotArsal/Physiotherapy.git
   cd Physiotherapy
   ```

2. **Start the Backend**
   ```sh
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python run.py
   ```
   *The API will run on `http://localhost:5000`.*

3. **Start the Frontend**
   ```sh
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` folder with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_domain"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   ```
   ```sh
   npm start
   ```
   *The App will run on `http://localhost:3000`.*

## Documentation

Detailed mathematical methodology and architecture diagrams can be found here:
* [Design Documentation & Math Methodology](docs/design_documentation.md)
* [System Architecture Diagrams](docs/system_architecture_diagrams.md)
* [Patent Claims Blueprint](docs/patent_claims_blueprint.md)
* [IEEE Research Paper Draft](docs/ieee_research_paper_draft.md)

## License

This project is open source and available under the MIT License.
