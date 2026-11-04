FROM python:3.11-slim
WORKDIR /app
# CPU-only PyTorch for the dog breed model in ml/: ~1 GB instead of 5 GB+. We don't need a GPU just to predict.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
# The FastAPI app hosts the existing backend routes and the local ML predictor.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]
