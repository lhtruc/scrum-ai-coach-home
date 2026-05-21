import os
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client
from fastapi.security import HTTPBearer

# Load biến môi trường
load_dotenv()
security = HTTPBearer()

# Kết nối Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Import AI modules từ goal_suggestion.py
from app.goal_suggestion import (
    GoalSuggestRequest,
    GoalValidateRequest,
    GoalConfirmRequest,
    GoalCustomRefineRequest,
    suggest_goals_by_ai,
    validate_goal_by_ai,
    save_goal_to_supabase,
    refine_custom_goal_by_ai
)

app = FastAPI()

# =========================
# CẤU HÌNH CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# MODELS CƠ BẢN
# =========================
class SkillRating(BaseModel):
    skill_name: str
    rating_level: int

class SkillAssessmentRequest(BaseModel):
    user_id: str
    ratings: List[SkillRating]

# =========================
# UTILS
# =========================
def get_level_from_rating(rating_level: int):
    level_mapping = {
        1: "Beginner",
        2: "Elementary",
        3: "Intermediate",
        4: "Advanced",
        5: "Expert"
    }
    return level_mapping.get(rating_level, "Unknown")

def verify_token(authorization: str = Header(...)):
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# =========================
# API: ROOT & AUTH
# =========================
@app.get("/")
def read_root():
    return {"message": "Scrum AI Coach Backend is running"}

@app.get("/api/auth/me")
def get_current_user(current_user = Depends(verify_token)):
    return {
        "message": "Token is valid",
        "user": {"id": current_user.id, "email": current_user.email}
    }

# =========================
# API: SKILLS
# =========================
@app.get("/api/skills")
def get_skills():
    result = supabase.table("skills").select("*").execute()
    return {
        "message": "Skills fetched successfully",
        "skills": result.data
    }

@app.get("/api/skills/profile")
def get_skill_profile(user_id: str):
    result = supabase.table("user_skills").select("*").eq("user_id", user_id).execute()
    if not result.data:
        return {"message": "No profile found", "summary": None}
    
    summary = [{
        "skill_name": item["skills_name"],
        "rating_level": item["rating_level"],
        "level": get_level_from_rating(item["rating_level"])
    } for item in result.data]

    return {
        "message": "Skill profile fetched successfully",
        "summary": {"user_id": user_id, "ratings": summary}
    }

@app.post("/api/skills/assess")
def assess_skills(data: SkillAssessmentRequest):
    rows = [{
        "user_id": data.user_id,
        "skills_name": item.skill_name,
        "rating_level": item.rating_level
    } for item in data.ratings]

    supabase.table("user_skills").insert(rows).execute()

    summary = [{
        "skill_name": item.skill_name,
        "rating_level": item.rating_level,
        "level": get_level_from_rating(item.rating_level)
    } for item in data.ratings]

    return {
        "message": "Skill assessment saved successfully",
        "summary": {"user_id": data.user_id, "ratings": summary}
    }

# =========================
# API: GOALS (AI TÍCH HỢP)
# =========================
@app.post("/api/goals/suggest")
def suggest_goals(data: GoalSuggestRequest):
    goals = suggest_goals_by_ai(data)
    return {
        "message": "Goal suggestions generated successfully",
        "user_id": data.user_id,
        "name": data.name,
        "goals": goals
    }

@app.post("/api/goals/custom/refine")
def refine_custom_goal(data: GoalCustomRefineRequest):
    result = refine_custom_goal_by_ai(data)
    return result

@app.post("/api/goals/validate")
def validate_goal(data: GoalValidateRequest):
    result = validate_goal_by_ai(data)
    return {
        "message": "Goal validation completed",
        "user_id": data.user_id,
        "name": data.name,
        "result": result
    }

@app.post("/api/goals/confirm")
def confirm_goal(data: GoalConfirmRequest):
    saved_goal = save_goal_to_supabase(data)
    return {
        "message": "Goal saved to Supabase successfully",
        "saved_goal": saved_goal
    }