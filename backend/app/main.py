import os
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date
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
from app.action_plan import (
    ActionGenerateRequest,
    ActionStepStatusRequest,
    generate_action_steps_by_ai,
    save_action_steps_to_supabase,
    update_action_step_status,
    get_action_steps_by_goal,
    get_active_goal_stats,
    revise_action_steps_by_ai,
    BulkUpdateActionStepsRequest,
    bulk_update_action_steps
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
def get_skill_profile(current_user = Depends(verify_token)):
    user_id = current_user.id

    result = supabase.table("user_skills") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("skills_name") \
        .execute()

    if not result.data:
        return {"message": "No profile found", "summary": None}

    summary = [{
        "skill_name": item["skills_name"],
        "rating_level": item["rating_level"],
        "level": get_level_from_rating(item["rating_level"])
    } for item in result.data]

    return {
        "message": "Skill profile fetched successfully",
        "summary": {
            "user_id": user_id,
            "ratings": summary
        }
    }

@app.post("/api/skills/assess")
def assess_skills(data: SkillAssessmentRequest, current_user = Depends(verify_token)):
    user_id = current_user.id

    rows = [{
        "user_id": user_id,
        "skills_name": item.skill_name,
        "rating_level": item.rating_level
    } for item in data.ratings]

    result = supabase.table("user_skills").upsert(
        rows,
        on_conflict="user_id,skills_name"
    ).execute()

    summary = [{
        "skill_name": item.skill_name,
        "rating_level": item.rating_level,
        "level": get_level_from_rating(item.rating_level)
    } for item in data.ratings]

    return {
        "message": "Skill assessment saved successfully",
        "summary": {"user_id": user_id, "ratings": summary},
        "saved_rows": result.data
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

@app.post("/api/actions/generate")
def generate_action_plan(data: ActionGenerateRequest):
    steps = generate_action_steps_by_ai(data)

    saved_steps = save_action_steps_to_supabase(
        goal_id=data.goal_id,
        steps=steps
    )

    return {
        "message": "SMART action plan generated and saved successfully",
        "goal_id": data.goal_id,
        "steps": saved_steps
    }


@app.put("/api/actions/{step_id}/status")
def update_action_status(step_id: int, data: ActionStepStatusRequest):
    updated_step = update_action_step_status(
        step_id=step_id,
        is_completed=data.is_completed
    )

    return {
        "message": "Action step status updated successfully",
        "step": updated_step
    }

@app.get("/api/goals/{goal_id}/actions")
def get_goal_action_steps(goal_id: int):
    result = get_action_steps_by_goal(goal_id)

    return {
        "message": "Action steps fetched successfully",
        "goal_id": result["goal_id"],
        "total_steps": result["total_steps"],
        "completed_steps": result["completed_steps"],
        "progress_percentage": result["progress_percentage"],
        "steps": result["steps"]
    }

@app.get("/api/goals/active/stats")
def get_active_goal_dashboard_stats(user_id: str | None = None):
    result = get_active_goal_stats(user_id)

    return {
        "message": "Active goal statistics fetched successfully",
        "active_goal": result["active_goal"],
        "statistics": {
            "total_steps": result["total_steps"],
            "completed_steps": result["completed_steps"],
            "pending_steps": result["pending_steps"],
            "completion_percentage": result["completion_percentage"],
            "goal_deadline": result["goal_deadline"],
            "days_remaining": result["days_remaining"]
        },
        "steps": result["steps"]
    }


@app.get("/api/actions/check-overdue")
def check_overdue_actions(current_user = Depends(verify_token)):
    from datetime import date

    user_id = current_user.id
    today = date.today().isoformat()

    # lấy goals của user
    goals_response = (
        supabase
        .table("user_goals")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )

    goal_ids = [goal["id"] for goal in goals_response.data]

    if not goal_ids:
        return {
            "needs_revision": False,
            "overdue_count": 0
        }

    # lấy overdue steps
    overdue_response = (
        supabase
        .table("action_steps")
        .select("*")
        .in_("goal_id", goal_ids)
        .eq("is_completed", False)
        .lt("deadline", today)
        .execute()
    )

    overdue_count = len(overdue_response.data)

    return {
        "needs_revision": overdue_count >= 2,
        "overdue_count": overdue_count
    }


@app.post("/api/auth/sync-account")
def sync_account(current_user = Depends(verify_token)):
    """Ensure an `accounts` row exists for the authenticated Supabase user (Google or email).

    Inserts a new row with `auth_uid`, `email`, and default `role` = 'Student' when absent.
    """
    existing = supabase.table("accounts") \
        .select("*") \
        .eq("auth_uid", current_user.id) \
        .execute()

    if existing.data:
        return {
            "message": "Account already exists",
            "account": existing.data[0]
        }

    result = supabase.table("accounts").insert({
        "auth_uid": current_user.id,
        "email": current_user.email,
        "role": "Student"
    }).execute()

    return {
        "message": "Account synced successfully",
        "account": result.data
    }


@app.post("/api/actions/revise")
def revise_action_plan(current_user = Depends(verify_token)):
    """Generate revised deadlines for the current user's pending action steps using the AI.

    Returns a JSON array of updated steps (title, description, metric, deadline).
    """
    user_id = current_user.id

    # Get the user's most recent goal
    goal_resp = (
        supabase
        .table("user_goals")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    goals = goal_resp.data or []
    if not goals:
        return {"message": "No active goal found for user", "revised_steps": []}

    goal_id = goals[0]["id"]

    steps_resp = (
        supabase
        .table("action_steps")
        .select("id, goal_id, title, description, metric, deadline, is_completed")
        .eq("goal_id", goal_id)
        .eq("is_completed", False)
        .order("id")
        .execute()
    )

    pending_steps = steps_resp.data or []

    if not pending_steps:
        return {"message": "No pending action steps to revise", "revised_steps": []}

    # Call AI to revise deadlines
    revised = revise_action_steps_by_ai(pending_steps)

    return {"message": "Revised steps generated successfully", "revised_steps": revised}


@app.put("/api/actions/bulk-update")
def bulk_update_actions(
    data: BulkUpdateActionStepsRequest,
    current_user = Depends(verify_token)
):
    # Note: authentication ensures user owns the steps; we assume frontend passes only user's steps
    updated_steps = bulk_update_action_steps(data.updates)

    return {
        "message": "Action steps updated successfully",
        "updated_steps": updated_steps
    }