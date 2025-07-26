# Deployment Guide for Health Diary Backend (CI/CD with GitHub Actions)

This guide explains how to configure and use the **CI/CD pipeline** (`.github/workflows/ci-cd.yml`) for the Flask backend.

---

## **1. Overview**

- **CI (Continuous Integration):**
  - Runs all backend tests inside a Dockerized test environment.
  - Generates test reports and coverage reports as artifacts.

- **CD (Continuous Deployment):**
  - Builds a Docker image of the backend.
  - Pushes the image to **Docker Hub**: `sakjin/health-diary`.
  - (Optional) SSHs into your **DigitalOcean server** and redeploys containers using `docker compose`.

---

## **2. GitHub Secrets Setup**

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

## **3. Optional SSH Deployment**

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
