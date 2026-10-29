import io
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException

app = FastAPI(title="Dog Breed Classifier API")

# 1. Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 2. Load class names mapping
with open("class_names.json", "r") as f:
    class_names = json.load(f)

# 3. Instantiate model matching your trained architecture
model = models.resnet50(weights=None)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, len(class_names))

# 4. Load weights
model.load_state_dict(torch.load("dog_breed_resnet50_weights.pth", map_location=device))
model = model.to(device)
model.eval()

# 5. Preprocessing transforms
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded is not an image.")
    
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        pred_idx = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][pred_idx].item() * 100

    clean_breed = class_names[pred_idx].split("-", 1)[1].replace("_", " ")

    # Schema format expected by backend Express and MongoDB UploadedImage
    return {
        "predictedBreed": clean_breed,
        "confidence": round(confidence, 2)
    }