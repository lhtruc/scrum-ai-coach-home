import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import SkillAssessment from "./pages/SkillAssessment";

// Import từ nhánh longfe1
import ActionProgress from "./pages/ActionProgress";

// Import từ nhánh main
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import ActionPlan from "./pages/ActionPlan";
import Dashboard from "./pages/Dashboard";
import ProgressDashboard from "./pages/ProgressDashboard";
import Settings from "./pages/Settings";
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <BrowserRouter>
      {/* Bọc Layout ở ngoài cùng để quản lý chung (giống nhánh main) */}
      <Layout>
        <Routes>
          {/* Các Route Public (Không cần đăng nhập) */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Các Route Private (Cần đăng nhập - Bọc bằng RequireAuth) */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <SkillAssessment />
              </RequireAuth>
            }
          />

          <Route
            path="/action-plan"
            element={
              <RequireAuth>
                <ActionPlan />
              </RequireAuth>
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/progress"
            element={
              <RequireAuth>
                <ProgressDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/settings"
            element={
              <RequireAuth>
                <Settings />
              </RequireAuth>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}