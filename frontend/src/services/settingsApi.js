import supabase from "./supabaseClient";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || localStorage.getItem("access_token");

  if (!token) {
    throw new Error("No access token found. Please log in again.");
  }

  localStorage.setItem("access_token", token);

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const settingsApi = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: await getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to fetch profile");

    return await response.json();
  },

  updateProfile: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Failed to update profile");

    return await response.json();
  },

  updatePassword: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/password`, {
      method: "PUT",
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || "Failed to update password");
    }

    return await response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });

    if (!response.ok) throw new Error("Failed to logout");

    return await response.json();
  },
};

export default settingsApi;
