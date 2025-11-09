# Railway deployment for Django backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (build tools for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy Django project only (exclude frontend)
COPY backend_django/ /app/

# Startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "/app/start.sh"]
