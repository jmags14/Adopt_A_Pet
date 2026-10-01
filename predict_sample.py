# core library 
import torch
# supplies pre-trained model architectures such as ResNet
from torchvision import models, transforms
#python imaging library (PIL), open, manipulate, and decode 
from PIL import Image

# 1. Load the pre-trained ResNet50 model
weights = models.ResNet50_Weights.DEFAULT
model = models.resnet50(weights=weights)
model.eval()

# 2. Preprocess the image using the model's standard transforms
preprocess = weights.transforms()
img = Image.open("test_dog.jpg").convert("RGB")
batch = preprocess(img).unsqueeze(0)

# 3. Predict class probabilities
with torch.no_grad():
    prediction = model(batch).squeeze(0).softmax(0)
    class_id = prediction.argmax().item()
    score = prediction[class_id].item()
    category_name = weights.meta["categories"][class_id]

print(f"Predicted Class: {category_name} ({score * 100:.2f}%)")
