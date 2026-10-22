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
load_dotenv()  # FIX: loads backend/.env automatically (was "file.env")



app = Flask(__name__)
CORS(app)



client = MongoClient(os.environ["MONGO_URI"])
db = client["adoptapet"]
JWT_SECRET = os.environ["JWT_SECRET_KEY"]  # FIX: uncommented, square brackets



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








   # FIX: return a JWT (outline says signup returns a JWT), built inline
   token = jwt.encode(
       {
           "sub": str(result.inserted_id),
           "exp": now + datetime.timedelta(days=1),
       },
       JWT_SECRET,
       algorithm="HS256",
   )
   return jsonify({"token" : token}), 201




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
    # 1. Read the filters send by react
    zip_code = request.args.get("zip", "").strip()
    breed = request.args.get("breed", "").strip()


    try:
        radius = int(request.args.get("radius", "50"))
        page = int(request.args.get("page", "1"))
    except ValueError:
        return jsonify({"error": "Radius and page must be whole numbers"}), 400


    # 2. Check the inputs.
    if len(zip_code) != 5 or not zip_code.isascii() or not zip_code.isdigit():
       return jsonify({"error": "Enter a five-digit US ZIP code"}), 400


    if radius not in (10, 25, 50, 100):
        return jsonify({"error": "Choose a radius of 10, 25, 50, or 100 miles"}), 400


    if page < 1:
        return jsonify({"error": "Page must be at least 1"}), 400


    # 3. Always apply the location and radius.
    search_data = {
        "filterRadius": {
            "postalcode": zip_code,
            "miles": radius
        }
    }


    gender = request.args.get("gender", "").strip().title()
    age = request.args.get("age", "").strip().title()


    if gender and gender not in ("Male", "Female"):
        return jsonify({"error": "Gender must be Male or Female"}), 400


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
                "page": page
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


    return jsonify(result), 200




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
   """Receives an image from React, runs the dog breed model (ml/mlmain.py) on it, returns the result."""
   if "image" not in request.files:
       return jsonify({"error": "No image uploaded (field name must be 'image')"}), 400
   img = request.files["image"]
   if not (img.mimetype or "").startswith("image/"):
       return jsonify({"error": "File uploaded is not an image"}), 400




   try:
       image = Image.open(img.stream)
       image.load()   # actually read the pixels, so broken files fail here
   except (UnidentifiedImageError, OSError):
       return jsonify({"error": "File is not a readable image"}), 400




   result = predict_image(image)




   # TODO (week 3-4): attach userId from JWT, save to UploadedImage collection
   return jsonify(result), 200








if __name__ == "__main__":
   app.run(debug=True, port=5001)


