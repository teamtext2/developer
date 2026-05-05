from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
import json
from typing import Optional, List
from pydantic import BaseModel
import time

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistence Setup
DB_FILE = "db.json"
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount uploads for serving images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def load_db():
    if not os.path.exists(DB_FILE):
        return {"users": {}, "posts": [], "friends": {}}
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

@app.get("/")
def read_root():
    return {"message": "text2 cam API is running", "status": "online"}

@app.post("/api/register")
async def register(
    email: str = Form(...),
    password: str = Form(...),
    username: str = Form(...),
    avatar: UploadFile = File(...)
):
    db = load_db()
    for u_id, u_data in db["users"].items():
        if u_data["email"] == email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if u_data["username"] == username:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    file_extension = os.path.splitext(avatar.filename)[1]
    avatar_filename = f"avatar_{uuid.uuid4()}{file_extension}"
    avatar_path = os.path.join(UPLOAD_DIR, avatar_filename)
    with open(avatar_path, "wb") as buffer:
        content = await avatar.read()
        buffer.write(content)
    
    user_id = str(uuid.uuid4())
    db["users"][user_id] = {
        "id": user_id,
        "username": username,
        "email": email,
        "password": password,
        "avatar": f"/uploads/{avatar_filename}"
    }
    db["friends"][user_id] = []
    save_db(db)
    return {"status": "success", "user": db["users"][user_id]}

@app.post("/api/login")
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    db = load_db()
    for user_id, user_data in db["users"].items():
        if user_data["email"] == email and user_data["password"] == password:
            user_info = user_data.copy()
            del user_info["password"]
            return {"status": "success", "user": user_info}
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.post("/api/update_profile")
async def update_profile(
    user_id: str = Form(...),
    username: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None)
):
    db = load_db()
    if user_id not in db["users"]:
        raise HTTPException(status_code=404, detail="User not found")
    
    if username:
        # Check if username is taken by another user
        for u_id, u_data in db["users"].items():
            if u_id != user_id and u_data["username"] == username:
                raise HTTPException(status_code=400, detail="Username already taken")
        db["users"][user_id]["username"] = username
        # Update username in posts too
        for post in db["posts"]:
            if post["user_id"] == user_id:
                post["username"] = username
                
    if avatar:
        file_extension = os.path.splitext(avatar.filename)[1]
        avatar_filename = f"avatar_{uuid.uuid4()}{file_extension}"
        avatar_path = os.path.join(UPLOAD_DIR, avatar_filename)
        with open(avatar_path, "wb") as buffer:
            content = await avatar.read()
            buffer.write(content)
        db["users"][user_id]["avatar"] = f"/uploads/{avatar_filename}"
        # Update avatar in posts too
        for post in db["posts"]:
            if post["user_id"] == user_id:
                post["user_avatar"] = db["users"][user_id]["avatar"]

    save_db(db)
    user_info = db["users"][user_id].copy()
    del user_info["password"]
    return {"status": "success", "user": user_info}

@app.get("/api/search")
async def search_user(query: str):
    db = load_db()
    results = []
    for user_id, user_data in db["users"].items():
        if query.lower() in user_data["username"].lower():
            results.append({"username": user_data["username"], "avatar": user_data["avatar"]})
    return results

@app.post("/api/add_friend")
async def add_friend(
    user_id: str = Form(...),
    friend_username: str = Form(...)
):
    db = load_db()
    if user_id not in db["users"]: raise HTTPException(status_code=404, detail="User not found")
    friend_id = next((u_id for u_id, u_data in db["users"].items() if u_data["username"] == friend_username), None)
    if not friend_id: raise HTTPException(status_code=404, detail="Friend not found")
    if friend_id == user_id: raise HTTPException(status_code=400, detail="Cannot friend self")
    if friend_id not in db["friends"][user_id]:
        db["friends"][user_id].append(friend_id)
        if user_id not in db["friends"][friend_id]: db["friends"][friend_id].append(user_id)
    save_db(db)
    return {"status": "success"}

@app.get("/api/friends")
async def get_friends(user_id: str):
    db = load_db()
    if user_id not in db["users"]: raise HTTPException(status_code=404, detail="User not found")
    friend_ids = db["friends"].get(user_id, [])
    return [{"username": db["users"][f_id]["username"], "avatar": db["users"][f_id]["avatar"]} for f_id in friend_ids if f_id in db["users"]]

@app.post("/api/posts")
async def create_post(
    user_id: str = Form(...),
    caption: str = Form(...),
    image: UploadFile = File(...)
):
    db = load_db()
    if user_id not in db["users"]: raise HTTPException(status_code=404, detail="User not found")
    file_extension = os.path.splitext(image.filename)[1]
    image_filename = f"post_{uuid.uuid4()}{file_extension}"
    image_path = os.path.join(UPLOAD_DIR, image_filename)
    with open(image_path, "wb") as buffer:
        content = await image.read()
        buffer.write(content)
    post = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "username": db["users"][user_id]["username"],
        "user_avatar": db["users"][user_id]["avatar"],
        "image_url": f"/uploads/{image_filename}",
        "caption": caption,
        "timestamp": time.time()
    }
    db["posts"].insert(0, post)
    save_db(db)
    return {"status": "success", "post": post}

@app.post("/api/update_post")
async def update_post(
    post_id: str = Form(...),
    user_id: str = Form(...),
    caption: str = Form(...)
):
    db = load_db()
    for post in db["posts"]:
        if post["id"] == post_id and post["user_id"] == user_id:
            post["caption"] = caption
            save_db(db)
            return {"status": "success"}
    raise HTTPException(status_code=404, detail="Post not found")

@app.post("/api/delete_post")
async def delete_post(
    post_id: str = Form(...),
    user_id: str = Form(...)
):
    db = load_db()
    initial_len = len(db["posts"])
    db["posts"] = [p for p in db["posts"] if not (p["id"] == post_id and p["user_id"] == user_id)]
    if len(db["posts"]) < initial_len:
        save_db(db)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Post not found")

@app.get("/api/user_posts")
async def get_user_posts(user_id: str):
    db = load_db()
    return [p for p in db["posts"] if p["user_id"] == user_id]

@app.get("/api/feed")
async def get_feed(user_id: str):
    db = load_db()
    friends = db["friends"].get(user_id, [])
    visible_user_ids = set(friends + [user_id])
    return [p for p in db["posts"] if p["user_id"] in visible_user_ids][:50]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
