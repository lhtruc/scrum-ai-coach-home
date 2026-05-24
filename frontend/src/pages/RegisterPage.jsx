import { useState } from "react";
import authApi from "../services/authApi";
import supabaseAuth from "../services/supabaseAuth";
import "./RegisterPage.css";

const initialForm = {
  email: "",
  password: "",
  confirmPassword: ""
};

export default function RegisterPage({ onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Please enter your password.";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setServerError("");
    setSuccessMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Register via Supabase Auth directly
      const data = await supabaseAuth.signUp(form.email, form.password);

      // Try to obtain access token from session
      const access_token = data?.session?.access_token;
      const user = data?.user;

      // If no access token (e.g. email confirmation required), inform the user and stop.
      if (!access_token) {
        setSuccessMessage(
          "Registration successful. Please check your email to confirm your account, then log in."
        );
        return;
      }

      localStorage.setItem('access_token', access_token);

      if (user) {
        localStorage.setItem('user_profile', JSON.stringify(user));
      }

      // Call backend to sync accounts table
      try {
        await authApi.syncAccount(access_token);
      } catch (err) {
        // ignore - backend sync can be retried later
        console.warn('syncAccount failed', err);
      }

      setSuccessMessage("Registration successful. Redirecting...");

      try {
        const me = await authApi.getCurrentUser();
        const role = me?.user?.role;
        if (role) window.location.href = '/';
        else window.location.href = '/onboarding';
      } catch (err) {
        window.location.href = '/onboarding';
      }
    } catch (error) {
      setServerError(error.message || "Cannot connect to the server right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-shell">
      <section className="register-card">
        <div className="register-badge">Scrum AI Coach</div>

        <h1 className="register-title">Register</h1>
        <p className="register-description">
          Create your account to continue to the onboarding and skill assessment flow.
        </p>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-fields">
            <label className="register-field-group">
              <span className="register-label">Email</span>
              <input
                className="register-input"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
              />
              {errors.email && <span className="register-feedback error">{errors.email}</span>}
            </label>

            <label className="register-field-group">
              <span className="register-label">Password</span>
              <input
                className="register-input"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Enter your password"
              />
              {errors.password && (
                <span className="register-feedback error">{errors.password}</span>
              )}
            </label>

            <label className="register-field-group">
              <span className="register-label">Confirm Password</span>
              <input
                className="register-input"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <span className="register-feedback error">{errors.confirmPassword}</span>
              )}
            </label>
          </div>

          {serverError && <div className="register-alert error">{serverError}</div>}
          {successMessage && <div className="register-alert success">{successMessage}</div>}

          <button className="register-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>
      </section>
    </div>
  );
}
