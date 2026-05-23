import { useState, useEffect } from 'react';
import assessmentApi from '../services/assessmentApi';
import GoalSelection from './GoalSelection';
import './SkillAssessment.css';

const RATING_LEGEND = [
  { score: 1, label: 'Beginner', desc: 'New to this / just heard of it' },
  { score: 2, label: 'Elementary', desc: 'Basic knowledge, need guidance' },
  { score: 3, label: 'Intermediate', desc: 'Can complete tasks independently' },
  { score: 4, label: 'Advanced', desc: 'Proficient, can mentor others' },
  { score: 5, label: 'Expert', desc: 'Mastery, deep knowledge' }
];

const getStoredUserProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('user_profile') || '{}');
  } catch {
    return {};
  }
};

export default function SkillAssessment() {
  const [courses, setCourses] = useState([]);
  const [view, setView] = useState('LIST'); 
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const userProfile = getStoredUserProfile();
  const currentUserId = userProfile?.id || '';
  const currentUserName = userProfile?.display_name || userProfile?.email || 'User';

  useEffect(() => {
    assessmentApi.getSkills()
      .then(data => {
        if (data && data.skills) {
          setCourses(data.skills);
        }
      })
      .catch(err => console.error("Error loading skills:", err));
  }, []);

  const handleReselect = () => {
    setSelectedCourse(null);
    setSelectedLevel(null);
    setView('LIST');
  };

  const handleSubmitToBackend = async () => {
    if (!selectedLevel) return;
    setView('GENERATING'); 

    const payload = {
      ratings: [
        {
          skill_name: selectedCourse.name,
          rating_level: selectedLevel
        }
      ]
    };

    try {
      await assessmentApi.submitAssessment(payload);
      setView('RESULT');
    } catch (error) {
      alert("Server connection failed!");
      setView('REVIEW');
    }
  };

  const renderProgress = (progress) => (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );

  // ================= VIEW 5: RESULT (GOAL SELECTION SUITE) =================
  if (view === 'RESULT') {
    return (
      <GoalSelection 
        userId={currentUserId}
        userName={currentUserName}
        skillName={selectedCourse.name}
        ratingLevel={selectedLevel}
        onResetFlow={handleReselect} // Khi nhấn nút hoàn tất, reset flow về màn hình LIST ban đầu
      />
    );
  }

  // ================= VIEW 4: LOADING =================
  if (view === 'GENERATING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{marginTop: '20px'}}>Syncing data...</h3>
          <p className="subtitle">Transmitting your {selectedCourse.name} assessment to the system.</p>
        </div>
      </div>
    );
  }

  // ================= VIEW 3: REVIEW =================
  if (view === 'REVIEW') {
    const levelData = RATING_LEGEND.find(l => l.score === Number(selectedLevel)) || {};

    if (!selectedCourse || !levelData.score) {
      return (
        <div className="mobile-container">
          <div className="glass-card text-center">
            <h3>Oops, data lost!</h3>
            <button className="btn btn-primary" onClick={handleReselect}>Start Over</button>
          </div>
        </div>
      );
    }

    return (
      <div className="mobile-container slide-left">
        {renderProgress(100)}
        <div className="header-text">
          <h1 className="title">Review Goal</h1>
          <p className="subtitle">Confirm your skill and level before submitting.</p>
        </div>

        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Selected Skill</h4>
          <p style={{ fontWeight: '600', color: 'var(--primary)' }}>{selectedCourse.name}</p>
          <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '15px 0' }}/>
          <h4 style={{ margin: '0 0 10px 0' }}>Selected Level</h4>
          <div className="level-card selected" style={{ pointerEvents: 'none' }}>
            <div className="level-badge">{levelData.score}</div>
            <div className="level-info">
              <h4>{levelData.label}</h4>
              <p>{levelData.desc}</p>
            </div>
          </div>
        </div>

        <div className="bottom-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleSubmitToBackend}>Confirm & Create Goal</button>
          <button className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={handleReselect}>Reselect</button>
        </div>
      </div>
    );
  }

  // ================= VIEW 2: RATING LEVEL =================
  if (view === 'RATE') {
    return (
      <div className="mobile-container slide-left">
        {renderProgress(60)}
        <button className="btn-icon-back" onClick={() => setView('LIST')}>← Back</button>

        <div className="course-hero">
          <div className="course-hero-img-wrapper">
            <img src={selectedCourse.image} alt={selectedCourse.name} className="course-hero-img" onError={(e) => e.target.style.display='none'} />
          </div>
          <h2 className="hero-title">{selectedCourse.name}</h2>
          <p className="hero-subtitle">Determine your starting point</p>
        </div>

        <div className="level-list">
          {RATING_LEGEND.map((level) => (
            <div key={level.score} className={`level-card ${selectedLevel === level.score ? 'selected' : ''}`} onClick={() => setSelectedLevel(level.score)}>
              <div className="level-badge">{level.score}</div>
              <div className="level-info">
                <h4>{level.label}</h4>
                <p>{level.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bottom-action-bar">
          <button className="btn btn-primary" onClick={() => setView('REVIEW')} disabled={!selectedLevel}>Continue</button>
        </div>
      </div>
    );
  }

  // ================= VIEW 1: COURSE LIST =================
  return (
    <div className="mobile-container fade-in">
      {renderProgress(20)}
      <div className="header-text">
        <h1 className="title">Explore Skills</h1>
        <p className="subtitle">Select a topic to personalize your learning experience.</p>
      </div>
      
      <div className="course-grid">
        {courses.map((course) => (
          <div 
            key={course.id} 
            className="course-card" 
            onClick={() => {
              setSelectedCourse(course);
              setView('RATE');
            }}
          >
            <div className="course-img-wrapper">
              <img src={course.image} alt={course.name} className="course-img" onError={(e) => e.target.style.display='none'} />
            </div>
            <div className="course-content"><h3>{course.name}</h3></div>
          </div>
        ))}
      </div>
    </div>
  );
}
