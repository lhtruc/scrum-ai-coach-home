import supabase from './supabaseClient';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('No access token found. Please log in again.');
  }

  localStorage.setItem('access_token', token);

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}

const actionPlanApi = {
  generateActionPlan: async (payload) => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/actions/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to generate action plan');
    }

    return await response.json();
  },

  getActionSteps: async (goalId) => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/goals/${goalId}/actions`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch action steps');
    }

    return await response.json();
  },

  updateStepStatus: async (stepId, isCompleted) => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/actions/${stepId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ is_completed: isCompleted })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update step status');
    }

    return await response.json();
  },

  getActiveGoalStats: async () => {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/goals/active/stats`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to fetch active goal stats');
    }

    return await response.json();
  },

  // GET /api/actions/check-overdue — check if any actions are overdue
  checkOverdue: async () => {
    const response = await fetch(`${API_BASE_URL}/actions/check-overdue`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to check overdue actions');
    return await response.json();
  },

  // POST /api/actions/revise — request a revision of the action plan
  revisePlan: async () => {
    const response = await fetch(`${API_BASE_URL}/actions/revise`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to request plan revision');
    return await response.json();
  }
,
  // PUT /api/actions/bulk-update — apply a set of updates for actions
  bulkUpdate: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/actions/bulk-update`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to bulk update actions');
    return await response.json();
  }
};

export default actionPlanApi;