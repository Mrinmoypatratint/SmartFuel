FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng libglib2.0-0 libgl1 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /service
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
COPY static/ ./static/
COPY seed_data/ ./seed_data/
COPY samples/ ./samples/
RUN groupadd -r smartfuel && useradd --no-log-init -r -g smartfuel -d /service smartfuel && mkdir -p /service/storage && chown -R smartfuel:smartfuel /service
USER smartfuel
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
