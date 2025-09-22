# 🧠 AI-Powered Health Analytics Platform

A revolutionary health tracking application that combines GPT-4 artificial intelligence, statistical analysis, and modern web technologies to provide personalized health insights.

---

## 🚀 Key Features
- **GPT-4 Integration**: Advanced natural language processing for health data extraction.
- **Statistical Analysis**: Pearson correlation coefficients for pattern detection.  
- **Real-time Insights**: Instant AI-powered health recommendations.
- **Voice Interface**: Speech-to-text integration for seamless data entry.
- **Modern Architecture**: React + Flask + PostgreSQL full-stack implementation.

---

## 🔬 Technology Stack
- **Frontend**: React 18, Modern CSS, Web Speech API.
- **Backend**: Flask, OpenAI GPT-4 API, Statistical Analysis.
- **Database**: PostgreSQL with optimized health metrics schema.
- **AI/ML**: GPT-4, Pearson Correlation Analysis, Medical Research Integration.
- **Containerization**: Docker, Docker Compose.
- **CI/CD**: GitHub Actions with Docker Hub & DigitalOcean Deployment.

### 📦 Dockerfile Locations
- **Backend (Flask API)**
  - Production: `server/Dockerfile.prod`
  - Development: `server/Dockerfile.dev`
  - Testing: `server/Dockerfile.test`
- **Frontend (React App)**
  - Production: `client/Dockerfile.prod`
  - Development: `client/Dockerfile.dev`

Built for academic demonstration of advanced software engineering concepts.

---

# ⚙️ Development Setup

This project uses Docker for both development and testing. Follow these steps to set up your environment:

### **1. Prerequisites**
- Install **Docker** and **Docker Compose**.
- Ensure **Make** is installed on your machine.
- Clone this repository:
  ```bash
  git clone <repo-url>
  cd <repo-folder>
  ```
- Create a **.env** file from **.env.sample** and update the values.

### **2. Setup Development Environment**
Before starting the containers, copy the backend environment template and adjust it for your machine:

```bash
cp server/.env.dev.example server/.env.dev
# Edit server/.env.dev to add your local secrets if needed
```

A script **setup-dev.sh** is included to automate environment setup for new developers:
```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

This will:

- Build all development containers (frontend, backend, and db).
- Start the containers.

Expose:

- Frontend at: http://localhost:3000
- Backend at: http://localhost:5000

Helpful Makefile Commands:

- make dev-up — Start dev containers.

- make dev-down — Stop dev containers.

- make dev-logs — View container logs.

- make dev-rebuild — Rebuild and restart dev environment.

Prefer to run Docker Compose directly? The script wraps the following command:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 🐳 Run the full stack with Docker Compose

If you want to try the production build locally, a top-level `docker-compose.yml` is available.

1. Copy the sample environment file and update the values as needed:

   ```bash
   cp .env.example .env
   # Edit .env to add secrets such as OPENAI_API_KEY
   ```

2. Build and start the containers:

   ```bash
   docker compose up --build
   ```

   - Frontend: http://localhost:3000 (served by Nginx)
   - Backend API: http://localhost:5000

3. Stop the stack when you are done:

   ```bash
   docker compose down
   ```

The compose configuration builds the React frontend with the `REACT_APP_API_URL` value from `.env` and runs the Flask API with the same settings you use in production. A PostgreSQL container is included automatically.

# Testing Guide

Create a **.env.test** file from **.env.test.sample** and update the values.
Unit tests are executed in an isolated test environment using Pytest inside a Docker container:
```bash
make test
```

Test reports and coverage reports are generated in test-reports/.

Other test commands:
```bash
- make test-file FILE=tests/test_auth.py — Run a specific test file.
- make test-quick — Run quick health check tests.
```


# Deployment Guide
### **1. Overview**

- **CI (Continuous Integration):**
  - Runs all backend tests inside a Dockerized test environment.
  - Generates test reports and coverage reports as artifacts.

- **CD (Continuous Deployment):**
  - Builds a Docker image of the backend.
  - Pushes the image to **Docker Hub**: `sakjin/health-diary`.
  - (Optional) SSHs into your **DigitalOcean server** and redeploys containers using `docker compose`.

---

### **2. GitHub Secrets Setup**

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret**  
Add the following secrets:

| Name               | Value                                      |
|--------------------|--------------------------------------------|
| `DOCKER_USERNAME`  | `sakjin`                                   |
| `DOCKER_PASSWORD`  | Docker Hub Personal Access Token           |
| `DO_SERVER_IP`     | IP address of your DigitalOcean server     |
| `DO_SERVER_USER`   | SSH username (`root` or `ubuntu`)          |
| `DO_SERVER_SSH_KEY`| Private SSH key (contents of your `~/.ssh/id_rsa`) |

**Note:** Make sure your DigitalOcean server has your **public key** (`~/.ssh/id_rsa.pub`) in `~/.ssh/authorized_keys`.

---

### **3. Optional SSH Deployment**

The CD step to SSH into the server is **commented out** by default.  
To enable automatic deployment:
1. Open `.github/workflows/ci-cd.yml`.
2. Uncomment the following section:
   ```yaml
   - name: Deploy to DigitalOcean Server
     uses: appleboy/ssh-action@v1.0.3
     with:
       host: ${{ secrets.DO_SERVER_IP }}
       username: ${{ secrets.DO_SERVER_USER }}
       key: ${{ secrets.DO_SERVER_SSH_KEY }}
       script: |
         cd /path/to/your/deployment
         docker pull sakjin/health-diary:latest
         docker compose up -d
   ```