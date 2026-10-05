FROM python:3.11-slim
WORKDIR /app
# CPU-only PyTorch: ~1 GB instead of 5 GB+. We don't need a GPU just to predict.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
# 1 worker = the model is loaded into memory once. Threads let it handle a few requests at a time.
CMD ["gunicorn", "-b", "0.0.0.0:8000", "--workers", "1", "--threads", "4", "--timeout", "60", "app:app"]