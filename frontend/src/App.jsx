import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

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

// ==========================================
// GIẢI QUYẾT MERGE CONFLICT (ACCEPT BOTH)
// ==========================================

// [Accept từ nhánh: frontend-view-skill-profile]
// import RequireAuth from "./components/RequireAuth"; // -> Dòng này bị xóa (comment lại) do đã được import ở dòng 4 bên trên.
import SkillProfile from "./pages/SkillProfile";       // -> Giữ lại để render route /skill-profile

// [Accept từ nhánh: main]
import Feedback from "./pages/Feedback";               // -> Giữ lại để render route /feedback

function HomeRedirect() {                              // -> Giữ lại hàm này làm component cho route "/"
  const token = localStorage.getItem("access_token");
  return <Navigate to={token ? "/dashboard" : "/welcome"} replace />;
}

// ==========================================

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
            element={<HomeRedirect />}
          />

          <Route
            path="/skills"
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
            path="/feedback"
            element={
              <RequireAuth>
                <RequireRole>
                  <Feedback />
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