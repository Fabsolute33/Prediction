# CRESCENDO Prophet - Backend API
# Docker image for Cloud Run deployment

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY engine.py .
COPY matrix_engine.py .
COPY scraper.py .
COPY models.py .
COPY scheduler.py .
COPY expert_agent.py .
COPY firestore_service.py .

# Cloud Run requires PORT environment variable
ENV PORT=8080

# Run the API directly (Firestore doesn't need init)
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
