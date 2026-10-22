FROM python:3.11-slim
WORKDIR /app
# CPU-only PyTorch for the dog breed model in ml/: ~1 GB instead of 5 GB+. We don't need a GPU just to predict.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
# --timeout 60: give the worker time to load the model on startup
CMD ["gunicorn", "-b", "0.0.0.0:5000", "--timeout", "60", "--reload", "app:app"]
