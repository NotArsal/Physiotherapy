<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/NotArsal/Physiotherapy">
    <img src="frontend/public/favicon.ico" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">PhysioTracker</h3>

  <p align="center">
    An Edge-Optimized Biomechanical Monitoring Framework for Automated Posture Correction & Physical Therapy.
    <br />
    <a href="https://github.com/NotArsal/Physiotherapy/tree/main/docs"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://physiotherapy-frontend.vercel.app">View Demo</a>
    ·
    <a href="https://github.com/NotArsal/Physiotherapy/issues">Report Bug</a>
    ·
    <a href="https://github.com/NotArsal/Physiotherapy/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
        <li><a href="#core-features">Core Features</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#system-architecture">System Architecture</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://physiotherapy-frontend.vercel.app)

PhysioTracker is a full-stack tele-rehabilitation system designed to provide objective, real-time biomechanical feedback to patients in their homes. It bridges the gap in remote physical therapy by converting standard monocular webcams into high-precision, AI-powered skeletal trackers. 

By pushing heavy Deep Learning inference entirely to the **Edge (Client's Browser)**, the system achieves zero-latency classification while preserving patient privacy and massively reducing cloud computing costs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![TensorFlow][TensorFlow]][TensorFlow-url]
* [![Flask][Flask]][Flask-url]
* [![MongoDB][MongoDB]][MongoDB-url]
* [![Firebase][Firebase]][Firebase-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Core Features

* **Zero-Latency Edge AI Inference**: Deep learning classification (BiLSTM) is executed entirely within the browser via **TensorFlow.js (WebGL)**, eliminating backend network latency and massive RAM usage.
* **Ambient Fall Detection**: Optical, zero-wearable safety monitoring that calculates $dy/dt$ nose drop velocity combined with 33-point bounding box horizontal aspect ratio collapse to detect medical emergencies. Includes a 10-second therapist alert protocol.
* **Adaptive Hysteresis-Based Form Tracking**: Incorporates a 10-second mandatory calibration phase to calculate personal Range of Motion (ROM) baselines. Uses an Exponential Moving Average (EMA) and dual-threshold state machine to guarantee true repetition counts.
* **Virtual Lower-Body Landmark Imputation**: For close-up or seated views, the frontend dynamically imputes neutral standing leg coordinates scaled to the shoulders via bi-acromial measurement, keeping classification accuracy exceptionally high (>80%).
* **Fatigue & Asymmetry Detection**: Automatically monitors repetition velocity degradation (>30% slowdown) and tracks left-right joint angular variance (e.g., uneven elbow angles) to ensure biomechanical symmetry.
* **Intelligent API Fallback**: The frontend automatically detects remote backend timeouts and seamlessly falls back to a healthy local backend (`http://localhost:5000`) if available.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

For deployment on Render or local execution, Python 3.10 is required. Node.js is required for the frontend.
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/NotArsal/Physiotherapy.git
   cd Physiotherapy
   ```
2. **Backend Setup**
   ```sh
   cd backend
   python -m venv .venv
   .venv\Scripts\activate   # (On Mac/Linux: source .venv/bin/activate)
   pip install -r requirements.txt
   python run.py
   ```
   *The backend will start on `http://localhost:5000`. It acts as a lightweight, stateless MongoDB session logger.*

3. **Frontend Setup**
   ```sh
   cd ../frontend
   npm install
   ```
4. Create a `.env` file in the `frontend` directory and enter your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
5. Start the React development server
   ```sh
   npm start
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->
## System Architecture

Our repository layout cleanly separates the Edge AI React Engine from the Microservice Backend:

```text
Physiotherapy-project-main/
|-- backend/
|   |-- app.py                  # Core Flask & MongoDB routes
|   |-- run.py                  # Entry point
|   `-- requirements.txt        # Stripped of heavy ML packages
|-- frontend/
|   |-- public/
|   |   `-- model/              # WebGL converted Edge AI Models
|   |-- src/
|   |   |-- components/         # React UI & Canvas Rendering
|   |   |-- services/           # TF.js & API integrations
|   |   `-- utils/              # Pose Extraction & Heuristics
|   |-- package.json
|   `-- tsconfig.json
|-- docs/                       # IEEE drafts, Patents, & Design Docs
`-- CHANGELOG_AUDIT.md          # History of audits & optimizations
```

For deeper insights into the mathematical methodology and patent claims, refer to the [System Architecture Diagrams](docs/system_architecture_diagrams.md) and [Design Documentation](docs/design_documentation.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Integrate MediaPipe spatial extraction
- [x] Develop BiLSTM Temporal Classifier
- [x] Decouple backend ML and migrate to TensorFlow.js (Edge AI)
- [x] Implement Wearable-Free Ambient Fall Detection
- [x] Add MongoDB Atlas persistent cloud logging
- [ ] Add automated API and UI testing suites
- [ ] Build the final Therapist Dashboard to close the prescription loop

See the [open issues](https://github.com/NotArsal/Physiotherapy/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Arsalan Shaikh - [LinkedIn](https://linkedin.com/in/arsalan-shaikh) - shaik.arsalan@example.com

Project Link: [https://github.com/NotArsal/Physiotherapy](https://github.com/NotArsal/Physiotherapy)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose.html)
* [TensorFlow.js](https://www.tensorflow.org/js)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/NotArsal/Physiotherapy.svg?style=for-the-badge
[contributors-url]: https://github.com/NotArsal/Physiotherapy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/NotArsal/Physiotherapy.svg?style=for-the-badge
[forks-url]: https://github.com/NotArsal/Physiotherapy/network/members
[stars-shield]: https://img.shields.io/github/stars/NotArsal/Physiotherapy.svg?style=for-the-badge
[stars-url]: https://github.com/NotArsal/Physiotherapy/stargazers
[issues-shield]: https://img.shields.io/github/issues/NotArsal/Physiotherapy.svg?style=for-the-badge
[issues-url]: https://github.com/NotArsal/Physiotherapy/issues
[license-shield]: https://img.shields.io/github/license/NotArsal/Physiotherapy.svg?style=for-the-badge
[license-url]: https://github.com/NotArsal/Physiotherapy/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/arsalan-shaikh
[product-screenshot]: https://via.placeholder.com/800x400?text=PhysioTracker+Dashboard
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[TensorFlow]: https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white
[TensorFlow-url]: https://www.tensorflow.org/
[Flask]: https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white
[Flask-url]: https://flask.palletsprojects.com/
[MongoDB]: https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/
[Firebase]: https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white
[Firebase-url]: https://firebase.google.com/
