"""Flask API starter. Goal of milestone 1: prove every service can talk to each other."""
import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

db = MongoClient(os.environ["MONGO_URI"]).get_default_database()
ML_URL = os.environ["ML_URL"]


@app.get("/api/health")
def health():
    """Checks Mongo and the ML service. If this returns all 'ok', Docker is wired correctly."""
    status = {"backend": "ok"}
    try:
        db.command("ping")
        status["mongo"] = "ok"
    except Exception as e:
        status["mongo"] = f"error: {e}"
    try:
        requests.get(f"{ML_URL}/health", timeout=3).raise_for_status()
        status["ml"] = "ok"
    except Exception as e:
        status["ml"] = f"error: {e}"
    return jsonify(status)


@app.post("/api/predict")
def predict():
    """Receives an image from React, forwards it to the ML service, saves the result."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded (field name must be 'image')"}), 400
    img = request.files["image"]
    ml_resp = requests.post(
        f"{ML_URL}/predict",
        files={"file": (img.filename, img.stream, img.mimetype)},
        timeout=30,
    )
    result = ml_resp.json()
    # TODO (week 3-4): attach userId from JWT, save to UploadedImage collection
    return jsonify(result), ml_resp.status_code


# TODO: /api/auth/signup, /api/auth/login, /api/dogs, /api/favorites (see project plan)
