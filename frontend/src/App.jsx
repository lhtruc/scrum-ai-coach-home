import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RegisterPage from "./pages/RegisterPage";
import SkillAssessment from "./pages/SkillAssessment";
import ActionProgress from "./pages/ActionProgress";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Layout><SkillAssessment /></Layout>} />
        <Route path="/progress" element={<Layout><ActionProgress /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
