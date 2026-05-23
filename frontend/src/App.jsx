import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import Onboarding from "./pages/Onboarding";

import SkillAssessment from "./pages/SkillAssessment";
import ActionPlan from "./pages/ActionPlan";
import ActionProgress from "./pages/ActionProgress";

import Dashboard from "./pages/Dashboard";
import ProgressDashboard from "./pages/ProgressDashboard";
import Settings from "./pages/Settings";
import RequireAuth from "./components/RequireAuth";
import SkillProfile from "./pages/SkillProfile";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>

          {/* Public Routes */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <RequireRole>
                  <SkillAssessment />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/action-plan"
            element={
              <RequireAuth>
                <RequireRole>
                  <ActionPlan />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/action-progress"
            element={
              <RequireAuth>
                <RequireRole>
                  <ActionProgress />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RequireRole>
                  <Dashboard />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/progress"
            element={
              <RequireAuth>
                <RequireRole>
                  <ProgressDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />

          <Route
            path="/settings"
            element={
              <RequireAuth>
                <RequireRole>
                  <Settings />
                </RequireRole>
              </RequireAuth>
            }
          />

          
          <Route
            path="/skill-profile"
            element={
              <RequireAuth>
                <SkillProfile />
              </RequireAuth>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}