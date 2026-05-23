import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Welcome from "./pages/Welcome";
import SkillAssessment from "./pages/SkillAssessment";
import Login from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import ActionPlan from "./pages/ActionPlan";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import Onboarding from "./pages/Onboarding";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterPage />} />

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
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}