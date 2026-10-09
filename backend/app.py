"""Flask API starter. Goal of milestone 1: prove every service can talk to each other."""
import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient


import datetime
import bcrypt
import jwt


from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
CORS(app)


client = MongoClient(os.environ["MONGO_URI"])
db = client["adoptapet"]
# ML_URL = os.environ["ML_URL"]
# JWT_SECRET = os.environ("JWT_SECRET_KEY")




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


@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""


    if not email or "@" not in email:
        return jsonify({"error" : "A valid email is required"}), 400
    if len(password) < 8:
        return jsonify({"error" : "Password must be at least 8 characters"}), 400
    if db.users.find_one({"email" : email}):
        return jsonify({"error" : "Email already registered"}), 409


    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    now = datetime.datetime.now(datetime.timezone.utc)
    result = db.users.insert_one({
        "email" : email,
        "password" : password_hash.decode("utf-8"),
        "createdAt" : now
    })


    return jsonify({"message" : "Account created successfully"}), 201


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""


    user = db.users.find_one({"email" : email})


    if user is None:
        return jsonify({"error: Invalid email or password"}), 401


    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        return jsonify({"error" : "Invalid email or password"}), 401


    return jsonify({"message" : "Login successful"}), 200


@app.get("/api/dogs")
def get_dogs():
    dogs = list(db.dogs.find().limit(20))


    for dog in dogs:
        dog["id"] = str(dog.pop("_id"))


    return jsonify(dogs), 200


@app.get("/api/favorites")
def get_favorites():
    return jsonify({"message": "Not implemented yet"}), 501


@app.post("/api/favorites")
def add_favorite():
    return jsonify({"message": "Not implemented yet"}), 501


@app.delete("/api/favorites")
def remove_favorite():
    return jsonify({"message": "Not implemented yet"}), 501


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


if __name__ == "__main__":
    app.run(debug=True, port=5001)

# TODO: /api/auth/signup, /api/auth/login, /api/dogs, /api/favorites (see project plan)


