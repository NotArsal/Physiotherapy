# 1. Kubernetes and Helm Migration

Date: 2026-07-07

## Status

Accepted

## Context

The Physiotherapy Exercise Monitor was originally developed to be deployed on PaaS providers like Vercel and Render. While this allowed for rapid prototyping, it presented limitations for scaling, managing complex environment variables (such as Firebase credentials and Database URLs), and unifying the deployment of the frontend and backend together.

To ensure production-readiness, scalability, and ease of deployment across cloud providers, the project needs a robust container orchestration strategy.

## Decision

We will adopt **Kubernetes** as our orchestration platform and use **Helm** to manage the Kubernetes resources.

1. **Dockerization**: Both the React frontend and Flask backend are containerized using `Dockerfile`s. The frontend uses a multi-stage build (Node to Nginx) for optimal serving.
2. **Helm Chart**: A unified Helm chart (`k8s/physio-chart`) is introduced to deploy both services simultaneously.
3. **Configuration Management**: Secrets (like Firebase credentials and database connections) are abstracted into `values.yaml` and Kubernetes Secrets, decoupling them from the source code.

## Consequences

- **Pros**: 
  - Standardized deployment across any cloud provider (AWS EKS, GCP GKE, Azure AKS, or local Minikube).
  - Easy rollbacks and versioning using Helm.
  - unified infrastructure as code.
- **Cons**: 
  - Increased complexity in local development and initial setup.
  - Requires Kubernetes knowledge to operate and troubleshoot.
