"""Flask API starter. Goal of milestone 1: prove every service can talk to each other."""
import os
import requests
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from pymongo import MongoClient


import datetime
import bcrypt
import jwt
from functools import wraps
from bson import ObjectId
from PIL import Image, UnidentifiedImageError


from ml.mlmain import MOCK, predict_image  # dog breed model, loaded once when the backend starts


from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

from email_validator import validate_email, EmailNotValidError
from pymongo.errors import DuplicateKeyError



app = Flask(__name__)
CORS(app)






client = MongoClient(os.environ["MONGO_URI"])
db = client["adoptapet"]

db.users.create_index("email", unique=True)

JWT_SECRET = os.environ["JWT_SECRET_KEY"]






def require_auth(f):
   @wraps(f)
   def wrapper(*args, **kwargs):
       header = request.headers.get("Authorization", "")
       if not header.startswith("Bearer "):
           return jsonify({"error": "Missing token"}), 401
       try:
           payload = jwt.decode(header[7:], JWT_SECRET, algorithms=["HS256"])
       except jwt.ExpiredSignatureError:
           return jsonify({"error": "Token expired"}), 401
       except jwt.InvalidTokenError:
           return jsonify({"error": "Invalid token"}), 401
       g.user_id = payload["sub"]
       return f(*args, **kwargs)
   return wrapper














@app.get("/api/health")
def health():
   """Checks Mongo and the ML model. If this returns all 'ok', Docker is wired correctly."""
   status = {"backend": "ok"}
   try:
       db.command("ping")
       status["mongo"] = "ok"
   except Exception as e:
       status["mongo"] = f"error: {e}"
   # the model runs inside the backend (ml/mlmain.py); mock means the weights file is missing
   status["ml"] = "mock (no weights file in backend/ml/)" if MOCK else "ok"
   return jsonify(status)

@app.get("/api/location/zip")
def coordinates_to_zip():
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])

        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400

        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
                "zoom": 18
            },
            headers={
                "User-Agent": "AdoptAPetStudentProject/1.0"
            },
            timeout=10
        )
        response.raise_for_status()

        address = response.json().get("address", {})
        zip_code = address.get("postcode", "").split("-")[0]

        if not (len(zip_code) == 5 and zip_code.isdigit()):
            return jsonify({"error": "ZIP code unavailable"}), 404

        return jsonify({"zip": zip_code}), 200

    except (KeyError, ValueError):
        return jsonify({"error": "Invalid coordinates"}), 400
    except requests.RequestException:
        return jsonify({"error": "Location lookup failed"}), 502
















@app.post("/api/auth/signup")
def signup():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # Validate email
    try:
        email = validate_email(
            email,
            check_deliverability=False
        ).normalized.lower()
    except EmailNotValidError:
        return jsonify({
            "error": "Please enter a valid email address"
        }), 400

    # Validate password
    if len(password) < 8:
        return jsonify({
            "error": "Password must be at least 8 characters"
        }), 400

    # Check for an existing account
    if db.users.find_one({"email": email}):
        return jsonify({
            "error": "Email already registered"
        }), 409

    # Hash password
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )

    now = datetime.datetime.now(datetime.timezone.utc)

    # Save account
    try:
        result = db.users.insert_one({
            "email": email,
            "password": password_hash.decode("utf-8"),
            "createdAt": now
        })
    except DuplicateKeyError:
        return jsonify({
            "error": "Email already registered"
        }), 409

    # Create authentication token
    token = jwt.encode(
        {
            "sub": str(result.inserted_id),
            "exp": now + datetime.timedelta(days=1)
        },
        JWT_SECRET,
        algorithm="HS256"
    )

    return jsonify({"token": token}), 201







@app.post("/api/auth/login")
def login():
   data = request.get_json(silent=True) or {}
   email = (data.get("email") or "").strip().lower()
   password = data.get("password") or ""








   user = db.users.find_one({"email" : email})








   if user is None:
       return jsonify({"error": "Invalid email or password"}), 401
















   if not bcrypt.checkpw(
       password.encode("utf-8"),
       user["password"].encode("utf-8")
   ):
       return jsonify({"error" : "Invalid email or password"}), 401
















   # FIX: return a JWT (outline says login returns a JWT), built inline
   token = jwt.encode(
       {
           "sub": str(user["_id"]),
           "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
       },
       JWT_SECRET,
       algorithm="HS256",
   )
   return jsonify({"token" : token}), 200


@app.get("/api/dogs")
def get_dogs():
    return search_dogs(request.args)

def format_dog(animal, included):
    attributes = animal.get("attributes") or {}

    def get_value(*keys):
        for key in keys:
            value = attributes.get(key)
            if value not in (None, ""):
                return value
        return None

    breed = get_value("breedPrimary", "breedSecondary") or "Unknown breed"

    photo = (
        get_value("pictureThumbnailUrl")
        or get_value("pictureUrl")
        or ""
    )

    location = (
        get_value("location")
        or get_value("postalcode")
        or "Location unavailable"
    )

    return {
        "id": str(animal.get("id", "")),
        "name": get_value("name") or "Name unavailable",
        "breed": breed,
        "location": location,
        "age": get_value("ageGroup") or "Unknown",
        "weight": get_value("sizeGroup") or "Unknown",
        "sex": get_value("sex") or "Unknown",
        "image": photo,
        "description": get_value("descriptionText") or "",
        "url": get_value("url")
    }


def search_dogs(params):
    # 1. Read the search filters.
    zip_code = params.get("zip", "").strip()
    breed = params.get("breed", "").strip()


    try:
        radius = int(params.get("radius", "50"))
        page = int(params.get("page", "1"))
    except ValueError:
        return jsonify({
            "error": "Radius and page must be whole numbers"
        }), 400


    # 2. Check the inputs.
    if len(zip_code) != 5 or not zip_code.isascii() or not zip_code.isdigit():
        return jsonify({
            "error": "Enter a five-digit US ZIP code"
        }), 400


    if radius not in (10, 25, 50, 100):
        return jsonify({
            "error": "Choose a radius of 10, 25, 50, or 100 miles"
        }), 400


    if page < 1:
        return jsonify({"error": "Page must be at least 1"}), 400


    # 3. Apply the location and radius.
    search_data = {
        "filterRadius": {
            "postalcode": zip_code,
            "miles": radius
        }
    }


    gender = params.get("gender", "").strip().title()
    age = params.get("age", "").strip().title()


    if gender and gender not in ("Male", "Female"):
        return jsonify({
            "error": "Gender must be Male or Female"
        }), 400


    if age and age not in ("Baby", "Young", "Adult", "Senior"):
        return jsonify({
            "error": "Age must be Baby, Young, Adult, or Senior"
        }), 400






    # 4. Apply the breed filter only when one was selected.
    # Match either the primary or secondary breed.
    # Build the optional filters.
    filters = []
    conditions = []




    if breed:
        filters.extend([
            {
                "fieldName": "animals.breedPrimary",
                "operation": "equal",
                "criteria": breed
            },
            {
                "fieldName": "animals.breedSecondary",
                "operation": "equal",
                "criteria": breed
            }
        ])
        conditions.append("(1 OR 2)")




    if gender:
        filters.append({
            "fieldName": "animals.sex",
            "operation": "equal",
            "criteria": gender
        })
        conditions.append(str(len(filters)))




    if age:
        filters.append({
            "fieldName": "animals.ageGroup",
            "operation": "equal",
            "criteria": age
        })
        conditions.append(str(len(filters)))




    if filters:
        search_data["filters"] = filters
        search_data["filterProcessing"] = " AND ".join(conditions)




   




    # 5. Search RescueGroups.
    try:
        response = requests.post(
            f'{os.environ["RESCUEGROUPS_API_URL"].rstrip("/")}'
            "/public/animals/search/available/dogs/",
            headers={
                "Authorization": os.environ["RESCUEGROUPS_API_KEY"],
                "Content-Type": "application/vnd.api+json"
            },
            params={
                "limit": 20,
                "page": page,
                "include": "locations"
            },
            json={"data": search_data},
            timeout=30
        )




        response.raise_for_status()
        result = response.json()




    except requests.exceptions.HTTPError as error:
        return jsonify({
            "error": "RescueGroups rejected the request",
            "status": error.response.status_code,
            "details": error.response.text
    }),     502




    except requests.exceptions.RequestException as error:
        print("RescueGroups connection error:", str(error))




        return jsonify({"error": "Could not connect to RescueGroups"}), 502
    except ValueError:
        return jsonify({"error": "RescueGroups returned invalid data"}), 502




    included = result.get("included") or []


    dogs = [
        format_dog(animal, included)
        for animal in (result.get("data") or [])
    ]


    return jsonify({
        "dogs": dogs,
        "meta": result.get("meta") or {}
    }), 200








@app.get("/api/dogs/<dog_id>")
def get_dog_details(dog_id):
    # Check that the ID contains only digits.
    if not dog_id.isascii() or not dog_id.isdigit():
        return jsonify({"error": "Invalid dog ID"}), 400




    try:
        response = requests.get(
            f'{os.environ["RESCUEGROUPS_API_URL"].rstrip("/")}'
            f"/public/animals/{dog_id}",
            headers={
                "Authorization": os.environ["RESCUEGROUPS_API_KEY"],
                "Content-Type": "application/vnd.api+json"
            },
            params={
                "include": "pictures,breeds,orgs,locations,statuses"
            },
            timeout=30
        )




        if response.status_code == 404:
            return jsonify({"error": "Dog listing not found"}), 404




        response.raise_for_status()
        result = response.json()




    except requests.exceptions.Timeout:
        return jsonify({"error": "RescueGroups took too long to respond"}), 504




    except requests.exceptions.HTTPError as error:
        return jsonify({
            "error": "RescueGroups rejected the request",
            "status": error.response.status_code,
            "details": error.response.text
        }), 502




    except requests.exceptions.RequestException:
        return jsonify({"error": "Could not retrieve dog details"}), 502




    except ValueError:
        return jsonify({"error": "RescueGroups returned invalid data"}), 502




    if not result.get("data"):
        return jsonify({"error": "Dog listing not found"}), 404




    return jsonify(result), 200








def favorite_to_json(fav):
   """Turns a Mongo favorite document into something jsonify can handle."""
   return {
       "id": str(fav["_id"]),
       "rescuegroupID": fav["rescuegroupID"],
       "name": fav["name"],
       "photoURL": fav.get("photoURL"),
       "breed": fav.get("breed"),
       "url": fav.get("url"),
       "savedAt": fav["savedAt"].isoformat(),
   }
















@app.get("/api/favorites")
@require_auth
def get_favorites():
   favs = db.favorites.find({"userId": ObjectId(g.user_id)}).sort("savedAt", -1)
   return jsonify([favorite_to_json(f) for f in favs]), 200
















@app.post("/api/favorites")
@require_auth
def add_favorite():
   data = request.get_json(silent=True) or {}
   rescuegroup_id = str(data.get("rescuegroupID") or "").strip()
   name = (data.get("name") or "").strip()








   if not rescuegroup_id or not name:
       return jsonify({"error": "rescuegroupID and name are required"}), 400








   user_id = ObjectId(g.user_id)








   # don't let the same user save the same dog twice
   if db.favorites.find_one({"userId": user_id, "rescuegroupID": rescuegroup_id}):
       return jsonify({"error": "Already in favorites"}), 409








   favorite = {
       "userId": user_id,
       "rescuegroupID": rescuegroup_id,
       "name": name,
       "photoURL": data.get("photoURL"),
       "breed": data.get("breed"),
       "url": data.get("url"),
       "savedAt": datetime.datetime.now(datetime.timezone.utc),
   }
   result = db.favorites.insert_one(favorite)
   favorite["_id"] = result.inserted_id
   return jsonify(favorite_to_json(favorite)), 201
















@app.delete("/api/favorites/<id>")
@require_auth
def remove_favorite(id):
   if not ObjectId.is_valid(id):
       return jsonify({"error": "Invalid favorite id"}), 400








   # filtering by userId means you can only delete your own favorites
   result = db.favorites.delete_one({"_id": ObjectId(id), "userId": ObjectId(g.user_id)})
   if result.deleted_count == 0:
       return jsonify({"error": "Favorite not found"}), 404
   return jsonify({"message": "Removed"}), 200








@app.get("/api/me")
@require_auth
def get_my_profile():
    user = db.users.find_one(
        {"_id": ObjectId(g.user_id)},
        {"password": 0}
    )




    if user is None:
        return jsonify({"error": "User not found"}), 404




    user["id"] = str(user.pop("_id"))




    return jsonify(user), 200

@app.post("/api/predict")
def predict():
    # Check the uploaded file.
    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded (field name must be 'image')"
        }), 400


    img = request.files["image"]


    if not (img.mimetype or "").startswith("image/"):
        return jsonify({
            "error": "File uploaded is not an image"
        }), 400


    try:
        image = Image.open(img.stream)
        image.load()
    except (UnidentifiedImageError, OSError):
        return jsonify({
            "error": "File is not a readable image"
        }), 400


    # Predict the breed.
    prediction = predict_image(image)


    if not isinstance(prediction, dict):
        return jsonify({
            "error": "The model returned an unexpected result"
        }), 500


    # This assumes your ML result uses the key "breed".
    breed = prediction.get("breed")


    if not isinstance(breed, str) or not breed.strip():
        return jsonify({
            "error": "The model did not return a usable breed"
        }), 500


    # Read ZIP, radius, and other filters from the uploaded form.
    params = request.form.to_dict()
    params["breed"] = breed.strip()


    # Search for dogs using the predicted breed.
    search_response, status_code = search_dogs(params)
    search_result = search_response.get_json()


    if status_code != 200:
        return jsonify({
            "prediction": prediction,
            **search_result
        }), status_code


    # Send the prediction and matching dogs to the frontend.
    return jsonify({
        "prediction": prediction,
        "dogs": search_result["dogs"],
        "meta": search_result["meta"]
    }), 200


if __name__ == "__main__":
   app.run(debug=True, port=5001)
