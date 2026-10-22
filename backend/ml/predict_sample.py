"""Quick check of the model without starting the backend: python backend/ml/predict_sample.py
Uses the same model code the backend uses (mlmain.py)."""
import os
from PIL import Image
from mlmain import ML_DIR, predict_image

if __name__ == "__main__":
    test_image = os.path.join(ML_DIR, "test_dog.jpg")
    result = predict_image(Image.open(test_image))
    print(f"Predicted Breed: {result['predictedBreed']} ({result['confidence']:.2f}%)")
