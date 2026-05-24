const API_BASE_URL = 'http://127.0.0.1:8000/api';

// ==========================================
// [Xử lý Merge Conflict: Chọn nhánh main]
// Comment lại code của nhánh frontend-view-skill-profile
// ==========================================

// const getAuthHeaders = () => {
//   const token = localStorage.getItem('jwt_token');
// 
//   return {
//     'Content-Type': 'application/json',
//     Authorization: `Bearer ${token}`
//   };
// };

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getJsonHeaders = ({ auth = false } = {}) => ({
  'Content-Type': 'application/json',
  ...(auth ? getAuthHeaders() : {})
});

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
      headers: getAuthHeaders() // GET không cần Content-Type nên dùng getAuthHeaders là đúng
    });

    if (!response.ok) throw new Error('Failed to get current user');

    return await response.json();
  },
  
  submitAssessment: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/skills/assess`, {
      method: 'POST',
      // headers: getAuthHeaders(), // -> Code cũ của frontend-view-skill-profile
      headers: getJsonHeaders({ auth: true }), // -> Code mới của main
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to submit assessment');

    return await response.json();
  },

  suggestGoals: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/suggest`, {
      method: 'POST',
      // headers: getAuthHeaders(), // -> Code cũ bị thiếu Content-Type
      headers: getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to get suggestions');

    return await response.json();
  },

  refineCustomGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/custom/refine`, {
      method: 'POST',
      // headers: getAuthHeaders(), // -> Code cũ bị thiếu Content-Type
      headers: getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to refine custom goal');

    return await response.json();
  },

  confirmGoal: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/goals/confirm`, {
      method: 'POST',
      // headers: getAuthHeaders(), // -> Code cũ bị thiếu Content-Type
      headers: getJsonHeaders({ auth: true }),
      body: JSON.stringify(payload)
    });

    if (!response.ok)
      throw new Error('Failed to confirm and save goal');

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
      // headers: { 'Content-Type': 'application/json' }, // -> Code cũ 
      headers: getJsonHeaders({ auth: true }), // Đổi luôn qua getJsonHeaders cho đồng bộ
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