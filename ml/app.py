"""ML service: a thin Flask wrapper around pipeline.py.
Only the backend calls this. Contract: see ML_GUIDE.md Section 3."""
import os
from flask import Flask, jsonify, request
from PIL import Image, UnidentifiedImageError

app = Flask(__name__)
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
WEIGHTS = os.path.join(MODEL_DIR, "dog_breed_resnet50.pth")

# Load the model ONCE when the service starts, never per request.
# If the model file isn't there yet, run in mock mode so the backend isn't blocked.
if os.path.exists(WEIGHTS):
    from pipeline import DogBreedClassifier
    classifier = DogBreedClassifier(MODEL_DIR)
    MOCK = False
else:
    classifier = None
    MOCK = True
    app.logger.warning("No model file found in ml/models/. Running in MOCK mode.")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "modelLoaded": classifier is not None, "mock": MOCK})


@app.post("/predict")
def predict():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded (form field must be named 'file')"}), 400
    try:
        image = Image.open(file.stream)
        image.load()                       # actually read the pixels, so broken files fail here
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "File is not a readable image"}), 400

    if MOCK:
        return jsonify({
            "predictedBreed": "Labrador Retriever", "confidence": 0.87, "isConfident": True,
            "topPredictions": [{"breed": "Labrador Retriever", "confidence": 0.87}],
            "mock": True,
        })
    return jsonify(classifier.predict(image))