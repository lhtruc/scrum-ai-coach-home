import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SkillAssessment from './pages/SkillAssessment';
import Login from './pages/Login';
import Register from './pages/Register';
import RequireAuth from './components/RequireAuth';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <RequireAuth>
              <SkillAssessment />
            </RequireAuth>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}