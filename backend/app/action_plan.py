import os
import json
from pathlib import Path
from typing import List
from datetime import date, datetime
from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel, Field
from supabase import create_client, Client
from fastapi import HTTPException


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not GROQ_API_KEY:
    raise ValueError("Missing GROQ_API_KEY. Please check backend/.env file.")

if not SUPABASE_URL:
    raise ValueError("Missing SUPABASE_URL. Please check backend/.env file.")

if not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_KEY. Please check backend/.env file.")


groq_client = Groq(api_key=GROQ_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class ActionGenerateRequest(BaseModel):
    goal_id: int
    goal_title: str
    goal_technique: str
    feasibility: str


class ActionStepStatusRequest(BaseModel):
    is_completed: bool


def fallback_action_steps(goal_title: str) -> List[dict]:
    return [
        {
            "title": "Understand the goal requirements",
            "description": f"Review the confirmed goal: {goal_title} and identify what needs to be learned first.",
            "metric": "Write down at least 3 key requirements of the goal.",
            "deadline": "2026-06-01"
        },
        {
            "title": "Study the required basic concepts",
            "description": "Learn the core concepts needed to complete this goal.",
            "metric": "Complete at least 2 learning resources or tutorials.",
            "deadline": "2026-06-03"
        },
        {
            "title": "Practice with small exercises",
            "description": "Apply the concepts through small coding or design exercises.",
            "metric": "Finish at least 5 practice exercises.",
            "deadline": "2026-06-05"
        },
        {
            "title": "Build a mini implementation",
            "description": "Create a small project or prototype related to the confirmed goal.",
            "metric": "Complete one working mini project or demo.",
            "deadline": "2026-06-08"
        },
        {
            "title": "Review and improve the result",
            "description": "Check the result, fix issues, and improve quality.",
            "metric": "List at least 3 improvements and apply them.",
            "deadline": "2026-06-10"
        }
    ]


def generate_action_steps_by_ai(data: ActionGenerateRequest) -> List[dict]:
    prompt = f"""
You are an AI learning coach for IT students.

Generate a SMART action plan for this confirmed goal.

Confirmed goal:
{data.goal_title}

Goal technique:
{data.goal_technique}

Feasibility:
{data.feasibility}

Return strictly valid JSON only.

Rules:
- Return a JSON array.
- Return at least 5 action steps.
- Each step must be SMART: Specific, Measurable, Achievable, Relevant, Time-bound.
- Each object must contain exactly these fields:
  - title
  - description
  - metric
  - deadline
- deadline must use YYYY-MM-DD format.
- Do not return markdown.
- Do not add explanation outside JSON.

Example:
[
  {{
    "title": "Review basic OOP concepts",
    "description": "Study encapsulation, inheritance, and polymorphism through simple examples.",
    "metric": "Write notes for 3 OOP concepts and complete 3 examples.",
    "deadline": "2026-06-01"
  }}
]
"""

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI learning coach. Return valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        steps = json.loads(content)

        if isinstance(steps, list) and len(steps) >= 5:
            return steps

        return fallback_action_steps(data.goal_title)

    except Exception as e:
        print("Groq action generation error:", e)

        raise HTTPException(
            status_code=500,
            detail="Groq API failed while generating SMART action steps."
        )


def save_action_steps_to_supabase(goal_id: int, steps: List[dict]) -> List[dict]:
    records = []

    for step in steps:
        records.append({
            "goal_id": goal_id,
            "title": step["title"],
            "description": step["description"],
            "metric": step["metric"],
            "deadline": step["deadline"],
            "is_completed": False
        })

    response = (
        supabase
        .table("action_steps")
        .insert(records)
        .execute()
    )

    if not response.data:
        raise Exception("Failed to save action steps to Supabase")

    return response.data


def update_action_step_status(step_id: int, is_completed: bool) -> dict:
    response = (
        supabase
        .table("action_steps")
        .update({"is_completed": is_completed})
        .eq("id", step_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Action step not found or update failed."
        )

    return response.data[0]

def get_action_steps_by_goal(goal_id: int) -> dict:
    response = (
        supabase
        .table("action_steps")
        .select("id, goal_id, title, description, metric, deadline, is_completed, created_at")
        .eq("goal_id", goal_id)
        .order("id")
        .execute()
    )

    steps = response.data or []

    total_steps = len(steps)
    completed_steps = sum(1 for step in steps if step.get("is_completed") is True)

    if total_steps == 0:
        progress_percentage = 0
    else:
        progress_percentage = round((completed_steps / total_steps) * 100, 2)

    return {
        "goal_id": goal_id,
        "total_steps": total_steps,
        "completed_steps": completed_steps,
        "progress_percentage": progress_percentage,
        "steps": steps
    }

def _parse_deadline(deadline_value):
    if deadline_value is None:
        return None

    if isinstance(deadline_value, date):
        return deadline_value

    if isinstance(deadline_value, str):
        try:
            return datetime.strptime(deadline_value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None

    return None


def get_active_goal_stats(user_id: str | None = None) -> dict:
    goal_query = (
        supabase
        .table("user_goals")
        .select("id, user_id, name, goal_title, goal_technique, feasibility, created_at")
        .order("created_at", desc=True)
        .limit(1)
    )

    if user_id:
        goal_query = goal_query.eq("user_id", user_id)

    goal_response = goal_query.execute()
    goals = goal_response.data or []

    if not goals:
        raise HTTPException(
            status_code=404,
            detail="No active goal found."
        )

    active_goal = goals[0]
    goal_id = active_goal["id"]

    steps_response = (
        supabase
        .table("action_steps")
        .select("id, goal_id, title, description, metric, deadline, is_completed, created_at")
        .eq("goal_id", goal_id)
        .order("id")
        .execute()
    )

    steps = steps_response.data or []

    total_steps = len(steps)
    completed_steps = sum(1 for step in steps if step.get("is_completed") is True)
    pending_steps = total_steps - completed_steps

    if total_steps == 0:
        completion_percentage = 0
    else:
        completion_percentage = round((completed_steps / total_steps) * 100, 2)

    parsed_deadlines = []

    for step in steps:
        parsed_deadline = _parse_deadline(step.get("deadline"))

        if parsed_deadline:
            parsed_deadlines.append(parsed_deadline)

    if parsed_deadlines:
        goal_deadline = max(parsed_deadlines)
        days_remaining = (goal_deadline - date.today()).days
    else:
        goal_deadline = None
        days_remaining = None

    return {
        "active_goal": active_goal,
        "total_steps": total_steps,
        "completed_steps": completed_steps,
        "pending_steps": pending_steps,
        "completion_percentage": completion_percentage,
        "goal_deadline": goal_deadline.isoformat() if goal_deadline else None,
        "days_remaining": days_remaining,
        "steps": steps
    }