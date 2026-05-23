const REGISTER_ENDPOINT = "http://127.0.0.1:8000/api/auth/register";

const authApi = {
    register: async (payload) => {
        const response = await fetch(REGISTER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                result?.message ||
                result?.detail ||
                "Registration failed. Please try again."
            );
        }

        return result;
    }
};

export default authApi;
