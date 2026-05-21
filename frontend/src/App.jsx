import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SkillAssessment from './pages/SkillAssessment';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SkillAssessment />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}