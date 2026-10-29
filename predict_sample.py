import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# 1. Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 2. Load class names mapping
with open("class_names.json", "r") as f:
    class_names = json.load(f)

# 3. Instantiate ResNet50 and update final classification layer
model = models.resnet50(weights=None)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, len(class_names))

# 4. Load your fine-tuned weights
model.load_state_dict(torch.load("dog_breed_resnet50_weights.pth", map_location=device))
model = model.to(device)
model.eval()

# 5. Define standard inference transform
inference_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def predict_image(image_path):
    img = Image.open(image_path).convert("RGB")
    input_tensor = inference_transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        pred_idx = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][pred_idx].item() * 100

    clean_breed = class_names[pred_idx].split("-", 1)[1].replace("_", " ")
    return clean_breed, confidence

if __name__ == "__main__":
    test_image = "test_dog.jpg"
    breed, conf = predict_image(test_image)
    print(f"Predicted Breed: {breed} ({conf:.2f}%)")