import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import actionPlanApi from '../services/actionPlanApi';
import assessmentApi from '../services/assessmentApi';
import GoalSelection from './GoalSelection';
import SkillProfile from './SkillProfile';
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') === 'profile' ? 'profile' : 'goal';

  const [courses, setCourses] = useState([]);
  const [view, setView] = useState('LIST');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [goalSectionStatus, setGoalSectionStatus] = useState('LOADING'); // LOADING | FOUND | EMPTY
  const [activeGoalSummary, setActiveGoalSummary] = useState(null);

  const userProfile = getStoredUserProfile();
  const currentUserId = userProfile?.id || '';
  const currentUserName = userProfile?.display_name || userProfile?.email || 'User';

  useEffect(() => {
    assessmentApi.getSkills()
      .then((data) => {
        if (data?.skills) {
          setCourses(data.skills);
        }
      })
      .catch((err) => console.error('Error loading skills:', err));
  }, []);

  useEffect(() => {
    if (section !== 'goal') {
      return;
    }

    let isCancelled = false;

    const fetchActiveGoal = async () => {
      setGoalSectionStatus('LOADING');

      try {
        const data = await actionPlanApi.getActiveGoalStats(currentUserId || null);
        const activeGoal = data?.active_goal;
        const steps = data?.steps || [];
        const completedSteps = steps.filter((step) => step.is_completed).length;

        if (isCancelled) {
          return;
        }

        if (activeGoal?.id) {
          setActiveGoalSummary({
            id: activeGoal.id,
            title: activeGoal.goal_title || activeGoal.name,
            technique: activeGoal.goal_technique,
            feasibility: activeGoal.feasibility,
            totalSteps: steps.length,
            completedSteps,
            goalDeadline: data?.statistics?.goal_deadline || null
          });
          setGoalSectionStatus('FOUND');
        } else {
          setActiveGoalSummary(null);
          setGoalSectionStatus('EMPTY');
        }
      } catch (error) {
        if (!isCancelled) {
          setActiveGoalSummary(null);
          setGoalSectionStatus('EMPTY');
        }
      }
    };

    fetchActiveGoal();

    return () => {
      isCancelled = true;
    };
  }, [currentUserId, section]);

  const handleReselect = () => {
    setSelectedCourse(null);
    setSelectedLevel(null);
    setView('LIST');
  };

  const handleSubmitToBackend = async () => {
    if (!selectedLevel || !selectedCourse) return;

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
      alert('Server connection failed!');
      setView('REVIEW');
    }
  };

  const renderProgress = (progress) => (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );

  const openFullActionPlan = () => {
    if (!activeGoalSummary) return;

    navigate('/action-plan', {
      state: {
        goalId: activeGoalSummary.id,
        goalTitle: activeGoalSummary.title,
        goalTechnique: activeGoalSummary.technique,
        feasibility: activeGoalSummary.feasibility
      }
    });
  };

  if (section === 'profile') {
    return <SkillProfile />;
  }

  if (goalSectionStatus === 'LOADING' && view === 'LIST') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Loading Goal...</h3>
          <p className="subtitle">Checking your current learning goal.</p>
        </div>
      </div>
    );
  }

  if (goalSectionStatus === 'FOUND' && view === 'LIST' && activeGoalSummary) {
    const progressPercentage = activeGoalSummary.totalSteps === 0
      ? 0
      : Math.round((activeGoalSummary.completedSteps / activeGoalSummary.totalSteps) * 100);

    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">Your Goal</h1>
          <p className="subtitle">Open your current goal to continue with the full action plan.</p>
        </div>

        <div
          className="glass-card"
          onClick={openFullActionPlan}
          style={{ cursor: 'pointer', padding: '28px 24px', marginBottom: '20px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '14px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Active Goal
              </div>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{activeGoalSummary.title}</h3>
            </div>
            <span
              style={{
                padding: '6px 10px',
                borderRadius: '10px',
                backgroundColor:
                  activeGoalSummary.feasibility === 'HIGH'
                    ? '#dcfce7'
                    : activeGoalSummary.feasibility === 'LOW'
                      ? '#fee2e2'
                      : '#fef3c7',
                color:
                  activeGoalSummary.feasibility === 'HIGH'
                    ? '#166534'
                    : activeGoalSummary.feasibility === 'LOW'
                      ? '#991b1b'
                      : '#92400e',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              {activeGoalSummary.feasibility}
            </span>
          </div>

          <p style={{ margin: '0 0 14px 0', color: '#64748b' }}>
            Technique: <strong style={{ color: '#334155' }}>{activeGoalSummary.technique || 'General'}</strong>
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
              marginBottom: '16px'
            }}
          >
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>Progress</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{progressPercentage}%</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>Completed</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                {activeGoalSummary.completedSteps}/{activeGoalSummary.totalSteps}
              </div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>Deadline</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                {activeGoalSummary.goalDeadline || 'N/A'}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" type="button" onClick={openFullActionPlan}>
            Open Full Action Plan
          </button>
        </div>
      </div>
    );
  }

  if (view === 'RESULT') {
    return (
      <GoalSelection
        userId={currentUserId}
        userName={currentUserName}
        skillName={selectedCourse.name}
        ratingLevel={selectedLevel}
      />
    );
  }

  if (view === 'GENERATING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Syncing data...</h3>
          <p className="subtitle">Transmitting your {selectedCourse.name} assessment to the system.</p>
        </div>
      </div>
    );
  }

  if (view === 'REVIEW') {
    const levelData = RATING_LEGEND.find((level) => level.score === Number(selectedLevel)) || {};

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
          <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '15px 0' }} />
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

  if (view === 'RATE') {
    return (
      <div className="mobile-container slide-left">
        {renderProgress(60)}
        <button className="btn-icon-back" onClick={() => setView('LIST')}>← Back</button>

        <div className="course-hero">
          <div className="course-hero-img-wrapper">
            <img src={selectedCourse.image} alt={selectedCourse.name} className="course-hero-img" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h2 className="hero-title">{selectedCourse.name}</h2>
          <p className="hero-subtitle">Determine your starting point</p>
        </div>

        <div className="level-list">
          {RATING_LEGEND.map((level) => (
            <div
              key={level.score}
              className={`level-card ${selectedLevel === level.score ? 'selected' : ''}`}
              onClick={() => setSelectedLevel(level.score)}
            >
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
              <img src={course.image} alt={course.name} className="course-img" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="course-content"><h3>{course.name}</h3></div>
          </div>
        ))}
      </div>
    </div>
  );
}
