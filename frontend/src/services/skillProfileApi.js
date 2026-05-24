const API_BASE_URL = "http://127.0.0.1:8000";

export const getSkillProfile = async () => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(`${API_BASE_URL}/api/skills/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch skill profile");
  }

  return await response.json();
};
