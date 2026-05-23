import { useState } from "react";
import authApi from "../services/authApi";
import "./RegisterPage.css";

const initialForm = {
  email: "",
  password: ""
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
      await authApi.register({
        email: form.email,
        password: form.password
      });

      setSuccessMessage("Registration successful. Redirecting to onboarding...");

      window.setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1200);
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
