import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import settingsApi from "../services/settingsApi";
import "./Settings.css";

function Settings() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("Student");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await settingsApi.getProfile();

      setDisplayName(data.profile?.display_name || "");
      setRole(data.profile?.role || "Student");
    } catch (error) {
      console.error(error);
      alert("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await settingsApi.updateProfile({
        display_name: displayName,
        role,
      });

      localStorage.setItem(
        "user_profile",
        JSON.stringify(response.profile)
      );

      window.dispatchEvent(new Event("auth-changed"));

      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile");
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      alert("Please enter your current password");
      return;
    }

    if (newPassword.length < 8) {
      alert("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Confirm password does not match");
      return;
    }

    try {
      await settingsApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      alert("Password updated successfully!");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await settingsApi.logout();
    } catch (error) {
      console.error(error);
    }

    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_profile");

    window.dispatchEvent(new Event("auth-changed"));

    navigate("/login");
  };

  if (loading) {
    return (
      <div className="settings-page">
        <h1>Settings</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Profile Information</h2>

        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label>Display Name</label>

            <input
              type="text"
              value={displayName}
              placeholder="No display name set yet"
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Role</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="Student">Student</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          <button type="submit" className="save-btn">
            Save Profile
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Security / Password</h2>

        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label>Current Password</label>

            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>New Password</label>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="save-btn">
            Update Password
          </button>
        </form>
      </div>

      <div className="logout-section">
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Settings;