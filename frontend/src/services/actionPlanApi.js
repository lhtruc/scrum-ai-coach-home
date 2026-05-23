const API_BASE_URL = 'http://127.0.0.1:8000/api';

const actionPlanApi = {
  // POST /api/actions/generate — AI generates and saves SMART steps for a goal
  generateActionPlan: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/actions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to generate action plan');
    return await response.json();
  },

  // GET /api/goals/{goal_id}/actions — fetch existing steps for a goal
  getActionSteps: async (goalId) => {
    const response = await fetch(`${API_BASE_URL}/goals/${goalId}/actions`);
    if (!response.ok) throw new Error('Failed to fetch action steps');
    return await response.json();
  },

  // PUT /api/actions/{step_id}/status — toggle step complete/incomplete
  updateStepStatus: async (stepId, isCompleted) => {
    const response = await fetch(`${API_BASE_URL}/actions/${stepId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isCompleted })
    });
    if (!response.ok) throw new Error('Failed to update step status');
    return await response.json();
  },

  // GET /api/goals/active/stats — fetch the active goal + stats for a user
  getActiveGoalStats: async (userId) => {
    const url = userId
      ? `${API_BASE_URL}/goals/active/stats?user_id=${userId}`
      : `${API_BASE_URL}/goals/active/stats`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch active goal stats');
    return await response.json();
  }
};

export default actionPlanApi;
