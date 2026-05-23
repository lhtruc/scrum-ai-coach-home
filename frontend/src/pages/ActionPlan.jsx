import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import actionPlanApi from '../services/actionPlanApi';
import './SkillAssessment.css';
import './ActionPlan.css';

// Helper: format YYYY-MM-DD → readable date string
function formatDeadline(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper: check if a deadline is overdue
function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d < new Date() && !isNaN(d.getTime());
}

// SMART label badges (Specific, Measurable, Achievable, Relevant, Time-bound)
function SmartBadges() {
  const labels = [
    { key: 's', label: 'Specific' },
    { key: 'm', label: 'Measurable' },
    { key: 'a', label: 'Achievable' },
    { key: 'r', label: 'Relevant' },
    { key: 't', label: 'Time-bound' },
  ];
  return (
    <div className="smart-badges">
      {labels.map(({ key, label }) => (
        <span key={key} className={`smart-badge ${key}`}>{label}</span>
      ))}
    </div>
  );
}

// Feasibility badge (reuse pattern from GoalSelection.jsx)
function FeasibilityBadge({ feasibility }) {
  if (!feasibility) return null;
  return (
    <span className={`feasibility-badge ${feasibility}`}>{feasibility}</span>
  );
}

// Single action step card with checkbox toggle
function StepCard({ step, index, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    await onToggle(step.id, !step.is_completed);
    setToggling(false);
  };

  const overdue = !step.is_completed && isOverdue(step.deadline);

  return (
    <div
      id={`step-card-${step.id}`}
      className={`step-card${step.is_completed ? ' completed' : ''}${toggling ? ' toggling' : ''}`}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={step.is_completed}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleToggle(e)}
    >
      {/* Checkbox circle */}
      <div className="step-checkbox" aria-hidden="true">
        <span className="step-checkbox-check">✓</span>
      </div>

      {/* Content */}
      <div className="step-content">
        <div className="step-number">Step {index + 1}</div>
        <h3 className="step-title">{step.title}</h3>
        <p className="step-description">{step.description}</p>

        <div className="step-meta">
          {step.metric && (
            <span className="step-meta-pill metric" title="Measurable metric">
              📊 {step.metric}
            </span>
          )}
          {step.deadline && (
            <span className={`step-meta-pill deadline${overdue ? ' overdue' : ''}`} title="Deadline">
              {overdue ? '⚠️' : '📅'} {formatDeadline(step.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================
// Main ActionPlan Component
// =============================================
export default function ActionPlan({ goalId: propGoalId, goalTitle: propGoalTitle, goalTechnique: propGoalTechnique, feasibility: propFeasibility, onBack }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Merge: prefer explicit props, fallback to react-router location.state
  const routeState = location?.state || {};
  const initGoalId = propGoalId || routeState.goalId || null;
  const initTitle = propGoalTitle || routeState.goalTitle || '';
  const initTech = propGoalTechnique || routeState.goalTechnique || '';
  const initFeas = propFeasibility || routeState.feasibility || 'MEDIUM';

  // view: 'SETUP' | 'LOADING' | 'LIST' | 'GENERATING' | 'ERROR' | 'COMPLETE'
  const [view, setView] = useState(initGoalId ? 'LOADING' : 'SETUP');

  const [goalId, setGoalId] = useState(initGoalId || '');
  const [goalIdInput, setGoalIdInput] = useState('');
  const [goalInfo, setGoalInfo] = useState({
    title: initTitle,
    technique: initTech,
    feasibility: initFeas
  });

  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [fallbackMsg, setFallbackMsg] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Compute progress from steps
  const computeProgress = useCallback((stepList) => {
    const total = stepList.length;
    const completed = stepList.filter(s => s.is_completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    setProgress({ total, completed, percentage });
  }, []);

  // Load existing steps for the goal
  const loadSteps = useCallback(async (id) => {
    setView('LOADING');
    setFallbackMsg(null);
    try {
      const data = await actionPlanApi.getActionSteps(id);
      const fetchedSteps = data.steps || [];
      setSteps(fetchedSteps);
      computeProgress(fetchedSteps);
      setView(fetchedSteps.length === 0 ? 'SETUP' : 'LIST');
    } catch (err) {
      console.error('Failed to load action steps:', err);
      setFallbackMsg('AI is currently unavailable, please try again.');
      setSteps([]);
      setView('ERROR');
    }
  }, [computeProgress]);

  // Initial load if goalId is available (from props or router state)
  useEffect(() => {
    if (initGoalId) {
      loadSteps(initGoalId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle loading steps by manually entering goal ID
  const handleLoadById = async () => {
    const id = parseInt(goalIdInput, 10);
    if (!id || isNaN(id)) return;
    setGoalId(id);
    await loadSteps(id);
  };

  // Call POST /api/actions/generate
  const handleGenerate = async () => {
    if (!goalId) return;
    setGenerating(true);
    setFallbackMsg(null);

    try {
      const payload = {
        goal_id: parseInt(goalId, 10),
        goal_title: goalInfo.title || `Goal #${goalId}`,
        goal_technique: goalInfo.technique || 'General',
        feasibility: goalInfo.feasibility || 'MEDIUM'
      };
      const data = await actionPlanApi.generateActionPlan(payload);
      const generatedSteps = data.steps || [];
      setSteps(generatedSteps);
      computeProgress(generatedSteps);
      setView('LIST');
    } catch (err) {
      console.error('Action plan generation failed:', err);
      // Fallback message as per acceptance criteria
      setFallbackMsg('AI is currently unavailable, please try again.');
      setView('ERROR');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle a step's complete/incomplete — PUT /api/actions/{id}/status
  const handleToggleStep = async (stepId, newStatus) => {
    try {
      await actionPlanApi.updateStepStatus(stepId, newStatus);
      const updated = steps.map(s =>
        s.id === stepId ? { ...s, is_completed: newStatus } : s
      );
      setSteps(updated);
      computeProgress(updated);

      // Show COMPLETE banner if all done
      if (updated.every(s => s.is_completed) && updated.length > 0) {
        setView('COMPLETE');
      } else if (view === 'COMPLETE') {
        setView('LIST');
      }
    } catch (err) {
      console.error('Failed to update step status:', err);
      setFallbackMsg('Failed to update step. Please try again.');
    }
  };

  const allDone = steps.length > 0 && steps.every(s => s.is_completed);

  // ================= VIEW: LOADING =================
  if (view === 'LOADING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Loading Action Plan...</h3>
          <p className="subtitle">Fetching your SMART steps from the database.</p>
        </div>
      </div>
    );
  }

  // ================= VIEW: GENERATING =================
  if (generating) {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>AI is generating your plan...</h3>
          <p className="subtitle">Creating a personalized SMART action plan with at least 5 steps.</p>
        </div>
      </div>
    );
  }

  // ================= VIEW: SETUP (No goal ID provided) =================
  if (view === 'SETUP' && !initGoalId) {
    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">SMART Action Plan</h1>
        </div>

        <SmartBadges />

        {fallbackMsg && (
          <div className="fallback-card" id="fallback-message">
            <span className="fallback-icon">⚠️</span>
            <p className="fallback-text">{fallbackMsg}</p>
          </div>
        )}

        <div className="generate-area">
          <div className="generate-icon">🤖</div>
          <h3 className="generate-title">Or generate a new plan</h3>


          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            {/*Delete this when release*/}
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Goal ID *</label>
            <input
              id="gen-goal-id-input"
              type="number"
              className="input-field"
              placeholder="Goal ID"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Goal Title</label>
            <input
              id="gen-goal-title-input"
              type="text"
              className="input-field"
              placeholder="E.g., Master SQL in 4 weeks"
              value={goalInfo.title}
              onChange={(e) => setGoalInfo(g => ({ ...g, title: e.target.value }))}
              style={{ marginBottom: '10px' }}
            />
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Technique / Skill</label>
            <input
              id="gen-goal-technique-input"
              type="text"
              className="input-field"
              placeholder="E.g., SQL, Python, Scrum"
              value={goalInfo.technique}
              onChange={(e) => setGoalInfo(g => ({ ...g, technique: e.target.value }))}
              style={{ marginBottom: '10px' }}
            />
            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '6px' }}>Feasibility</label>
            <select
              id="gen-feasibility-select"
              className="input-field"
              value={goalInfo.feasibility}
              onChange={(e) => setGoalInfo(g => ({ ...g, feasibility: e.target.value }))}
              style={{ marginBottom: '0' }}
            >
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <button
            id="generate-btn"
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={!goalId}
          >
            Generate SMART Action Plan
          </button>
        </div>
      </div >
    );
  }

  // ================= VIEW: ERROR / FALLBACK =================
  if (view === 'ERROR') {
    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">Action Plan</h1>
        </div>
        <div className="fallback-card" id="fallback-message">
          <span className="fallback-icon">⚠️</span>
          <p className="fallback-text">{fallbackMsg || 'AI is currently unavailable, please try again.'}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" id="retry-btn" onClick={() => {
            setFallbackMsg(null);
            setView('SETUP');
          }}>
            ← Try Again
          </button>
          {onBack && (
            <button className="btn" id="back-btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={onBack}>
              Back to Goals
            </button>
          )}
        </div>
      </div>
    );
  }

  // ================= VIEW: LIST + COMPLETE =================
  return (
    <div className="mobile-container slide-up">
      {/* Back button */}
      {/* {onBack && (
        <button className="btn-icon-back" id="back-to-goals-btn" onClick={onBack}>← Back to Goals</button>
      )} */}
      <button
        className="btn-icon-back"
        id="back-to-goals-btn"
        onClick={onBack || (() => navigate(-1))}
      >
        ← Back to Goals
      </button>

      {/* Header */}
      <div className="header-text">
        <h1 className="title">SMART Action Plan</h1>
        <p className="subtitle">Click any step to mark it as complete.</p>
      </div>

      {/* SMART badge row */}
      <SmartBadges />

      {/* Fallback / error inline */}
      {fallbackMsg && (
        <div className="fallback-card" id="fallback-inline-message">
          <span className="fallback-icon">⚠️</span>
          <p className="fallback-text">{fallbackMsg}</p>
        </div>
      )}

      {/* Goal info banner */}
      {goalInfo.title && (
        <div className="goal-banner" id="goal-banner">
          <div className="goal-banner-label">Active Goal</div>
          <h2 className="goal-banner-title">
            {goalInfo.title}
            <FeasibilityBadge feasibility={goalInfo.feasibility} />
          </h2>
          <div className="goal-banner-stats">
            <div className="goal-banner-stat">
              <span className="goal-banner-stat-value">{progress.total}</span>
              <span className="goal-banner-stat-label">Total Steps</span>
            </div>
            <div className="goal-banner-stat">
              <span className="goal-banner-stat-value">{progress.completed}</span>
              <span className="goal-banner-stat-label">Completed</span>
            </div>
            <div className="goal-banner-stat">
              <span className="goal-banner-stat-value">{progress.total - progress.completed}</span>
              <span className="goal-banner-stat-label">Remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* All-complete celebration banner */}
      {(view === 'COMPLETE' || allDone) && (
        <div className="complete-banner" id="all-complete-banner">
          <div className="complete-banner-icon">🎉</div>
          <h3 className="complete-banner-title">All Steps Completed!</h3>
          <p className="complete-banner-sub">You've finished your entire SMART action plan. Amazing work!</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="progress-section" id="progress-section">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-pct" id="progress-percentage">{progress.percentage}%</span>
        </div>
        <div className="progress-bar-track">
          <div
            id="progress-bar-fill"
            className="progress-bar-fill"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Step list — structured list as per acceptance criteria */}
      <div className="step-list" id="action-step-list" role="list" aria-label="SMART action steps">
        {steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            onToggle={handleToggleStep}
          />
        ))}
      </div>

      {/* Sticky regenerate bar */}
      <div className="bottom-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          id="regenerate-btn"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          🔄 Regenerate Action Plan
        </button>
        {onBack && (
          <button id="back-bottom-btn" className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={onBack}>
            ← Back to Goals
          </button>
        )}
      </div>
    </div>
  );
}
