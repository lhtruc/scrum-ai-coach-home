import supabase from './supabaseClient';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('No access token found. Please log in again.');
  }

  localStorage.setItem('access_token', token);

  return {
    Authorization: `Bearer ${token}`,
  };
};

const getJsonHeaders = async ({ auth = false } = {}) => ({
  'Content-Type': 'application/json',
  ...(auth ? await getAuthHeaders() : {}),
});

const assessmentApi = {
  getSkills: async () => {
    const response = await fetch(`${API_BASE_URL}/skills`);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  },

  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return await response.json();
  },

  submitAssessment: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/skills/assess`, {
      method: 'POST',
      headers: await getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to submit assessment');
    }

    return await response.json();
  },

  suggestGoals: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/suggest`, {
      method: 'POST',
      headers: await getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to get suggestions');
    }

    return await response.json();
  },

  refineCustomGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/custom/refine`, {
      method: 'POST',
      headers: await getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to refine custom goal');
    }

    return await response.json();
  },

  confirmGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/confirm`, {
      method: 'POST',
      headers: await getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to confirm and save goal');
    }

    return await response.json();
  },

  getGoalActionSteps: async (goalId) => {
    const response = await fetch(`${API_BASE_URL}/goals/${goalId}/actions`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch goal action steps');
    }

    return await response.json();
  },

  updateActionStepStatus: async (stepId, isCompleted) => {
    const response = await fetch(`${API_BASE_URL}/actions/${stepId}/status`, {
      method: 'PUT',
      headers: await getJsonHeaders({ auth: true }),
      body: JSON.stringify({
        is_completed: isCompleted,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update action step status');
    }

    return await response.json();
  },
};

export default assessmentApi;