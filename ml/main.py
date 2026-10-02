"""ML inference service. Returns a MOCK prediction until the trained model is ready (week 4)."""
import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image

app = FastAPI()

# TODO (week 4): load the fine-tuned ResNet50 once at startup, e.g.
# model = torch.load("model.pt", map_location="cpu"); model.eval()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")
    # TODO: replace with real model inference
    return {"predictedBreed": "Labrador Retriever", "confidence": 0.87, "mock": True}
