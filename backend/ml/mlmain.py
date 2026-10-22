"""Dog breed classifier. Runs inside the backend: backend/app.py imports predict_image()
and serves it at POST /api/predict. The model is loaded ONCE when the backend starts, never per request."""
import json
import os
import torch
import torch.nn as nn
from torchvision import models, transforms

# Paths are relative to this file, so it works no matter where the backend is started from
ML_DIR = os.path.dirname(os.path.abspath(__file__))
CLASS_NAMES_PATH = os.path.join(ML_DIR, "class_names.json")
WEIGHTS_PATH = os.path.join(ML_DIR, "dog_breed_resnet50_weights.pth")

# 1. Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 2. Load class names mapping
with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

# 3. Instantiate model matching your trained architecture
model = models.resnet18(weights=None)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, len(class_names))

# 4. Load weights. The .pth file is gitignored, so if it's missing
# run in mock mode instead of crashing, so the backend isn't blocked.
MOCK = not os.path.exists(WEIGHTS_PATH)
if MOCK:
    print(f"WARNING: {WEIGHTS_PATH} not found. Running in MOCK mode.")
else:
    model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=device))
model = model.to(device)
model.eval()

# 5. Preprocessing transforms
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def predict_image(image):
    """Takes a PIL image, returns the predicted breed and confidence (0-100)."""
    if MOCK:
        return {"predictedBreed": "Labrador Retriever", "confidence": 87.0, "mock": True}

    tensor = transform(image.convert("RGB")).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        pred_idx = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][pred_idx].item() * 100

    clean_breed = class_names[pred_idx].split("-")[-1].replace("_", " ")

    # Schema format expected by the backend's /api/predict (backend/app.py) and MongoDB UploadedImage
    return {
        "predictedBreed": clean_breed,
        "confidence": round(confidence, 2)
    }
