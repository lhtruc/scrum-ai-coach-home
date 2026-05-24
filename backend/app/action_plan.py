import os
import json
from pathlib import Path
from typing import List, Optional
from datetime import date, datetime, timedelta
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
    user_id: Optional[str] = None
    name: Optional[str] = None


class ActionStepStatusRequest(BaseModel):
    is_completed: bool


class BulkUpdateActionStep(BaseModel):
    id: int
    deadline: str


class BulkUpdateActionStepsRequest(BaseModel):
    updates: List[BulkUpdateActionStep]


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

def get_account_context_from_supabase(user_id: Optional[str], fallback_name: Optional[str] = None) -> dict:
    default_context = {
        "user_id": user_id,
        "name": fallback_name or "User",
        "role": "Student"
    }

    if not user_id:
        return default_context

    lookup_columns = ["id", "auth_uid"]

    for column in lookup_columns:
        try:
            response = (
                supabase
                .table("accounts")
                .select("id, auth_uid, email, role, display_name")
                .eq(column, user_id)
                .limit(1)
                .execute()
            )

            if response.data:
                account = response.data[0]

                return {
                    "user_id": account.get("id"),
                    "auth_uid": account.get("auth_uid"),
                    "name": account.get("display_name") or account.get("email") or fallback_name or "User",
                    "role": account.get("role") or "Student"
                }
        except Exception:
            pass

    return default_context


def get_goal_context_from_supabase(goal_id: int) -> dict:
    try:
        response = (
            supabase
            .table("user_goals")
            .select("id, user_id, name, goal_title, goal_technique, feasibility, created_at")
            .eq("id", goal_id)
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]
    except Exception:
        pass

    return {}


def get_role_learning_style(role: Optional[str]) -> str:
    normalized_role = (role or "Student").strip().lower()

    if normalized_role == "student":
        return (
            "The user is a student. Build the action plan around theory, foundations, "
            "conceptual understanding, guided exercises, and gradual skill development."
        )

    return (
        "The user is an employee or working learner. Build the action plan around practical usage, "
        "fast application, implementation workflow, workplace scenarios, and immediately usable output."
    )

def generate_action_steps_by_ai(data: ActionGenerateRequest) -> List[dict]:
    goal_context = get_goal_context_from_supabase(data.goal_id)

    effective_user_id = data.user_id or goal_context.get("user_id")
    effective_name = data.name or goal_context.get("name")

    account_context = get_account_context_from_supabase(
            user_id=effective_user_id,
            fallback_name=effective_name
        )

    role_learning_style = get_role_learning_style(account_context["role"])
    prompt = f"""
You are an AI learning coach and technical mentor.

Generate a deep SMART milestone-based action plan for the confirmed goal below.

User profile:
- Name: {account_context["name"]}
- Role: {account_context["role"]}

Role-based action plan style:
{role_learning_style}

Confirmed goal:
{data.goal_title}

Goal technique:
{data.goal_technique}

Feasibility:
{data.feasibility}

IMPORTANT:
The output must be a milestone-based action plan, not a shallow step-by-step checklist.

Milestone count rules:
- You must generate at least 5 milestones.
- The harder or broader the confirmed goal is, the more milestones you must generate.
- If the goal is simple and short-term, generate 5 milestones.
- If the goal is medium difficulty, generate 6 milestones.
- If the goal is difficult, broad, or requires both learning and implementation, generate 7 milestones.
- If the goal is very difficult, long-term, production-level, enterprise-level, or contains advanced architecture, deployment, scaling, AI, security, or system design, generate 8 milestones.
- Do not force every goal into exactly 5 milestones.
- Do not generate fewer milestones just to keep the answer short.

Difficulty judgment rules:
A goal should be considered difficult if it includes words or ideas such as:
- advanced
- complete system
- production-ready
- enterprise-level
- distributed system
- deployment
- scalability
- security
- machine learning
- AI application
- full-stack project
- real-world project
- architecture
- optimization
- integration
- long-term learning

For difficult goals, the action plan must have more than 5 milestones.

Each milestone must represent a meaningful learning or implementation phase.
Each milestone must directly support the confirmed goal.
Each milestone must be detailed enough to guide real progress.

Every milestone MUST satisfy SMART criteria:

1. Specific:
- The title and description must clearly state what the user will learn, build, practice, or deliver.
- Avoid vague phrases like "learn basics" unless the exact concepts and deliverables are included.

2. Measurable:
- The metric must contain a clear measurable result.
- Use numbers, deliverables, completion conditions, tests, commits, documents, diagrams, demos, or pass criteria.
- Bad metric: "Understand REST API"
- Good metric: "Create 5 REST endpoints, test them with Postman, and document request/response examples."

3. Achievable:
- The milestone must match the user's role and feasibility level.
- If feasibility is LOW, break the goal into smaller and safer milestones.
- If feasibility is HIGH or MEDIUM, still keep milestones realistic.

4. Relevant:
- Every milestone must directly contribute to the confirmed goal.
- Do not add unrelated technologies, topics, or tasks.

5. Time-bound:
- Every milestone must include a realistic deadline in YYYY-MM-DD format.
- Deadlines should progress logically over time.

Role-specific rules:
- If the role is Student:
  - Focus more on theory, foundations, guided practice, concept explanation, notes, small exercises, and reflection.
  - Milestones should help the user build strong understanding before implementation.

- If the role is not Student:
  - Focus more on practical usage, fast application, workflow, implementation artifacts, GitHub commits, testing, deployment, and reusable project output.
  - Milestones should help the user apply the goal quickly in a real project.

Depth requirements:
- Each milestone must have a meaningful deliverable.
- Each description must explain what to do, why it matters, and what output must be produced.
- Each metric must prove completion clearly.
- Avoid tiny task titles.
- Avoid generic steps.
- Avoid repeating the same idea.

Return ONLY valid JSON.
Do not return markdown.
Do not include explanations outside JSON.

JSON format:
[
  {{
    "title": "Clear action plan title without numbering or the word milestone",
    "description": "...",
    "metric": "...",
    "deadline": "YYYY-MM-DD"
  }},
  {{
    "title": "Another clear action plan title without numbering or the word milestone",
    "description": "...",
    "metric": "...",
    "deadline": "YYYY-MM-DD"
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
    goal_context = get_goal_context_from_supabase(goal_id)
    user_id = goal_context.get("user_id")

    records = []

    for step in steps:
        records.append({
            "goal_id": goal_id,
            "user_id": user_id,
            "title": step.get("title"),
            "description": step.get("description"),
            "metric": step.get("metric"),
            "deadline": step.get("deadline"),
            "is_completed": False
        })

    response = (
        supabase
        .table("action_steps")
        .insert(records)
        .execute()
    )

    return response.data or []


def validate_goal_exists(goal_id: int) -> None:
    """Check if goal_id exists in user_goals before generating action plan."""
    response = (
        supabase
        .table("user_goals")
        .select("id")
        .eq("id", goal_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Goal with id {goal_id} does not exist. Please confirm your goal first."
        )


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
        .select("id, goal_id, title, description, metric, deadline, is_completed, is_archived, created_at")
        .eq("goal_id", goal_id)
        .eq("is_archived", False)
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
        .select("id, goal_id, title, description, metric, deadline, is_completed, is_archived, created_at")
        .eq("goal_id", goal_id)
        .eq("is_archived", False)
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


def revise_action_steps_by_ai(pending_steps: List[dict]) -> List[dict]:
    if not pending_steps:
        return []

    today = date.today().isoformat()

    prompt = f"""
You are an AI learning coach. Today's date is {today}.

You will be given a JSON array of pending action steps. Each step has these fields:
    - id
    - goal_id
    - title
    - description
    - metric
    - deadline (YYYY-MM-DD)
    - is_completed

Your task: update ONLY the `deadline` values so they become realistic future dates based on today.
    - Keep the same number of steps and do not modify `id`, `goal_id`, `title`, `description`, `metric`, or `is_completed`.
    - Deadlines must be in ISO format `YYYY-MM-DD` and strictly after today.
    - Space out deadlines reasonably (e.g., a few days apart) and keep them achievable.
    - Return strictly a JSON array of objects with exactly these fields in each object:
        - id
        - goal_id
        - title
        - description
        - metric
        - deadline
        - is_completed
    - Keep the original `id` and `goal_id` values for each returned object.
Do NOT include any explanatory text.
"""

    try:
        # Build the message with the steps payload
        user_message = {
            "role": "user",
            "content": prompt + "\n\nInput steps:\n" + json.dumps(pending_steps, ensure_ascii=False)
        }

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful AI learning coach. Return valid JSON only."},
                user_message
            ],
            temperature=0.2,
        )

        content = response.choices[0].message.content
        revised = json.loads(content)

        if isinstance(revised, list):
            return revised

    except Exception as e:
        print("Groq revise error:", e)

    # Fallback: shift any parseable deadline forward by 7 days from today sequentially
    fallback = []
    shift_days = 7
    for i, step in enumerate(pending_steps):
        parsed = _parse_deadline(step.get("deadline"))
        base = parsed if parsed and parsed > date.today() else date.today()
        new_deadline = (base + timedelta(days=shift_days * (i + 1))).isoformat()
        fallback.append({
            "id": step.get("id"),
            "goal_id": step.get("goal_id"),
            "title": step.get("title"),
            "description": step.get("description"),
            "metric": step.get("metric"),
            "deadline": new_deadline,
            "is_completed": step.get("is_completed", False)
        })

    return fallback


def bulk_update_action_steps(updates: List[dict], goal_id: int = None, archive_missing: bool = False) -> List[dict]:
    """Apply bulk updates to action steps.

    - `updates`: list of objects containing at minimum `id` and optional fields like `deadline`.
    - `goal_id`: if provided and `archive_missing` is True, any non-completed, non-archived step
      in that goal which is NOT present in `updates` will be marked `is_archived = True`.
    """
    updated_steps = []

    # If requested, archive pending steps in the goal that are not included in the revised updates
    try:
        if archive_missing and goal_id:
            # collect revised ids from updates
            revised_ids = set()
            for it in updates:
                step_id = getattr(it, 'id', None) if not isinstance(it, dict) else it.get('id')
                if step_id:
                    revised_ids.add(step_id)

            # fetch current non-archived steps for the goal
            existing = (
                supabase
                .table("action_steps")
                .select("id, is_completed, is_archived")
                .eq("goal_id", goal_id)
                .execute()
            )

            rows = existing.data or []
            to_archive = []
            for r in rows:
                rid = r.get('id')
                is_completed = r.get('is_completed')
                is_archived = r.get('is_archived')
                # archive only non-completed, currently not archived, and not in revised set
                if not is_completed and not is_archived and rid not in revised_ids:
                    to_archive.append(rid)

            if to_archive:
                try:
                    resp = (
                        supabase
                        .table("action_steps")
                        .update({"is_archived": True})
                        .in_("id", to_archive)
                        .execute()
                    )
                    if resp.data:
                        updated_steps.extend(resp.data)
                except Exception:
                    # ignore archive failures and continue
                    pass
    except Exception:
        # ensure archive pass failure doesn't block updates
        pass

    for item in updates:
        # Support both dicts and objects
        step_id = getattr(item, 'id', None) if not isinstance(item, dict) else item.get('id')
        deadline_val = getattr(item, 'deadline', None) if not isinstance(item, dict) else item.get('deadline')

        if not step_id or deadline_val is None:
            continue

        try:
            # Check current completion status
            existing = (
                supabase
                .table("action_steps")
                .select("id, is_completed")
                .eq("id", step_id)
                .limit(1)
                .execute()
            )

            rows = existing.data or []
            if not rows:
                continue
            if rows[0].get('is_completed'):
                # Skip completed steps
                continue

            response = (
                supabase
                .table("action_steps")
                .update({"deadline": deadline_val})
                .eq("id", step_id)
                .execute()
            )

            if response.data:
                updated_steps.extend(response.data)
        except Exception:
            # Ignore individual failures and continue
            continue

    return updated_steps

def parse_date_value(value):
    if value is None:
        return None

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None

    return None


def get_user_profile_for_dashboard(user_id: str, active_goal: dict) -> dict:
    default_profile = {
        "user_id": user_id,
        "name": active_goal.get("name") or "Student",
        "role": "Employee/Student"
    }

    try:
        account_response = (
            supabase
            .table("accounts")
            .select("user_id, name, role")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        accounts = account_response.data or []

        if not accounts:
            return default_profile

        account = accounts[0]

        return {
            "user_id": user_id,
            "name": account.get("name") or default_profile["name"],
            "role": account.get("role") or default_profile["role"]
        }

    except Exception:
        return default_profile


def get_next_pending_action_step(steps: list[dict]) -> dict | None:
    pending_steps = [
        step for step in steps
        if step.get("is_completed") is False
    ]

    if not pending_steps:
        return None

    pending_steps_with_deadline = []

    for step in pending_steps:
        parsed_deadline = parse_date_value(step.get("deadline"))

        pending_steps_with_deadline.append({
            "step": step,
            "parsed_deadline": parsed_deadline
        })

    pending_steps_with_deadline.sort(
        key=lambda item: item["parsed_deadline"] or date.max
    )

    return pending_steps_with_deadline[0]["step"]


def get_dashboard_summary(user_id: str | None = None) -> dict:
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
    active_goal_id = active_goal["id"]
    active_user_id = active_goal.get("user_id")

    steps_response = (
        supabase
        .table("action_steps")
        .select("id, goal_id, title, description, metric, deadline, is_completed, is_archived, created_at")
        .eq("goal_id", active_goal_id)
        .eq("is_archived", False)
        .order("deadline")
        .execute()
    )

    steps = steps_response.data or []

    total_steps = len(steps)
    completed_steps = sum(1 for step in steps if step.get("is_completed") is True)
    pending_steps = total_steps - completed_steps

    if total_steps == 0:
        progress_percentage = 0
    else:
        progress_percentage = round((completed_steps / total_steps) * 100, 2)

    next_pending_step = get_next_pending_action_step(steps)

    user_profile = get_user_profile_for_dashboard(
        user_id=active_user_id,
        active_goal=active_goal
    )

    return {
        "user": user_profile,
        "current_goal": {
            "id": active_goal["id"],
            "title": active_goal["goal_title"],
            "technique": active_goal["goal_technique"],
            "feasibility": active_goal["feasibility"]
        },
        "progress": {
            "total_steps": total_steps,
            "completed_steps": completed_steps,
            "pending_steps": pending_steps,
            "progress_percentage": progress_percentage
        },
        "next_pending_action_step": next_pending_step
    }
