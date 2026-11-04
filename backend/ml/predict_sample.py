"""Run the bundled sample image through the same model used by the API.

From the backend directory, run: python -m ml.predict_sample
"""
from pathlib import Path

from PIL import Image

from ml.mlmain import predict_image

sample = Path(__file__).with_name("test_dog.jpg")
with Image.open(sample) as image:
    print(predict_image(image))
