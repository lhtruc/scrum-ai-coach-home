const API_BASE_URL = 'http://127.0.0.1:8000/api';

const assessmentApi = {
  getSkills: async () => {
    const response = await fetch(`${API_BASE_URL}/skills`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  },
  
  submitAssessment: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/skills/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to submit assessment');
    return await response.json();
  },

  suggestGoals: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to get suggestions');
    return await response.json();
  },

  refineCustomGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/custom/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to refine custom goal');
    return await response.json();
  },

  // THÊM MỚI: API Xác nhận lưu vào Supabase
  confirmGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to confirm and save goal');
    return await response.json();
  },

  getGoalActionSteps: async (goalId) => {
    const response = await fetch(`${API_BASE_URL}/goals/${goalId}/actions`);

    if (!response.ok) {
      throw new Error('Failed to fetch goal action steps');
    }

    return await response.json();
  },

  updateActionStepStatus: async (stepId, isCompleted) => {
    const response = await fetch(`${API_BASE_URL}/actions/${stepId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_completed: isCompleted
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update action step status');
    }

    return await response.json();
  }
};


export default assessmentApi;