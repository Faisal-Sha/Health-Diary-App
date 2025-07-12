# Backend Dockerfile for Flask API
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . ./

# Expose the backend port
EXPOSE 5000

# Start the Flask application
CMD ["python", "app.py"]