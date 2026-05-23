const API_BASE_URL = 'http://127.0.0.1:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwt_token');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
};

const assessmentApi = {
  getSkills: async () => {
    const response = await fetch(`${API_BASE_URL}/skills`);

    if (!response.ok)
      throw new Error('Network response was not ok');

    return await response.json();
  },
  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Failed to get current user');

    return await response.json();
  },
  submitAssessment: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/skills/assess`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to submit assessment');

    return await response.json();
  },

  suggestGoals: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/suggest`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to get suggestions');

    return await response.json();
  },

  refineCustomGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/custom/refine`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to refine custom goal');

    return await response.json();
  },

  confirmGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to confirm and save goal');

    return await response.json();
  }
  
};

export default assessmentApi;