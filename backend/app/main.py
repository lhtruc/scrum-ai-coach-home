import os
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date
from dotenv import load_dotenv
from supabase import create_client
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import json
from groq import Groq

# Load biến môi trường
load_dotenv()
security = HTTPBearer()

# Kết nối Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

groq_client = Groq(api_key=GROQ_API_KEY)
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
    validate_goal_exists,
    revise_action_steps_by_ai,
    BulkUpdateActionStepsRequest,
    bulk_update_action_steps,
    get_dashboard_summary
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

class LoginRequest(BaseModel):
    email: str
    password: str

class RoleUpdateRequest(BaseModel):
    role: str

class ProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    role: str | None = None

class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
      
class FeedbackResponse(BaseModel):
    message: str
    feedback: dict

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

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        return response.user
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

# =========================
# API: ROOT & AUTH
# =========================
@app.get("/")
def read_root():
    return {"message": "Scrum AI Coach Backend is running"}

@app.get("/api/auth/me")
def get_current_user(current_user = Depends(verify_token)):
    # Try to find an account row to include role
    account = supabase.table("accounts") \
        .select("*") \
        .eq("auth_uid", current_user.id) \
        .execute()

    role = None
    if account.data:
        role = account.data[0].get("role")

    return {
        "message": "Token is valid",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": role
        }
    }

@app.put("/api/users/role")
def update_user_role(data: RoleUpdateRequest, current_user=Depends(verify_token)):
    allowed_roles = ["Employee", "Student"]
    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Role must be either Employee or Student"
        )
    (
        supabase
        .table("accounts")
        .update({"role": data.role})
        .eq("auth_uid", current_user.id)
        .execute()
    )
    return {
        "message": "User role updated successfully",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "role": data.role
        }
    }

@app.put("/api/auth/password")
def update_password(
    data: PasswordUpdateRequest,
    current_user=Depends(verify_token)
):
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters"
        )

    if data.new_password != data.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Confirm password does not match"
        )

    try:
        # Verify current password first
        supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": data.current_password
        })

        # Then update to new password
        supabase.auth.update_user({
            "password": data.new_password
        })

        return {
            "message": "Password updated successfully"
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect or password update failed"
        )

@app.put("/api/users/profile")
def update_user_profile(
    data: ProfileUpdateRequest,
    current_user=Depends(verify_token)
):
    update_data = {}

    if data.display_name is not None:
        update_data["display_name"] = data.display_name

    if data.role is not None:
        if data.role not in ["Employee", "Student"]:
            raise HTTPException(
                status_code=400,
                detail="Role must be either Employee or Student"
            )
        update_data["role"] = data.role

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No profile fields provided"
        )

    result = (
        supabase
        .table("accounts")
        .update(update_data)
        .eq("auth_uid", current_user.id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="User profile not found"
        )

    return {
        "message": "Profile updated successfully",
        "profile": result.data[0]
    }

@app.post("/api/auth/login")
def login(data: LoginRequest):
    try:
        result = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        return {
            "message": "Login successful",
            "user": {
                "id": result.user.id,
                "email": result.user.email
            },
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "token_type": "bearer"
        }
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

@app.get("/api/users/profile")
def get_user_profile(current_user=Depends(verify_token)):
    try:
        result = (
            supabase
            .table("accounts")
            .select("*")
            .eq("auth_uid", current_user.id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="User profile not found in accounts table"
            )
        profile = result.data[0]
        return {
            "message": "User profile fetched successfully",
            "profile": {
                "id": current_user.id,
                "email": current_user.email,
                "display_name": profile.get("display_name"),
                "role": profile.get("role")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/api/feedback/history")
def get_feedback_history(current_user=Depends(verify_token)):
    result = (
        supabase
        .table("weekly_feedbacks")
        .select("*")
        .eq("user_id", current_user.id)
        .order("week_date", desc=True)
        .execute()
    )
    return {
        "message": "Weekly feedback history fetched successfully",
        "feedbacks": result.data
    }



@app.get("/api/feedback/current")
def get_current_feedback(current_user = Depends(verify_token)):
    """Return the current week's feedback summary for the authenticated user.

    This is a lightweight endpoint used by the frontend during initial rollout.
    It returns an 'empty week' structure when no feedback has been generated yet.
    """
    return {
        "is_empty_week": True,
        "progress_summary": None,
        "strengths": [],
        "areas": []
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
def get_skill_profile(current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)
    user_id = account["user_id"]

    result = (
        supabase
        .table("user_skills")
        .select("*")
        .eq("user_id", user_id)
        .order("skills_name")
        .execute()
    )

    if not result.data:
        return {
            "message": "No profile found",
            "summary": None
        }

    summary = [
        {
            "skill_name": item["skills_name"],
            "rating_level": item["rating_level"],
            "level": get_level_from_rating(item["rating_level"])
        }
        for item in result.data
    ]

    return {
        "message": "Skill profile fetched successfully",
        "summary": {
            "user_id": user_id,
            "name": account["name"],
            "role": account["role"],
            "ratings": summary
        }
    }

@app.post("/api/skills/assess")
def assess_skills(data: SkillAssessmentRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)
    user_id = account["user_id"]

    rows = [
        {
            "user_id": user_id,
            "skills_name": item.skill_name,
            "rating_level": item.rating_level
        }
        for item in data.ratings
    ]

    result = (
        supabase
        .table("user_skills")
        .upsert(
            rows,
            on_conflict="user_id,skills_name"
        )
        .execute()
    )

    summary = [
        {
            "skill_name": item.skill_name,
            "rating_level": item.rating_level,
            "level": get_level_from_rating(item.rating_level)
        }
        for item in data.ratings
    ]

    return {
        "message": "Skill assessment saved successfully",
        "summary": {
            "user_id": user_id,
            "name": account["name"],
            "role": account["role"],
            "ratings": summary
        }
    }

# =========================
# API: GOALS & ACTIONS
# =========================
def get_account_profile_by_auth_id(auth_uid: str) -> dict:
    result = (
        supabase
        .table("accounts")
        .select("id, auth_uid, email, role, display_name")
        .eq("auth_uid", auth_uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        return {
            "account_id": auth_uid,
            "user_id": auth_uid,
            "auth_uid": auth_uid,
            "name": "User",
            "role": "Student"
        }

    account = result.data[0]

    return {
        "account_id": account.get("id"),
        "user_id": account.get("id"),
        "auth_uid": account.get("auth_uid"),
        "email": account.get("email"),
        "name": account.get("display_name") or account.get("email") or "User",
        "role": account.get("role") or "Student"
    }


@app.post("/api/goals/suggest")
def suggest_goals(data: GoalSuggestRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)

    data.user_id = account["user_id"]
    data.name = account["name"]

    goals = suggest_goals_by_ai(data)

    return {
        "message": "Goal suggestions generated successfully",
        "user": account,
        "goals": goals
    }


@app.post("/api/goals/custom/refine")
def refine_custom_goal(data: GoalCustomRefineRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)

    data.user_id = account["user_id"]
    data.name = account["name"]

    result = refine_custom_goal_by_ai(data)
    result["user"] = account

    return result


@app.post("/api/goals/validate")
def validate_goal(data: GoalValidateRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)

    data.user_id = account["user_id"]
    data.name = account["name"]

    result = validate_goal_by_ai(data)

    return {
        "message": "Goal validation completed",
        "user": account,
        "result": result
    }


@app.post("/api/goals/confirm")
def confirm_goal(data: GoalConfirmRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)

    data.user_id = account["user_id"]
    data.name = account["name"]

    saved_goal = save_goal_to_supabase(data)

    return {
        "message": "Goal saved to Supabase successfully",
        "user": account,
        "saved_goal": saved_goal
    }

@app.post("/api/actions/generate")
def generate_action_plan(data: ActionGenerateRequest, current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)

    validate_goal_exists(data.goal_id)

    steps = generate_action_steps_by_ai(data)
    saved_steps = save_action_steps_to_supabase(
        goal_id=data.goal_id,
        steps=steps
    )
    return {
        "message": "SMART action plan generated and saved successfully",
        "user": account,
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
def get_active_goal_dashboard_stats(current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)
    user_id = account["user_id"]

    result = get_active_goal_stats(user_id)
    return {
        "message": "Active goal statistics fetched successfully",
        "user": account,
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

# =========================
# API: DASHBOARD (Nhánh Phat)
# =========================
@app.get("/api/dashboard/summary")
def get_main_dashboard_summary(current_user=Depends(verify_token)):
    account = get_account_profile_by_auth_id(current_user.id)
    user_id = account["user_id"]

    goal_query = (
        supabase
        .table("user_goals")
        .select("id, user_id, name, goal_title, goal_technique, feasibility, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
    )

    try:
        goal_response = goal_query.execute()
        goals = goal_response.data or []
    except Exception as e:
        print("Error fetching goals for summary:", e)
        goals = []

    user_name = account["name"]
    user_role = account["role"]
    current_goal = None
    progress_percentage = 0
    next_action_step = None

    if goals:
        active_goal = goals[0]
        current_goal = active_goal.get("goal_title")
        goal_id = active_goal["id"]

        try:
            steps_response = (
                supabase
                .table("action_steps")
                .select("id, title, is_completed, deadline, is_archived")
                .eq("goal_id", goal_id)
                .eq("is_archived", False)
                .order("id")
                .execute()
            )
            steps = steps_response.data or []
        except Exception as e:
            print("Error fetching action steps for summary:", e)
            steps = []

        total_steps = len(steps)
        completed_steps = sum(1 for step in steps if step.get("is_completed") is True)

        if total_steps > 0:
            progress_percentage = round((completed_steps / total_steps) * 100)

        incomplete_steps = [step for step in steps if not step.get("is_completed")]
        if incomplete_steps:
            next_action_step = incomplete_steps[0].get("title")

    return {
        "user_name": user_name,
        "user_role": user_role,
        "current_goal": current_goal,
        "progress_percentage": progress_percentage,
        "next_action_step": next_action_step or ("None (All steps completed!)" if current_goal else "No active goal yet")
    }

# =========================
# API: FEEDBACK (Nhánh main)
# =========================
@app.post("/api/feedback/generate")
def generate_weekly_feedback(current_user=Depends(verify_token)):
    try:
        one_week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        today = datetime.utcnow().date().isoformat()
        account_role = "Student"
        account_name = "User"

        try:
            account_result = (
                supabase
                .table("accounts")
                .select("*")
                .eq("auth_uid", current_user.id)
                .limit(1)
                .execute()
            )

            if account_result.data:
                account = account_result.data[0]
                account_role = account.get("role") or "Student"
                account_name = account.get("name") or current_user.email or "User"
        except Exception:
            pass

        normalized_role = account_role.strip().lower()

        if normalized_role == "student":
            role_feedback_style = (
                "The user is a student. Give feedback in a learning-oriented style: "
                "focus on foundations, understanding, consistency, study habits, and gradual improvement."
            )
        else:
            role_feedback_style = (
                "The user is an employee or working learner. Give feedback in an application-oriented style: "
                "focus on practical output, speed of execution, workplace relevance, tools, and next usable actions."
            )
        existing_feedback = (
            supabase
            .table("weekly_feedbacks")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("week_date", today)
            .execute()
        )

        if existing_feedback.data:
            return {
                "message": "Feedback already generated for this week",
                "feedback": existing_feedback.data[0]
            }
            
        actions_result = (
            supabase
            .table("action_steps")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("is_completed", True)
            .gte("created_at", one_week_ago)
            .execute()
        )

        completed_actions = actions_result.data or []

        if len(completed_actions) == 0:
            if normalized_role == "student":
                empty_summary = "You did not complete any action steps this week, but you can restart by focusing on one small foundation topic."
                empty_strengths = "You are still connected to your learning journey, which is important for long-term progress."
                empty_improvements = "Next week, choose one small theory or practice task and complete it consistently."
            else:
                empty_summary = "You did not complete any action steps this week, but you can restart with one practical task that creates visible output."
                empty_strengths = "You are still tracking your progress, which helps you return to execution quickly."
                empty_improvements = "Next week, complete one small applied task that can be reused in your work or project."

            feedback_data = {
                "user_id": current_user.id,
                "week_date": datetime.utcnow().date().isoformat(),
                "summary": empty_summary,
                "strengths": empty_strengths,
                "improvements": empty_improvements,
                "is_empty_week": True
            }

            save_result = (
                supabase
                .table("weekly_feedbacks")
                .insert(feedback_data)
                .execute()
            )

            return {
                "message": "Empty week feedback generated",
                "feedback": save_result.data[0]
            }

        active_goal_text = "No active goal found."
        progress_text = "No progress data found."

        try:
            goal_result = (
                supabase
                .table("user_goals")
                .select("id, goal_title, goal_technique, feasibility, created_at")
                .eq("user_id", current_user.id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            goals = goal_result.data or []

            if goals:
                active_goal = goals[0]
                active_goal_text = (
                    f"Goal: {active_goal.get('goal_title')}\n"
                    f"Technique: {active_goal.get('goal_technique')}\n"
                    f"Feasibility: {active_goal.get('feasibility')}"
                )

                steps_result = (
                    supabase
                    .table("action_steps")
                    .select("id, is_completed")
                    .eq("goal_id", active_goal.get("id"))
                    .execute()
                )

                steps = steps_result.data or []
                total_steps = len(steps)
                completed_steps = sum(1 for step in steps if step.get("is_completed") is True)
                pending_steps = total_steps - completed_steps
                progress_percentage = round((completed_steps / total_steps) * 100, 2) if total_steps > 0 else 0

                progress_text = (
                    f"Total steps: {total_steps}\n"
                    f"Completed steps: {completed_steps}\n"
                    f"Pending steps: {pending_steps}\n"
                    f"Progress percentage: {progress_percentage}%"
                )
        except Exception:
            pass

        action_text = ""
        for action in completed_actions:
            action_text += f"""
Title: {action.get("title")}
Description: {action.get("description")}
Metric: {action.get("metric")}
"""

        prompt = f"""
You are an AI learning coach.

User profile:
- Name: {account_name}
- Role: {account_role}

Role-based feedback style:
{role_feedback_style}

Current active goal:
{active_goal_text}

Current progress:
{progress_text}

Completed action steps from the past 7 days:
{action_text}

Analyze the user's weekly learning progress based on completed work, current goal, progress level, and role.

Return ONLY valid JSON with exactly these fields:
{{
  "summary": "...",
  "strengths": "...",
  "improvements": "..."
}}

Rules:
- Keep the same JSON structure.
- Do not add new fields.
- If the user is a Student, focus on foundations, theory, learning consistency, and study improvement.
- If the user is not a Student, focus on practical application, fast execution, workplace usefulness, and next usable actions.
- Do not return markdown.
"""
        response = groq_client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI coach. Return valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        ai_text = response.choices[0].message.content
        ai_feedback = json.loads(ai_text)

        feedback_data = {
            "user_id": current_user.id,
            "week_date": datetime.utcnow().date().isoformat(),
            "summary": ai_feedback["summary"],
            "strengths": ai_feedback["strengths"],
            "improvements": ai_feedback["improvements"],
            "is_empty_week": False
        }

        save_result = (
            supabase
            .table("weekly_feedbacks")
            .insert(feedback_data)
            .execute()
        )

        return {
            "message": "Weekly feedback generated successfully",
            "feedback": save_result.data[0]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# =========================
# API: QUẢN LÝ TIẾN ĐỘ TASK
# =========================
@app.get("/api/actions/check-overdue")
def check_overdue_actions(current_user=Depends(verify_token)):
    from datetime import date
    user_id = current_user.id
    today = date.today().isoformat()

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
def sync_account(current_user=Depends(verify_token)):
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
        "email": current_user.email
    }).execute()

    return {
        "message": "Account synced successfully",
        "account": result.data
    }

@app.post("/api/actions/revise")
def revise_action_plan(current_user=Depends(verify_token)):
    user_id = current_user.id
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
        return {
            "message": "No active goal found for user",
            "revised_steps": []
        }

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
    revised = revise_action_steps_by_ai(pending_steps)

    # Also fetch completed steps so each option can include kept completed work
    completed_resp = (
        supabase
        .table("action_steps")
        .select("id, goal_id, title, description, metric, deadline, is_completed")
        .eq("goal_id", goal_id)
        .eq("is_completed", True)
        .order("id")
        .execute()
    )
    completed_steps = completed_resp.data or []

    # Build Option 1: Reduce scope — keep completed steps, keep first half of revised pending steps
    half = max(1, len(revised) // 2)
    reduced_pending = revised[:half]
    option1_steps = []
    # include completed as DONE
    for s in completed_steps:
        option1_steps.append({
            "id": s.get("id"),
            "title": s.get("title"),
            "is_completed": True,
            "status": "DONE",
            "deadline": s.get("deadline")
        })
    # include reduced pending as NEW/PENDING
    for s in reduced_pending:
        option1_steps.append({
            "id": s.get("id"),
            "title": s.get("title"),
            "is_completed": s.get("is_completed", False),
            "status": "PENDING",
            "deadline": s.get("deadline")
        })

    # Build Option 2: Extend deadline — keep all pending but extend deadlines by 14 days
    option2_steps = []
    for s in completed_steps:
        option2_steps.append({
            "id": s.get("id"),
            "title": s.get("title"),
            "is_completed": True,
            "status": "DONE",
            "deadline": s.get("deadline")
        })

    from datetime import datetime, timedelta

    for s in revised:
        try:
            base = datetime.strptime(s.get("deadline")[:10], "%Y-%m-%d").date()
            new_deadline = (base + timedelta(days=14)).isoformat()
        except Exception:
            new_deadline = s.get("deadline")

        option2_steps.append({
            "id": s.get("id"),
            "title": s.get("title"),
            "is_completed": s.get("is_completed", False),
            "status": "PENDING",
            "deadline": new_deadline
        })

    options = [
        {
            "version": "Version 1",
            "strategy": "Reduce scope",
            "description": "Keep completed steps, reduce pending scope, and move deadline slightly.",
            "deadline_change": "",
            "steps": option1_steps
        },
        {
            "version": "Version 2",
            "strategy": "Extend deadline",
            "description": "Keep all pending steps but extend the deadline.",
            "deadline_change": "",
            "steps": option2_steps
        }
    ]

    return {"message": "Revision options generated successfully", "options": options}

@app.put("/api/actions/bulk-update")
async def bulk_update_actions(
    request: Request,
    current_user=Depends(verify_token)
):
    """Accept either `updates` or `steps` in the request JSON, and apply bulk updates.

    Only non-completed steps will be updated. Returns the updated step records.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    updates = body.get("updates") or body.get("steps") or []
    goal_id = body.get("goal_id")
    archive_missing = bool(body.get("archive_missing") or body.get("archive") or (str(body.get("version") or "").strip() == "Version 1") or ("reduce" in (str(body.get("strategy") or "").lower())) )

    if not isinstance(updates, list):
        raise HTTPException(status_code=400, detail="`updates` must be a list")

    updated_steps = bulk_update_action_steps(updates, goal_id=goal_id, archive_missing=archive_missing)
    return {
        "message": "Action steps updated successfully",
        "updated_steps": updated_steps
    }

@app.post("/api/auth/logout")
def logout(current_user=Depends(verify_token)):
    return {
        "message": "Logout successful. Please clear token on client side."
    }