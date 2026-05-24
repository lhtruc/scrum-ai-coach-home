import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import actionPlanApi from '../services/actionPlanApi';
import './SkillAssessment.css';
import './ActionPlan.css';

function formatDeadline(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  return date < new Date() && !Number.isNaN(date.getTime());
}

function SmartBadges() {
  const labels = [
    { key: 's', label: 'Specific' },
    { key: 'm', label: 'Measurable' },
    { key: 'a', label: 'Achievable' },
    { key: 'r', label: 'Relevant' },
    { key: 't', label: 'Time-bound' }
  ];

  return (
    <div className="smart-badges">
      {labels.map(({ key, label }) => (
        <span key={key} className={`smart-badge ${key}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function FeasibilityBadge({ feasibility }) {
  if (!feasibility) return null;

  return <span className={`feasibility-badge ${feasibility}`}>{feasibility}</span>;
}

function StepCard({ step, index, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const overdue = !step.is_completed && isOverdue(step.deadline);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setToggling(true);
    await onToggle(step.id, !step.is_completed);
    setToggling(false);
  };

  return (
    <div
      id={`step-card-${step.id}`}
      className={`step-card${step.is_completed ? ' completed' : ''}${toggling ? ' toggling' : ''}`}
      onClick={handleToggle}
      onKeyDown={(e) => e.key === 'Enter' && handleToggle(e)}
      role="checkbox"
      aria-checked={step.is_completed}
      tabIndex={0}
    >
      <div className="step-checkbox" aria-hidden="true">
        <span className="step-checkbox-check">✓</span>
      </div>

      <div className="step-content">
        <div className="step-number">Step {index + 1}</div>
        <h3 className="step-title">{step.title}</h3>
        <p className="step-description">{step.description}</p>

        <div className="step-meta">
          {step.metric && (
            <span className="step-meta-pill metric" title="Measurable metric">
              Metric: {step.metric}
            </span>
          )}
          {step.deadline && (
            <span className={`step-meta-pill deadline${overdue ? ' overdue' : ''}`} title="Deadline">
              {overdue ? 'Overdue:' : 'Deadline:'} {formatDeadline(step.deadline)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getStoredUserId() {
  try {
    const userProfile = JSON.parse(localStorage.getItem('user_profile') || 'null');
    return userProfile?.id || null;
  } catch {
    return null;
  }
}

export default function ActionPlan({
  goalId: propGoalId,
  goalTitle: propGoalTitle,
  goalTechnique: propGoalTechnique,
  feasibility: propFeasibility,
  onBack
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location?.state || {};

  const initGoalId = propGoalId || routeState.goalId || null;
  const initTitle = propGoalTitle || routeState.goalTitle || '';
  const initTechnique = propGoalTechnique || routeState.goalTechnique || '';
  const initFeasibility = propFeasibility || routeState.feasibility || 'MEDIUM';
  const initGoalInfo = {
    title: initTitle,
    technique: initTechnique,
    feasibility: initFeasibility
  };

  const [view, setView] = useState('LOADING'); // LOADING | LIST | ERROR | EMPTY
  const [goalId, setGoalId] = useState(initGoalId);
  const [goalInfo, setGoalInfo] = useState(initGoalInfo);
  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [fallbackMsg, setFallbackMsg] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [needsRevision, setNeedsRevision] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisedSteps, setRevisedSteps] = useState([]);

  const computeProgress = useCallback((stepList) => {
    const total = stepList.length;
    const completed = stepList.filter((step) => step.is_completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    setProgress({ total, completed, percentage });
  }, []);

  const generatePlan = useCallback(async (targetGoalId, meta) => {
    if (!targetGoalId) {
      setFallbackMsg('Please choose a goal first before generating an action plan.');
      setView('EMPTY');
      return;
    }

    setGenerating(true);
    setFallbackMsg(null);

    try {
      const safeMeta = {
        title: meta?.title || `Goal #${targetGoalId}`,
        technique: meta?.technique || 'General',
        feasibility: meta?.feasibility || 'MEDIUM'
      };

      const payload = {
        goal_id: Number(targetGoalId),
        goal_title: safeMeta.title,
        goal_technique: safeMeta.technique,
        feasibility: safeMeta.feasibility
      };

      const data = await actionPlanApi.generateActionPlan(payload);
      const generatedSteps = data.steps || [];

      setGoalId(Number(targetGoalId));
      setGoalInfo(safeMeta);
      setSteps(generatedSteps);
      computeProgress(generatedSteps);
      setView(generatedSteps.length > 0 ? 'LIST' : 'EMPTY');
    } catch (err) {
      console.error('Action plan generation failed:', err);
      setFallbackMsg('AI is currently unavailable, please try again.');
      setView('ERROR');
    } finally {
      setGenerating(false);
    }
  }, [computeProgress]);

  const loadGoalSteps = useCallback(async (targetGoalId, meta, { autoGenerate = false } = {}) => {
    if (!targetGoalId) {
      setFallbackMsg('Please choose a goal first before opening the action plan.');
      setView('EMPTY');
      return;
    }

    setView('LOADING');
    setFallbackMsg(null);

    try {
      const safeMeta = {
        title: meta?.title || `Goal #${targetGoalId}`,
        technique: meta?.technique || 'General',
        feasibility: meta?.feasibility || 'MEDIUM'
      };

      const data = await actionPlanApi.getActionSteps(targetGoalId);
      const fetchedSteps = data.steps || [];

      setGoalId(Number(targetGoalId));
      setGoalInfo(safeMeta);

      if (fetchedSteps.length === 0 && autoGenerate) {
        await generatePlan(targetGoalId, safeMeta);
        return;
      }

      setSteps(fetchedSteps);
      computeProgress(fetchedSteps);
      setView(fetchedSteps.length > 0 ? 'LIST' : 'EMPTY');
    } catch (err) {
      console.error('Failed to load action steps:', err);
      setFallbackMsg('Failed to load the action plan. Please try again.');
      setView('ERROR');
    }
  }, [computeProgress, generatePlan]);

  const bootstrapActiveGoal = useCallback(async () => {
    setView('LOADING');
    setFallbackMsg(null);

    try {
      const data = await actionPlanApi.getActiveGoalStats(getStoredUserId());
      const activeGoal = data.active_goal;
      const fetchedSteps = data.steps || [];

      if (!activeGoal?.id) {
        setFallbackMsg('Please select a goal first.');
        setView('EMPTY');
        return;
      }

      const meta = {
        title: activeGoal.goal_title || activeGoal.name || '',
        technique: activeGoal.goal_technique || '',
        feasibility: activeGoal.feasibility || 'MEDIUM'
      };

      setGoalId(activeGoal.id);
      setGoalInfo(meta);

      if (fetchedSteps.length === 0) {
        await generatePlan(activeGoal.id, meta);
        return;
      }

      setSteps(fetchedSteps);
      computeProgress(fetchedSteps);
      setView('LIST');
    } catch (err) {
      console.error('Failed to bootstrap active goal:', err);
      setFallbackMsg('Please select and confirm a goal before opening the action plan.');
      setView('EMPTY');
    }
  }, [computeProgress, generatePlan]);

  useEffect(() => {
    if (initGoalId) {
      loadGoalSteps(
        initGoalId,
        {
          title: initTitle,
          technique: initTechnique,
          feasibility: initFeasibility
        },
        { autoGenerate: Boolean(routeState.autoGenerate) }
      );
      return;
    }

    bootstrapActiveGoal();
      actionPlanApi
      .checkOverdue()
      .then((data) => {
        if (data?.needs_revision) {
          setNeedsRevision(true);
        }
      })
      .catch((err) => {
        console.error('Failed to check overdue:', err);
      });
  }, [
    bootstrapActiveGoal,
    initGoalId,
    initFeasibility,
    initTechnique,
    initTitle,
    loadGoalSteps,
    routeState.autoGenerate
  ]);

  const handleToggleStep = async (stepId, newStatus) => {
    try {
      await actionPlanApi.updateStepStatus(stepId, newStatus);

      const updatedSteps = steps.map((step) =>
        step.id === stepId ? { ...step, is_completed: newStatus } : step
      );

      setSteps(updatedSteps);
      computeProgress(updatedSteps);
    } catch (err) {
      console.error('Failed to update step status:', err);
      setFallbackMsg('Failed to update step. Please try again.');
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (routeState.fromGoalFlow) {
      navigate('/skills');
      return;
    }

    navigate(-1);
  };

  const handleRetry = () => {
    if (goalId) {
      loadGoalSteps(goalId, goalInfo, { autoGenerate: true });
      return;
    }

    bootstrapActiveGoal();
  };

    const handleRevisePlan = async () => {
    try {
      setRevisionLoading(true);

      const data = await actionPlanApi.revisePlan();

      setRevisedSteps(data.revised_steps || []);
      setShowRevisionModal(true);
    } catch (err) {
      console.error('Failed to revise plan:', err);
      alert('Failed to revise action plan');
    } finally {
      setRevisionLoading(false);
    }
  };

  const handleAcceptRevision = async () => {
    try {
      await actionPlanApi.bulkUpdatePlan(revisedSteps);

      setShowRevisionModal(false);
      setNeedsRevision(false);

      await loadGoalSteps(goalId, goalInfo);

      alert('Adjusted plan saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save revised plan');
    }
  };

  const handleKeepOriginal = () => {
    setShowRevisionModal(false);
  };

  const allDone = steps.length > 0 && steps.every((step) => step.is_completed);

  if (view === 'LOADING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Loading Action Plan...</h3>
          <p className="subtitle">Fetching your goal and existing SMART steps.</p>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Generating Action Plan...</h3>
          <p className="subtitle">Creating your personalized SMART milestones from the confirmed goal.</p>
        </div>
      </div>
    );
  }

  if (view === 'EMPTY') {
    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">Action Plan</h1>
          <p className="subtitle">Action plans are available after a goal has been confirmed.</p>
        </div>

        <div className="fallback-card" id="empty-action-plan-message">
          <span className="fallback-icon">!</span>
          <p className="fallback-text">{fallbackMsg || 'Please select a goal first.'}</p>
        </div>

        <div className="bottom-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/skills')}>
            Choose Goal
          </button>
          <button className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={handleBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (view === 'ERROR') {
    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">Action Plan</h1>
        </div>

        <div className="fallback-card" id="fallback-message">
          <span className="fallback-icon">!</span>
          <p className="fallback-text">{fallbackMsg || 'AI is currently unavailable, please try again.'}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" id="retry-btn" onClick={handleRetry}>
            Try Again
          </button>
          <button className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={handleBack}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container slide-up">
      <button className="btn-icon-back" id="back-to-goals-btn" onClick={handleBack}>
        ← Back
      </button>

      <div className="header-text">
        <h1 className="title">SMART Action Plan</h1>
        <p className="subtitle">Click any step to mark it as complete.</p>
      </div>

      <SmartBadges />

      {needsRevision && (
        <div className="revision-banner">
          <div>
            <h3>You have missed some deadlines</h3>

            <p>
              Would you like the AI to adjust your schedule?
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleRevisePlan}
            disabled={revisionLoading}
          >
            {revisionLoading ? 'Adjusting...' : 'Adjust Plan'}
          </button>
        </div>
      )}

      {fallbackMsg && (
        <div className="fallback-card" id="fallback-inline-message">
          <span className="fallback-icon">!</span>
          <p className="fallback-text">{fallbackMsg}</p>
        </div>
      )}

      {goalInfo.title && (
        <div className="goal-banner" id="goal-banner">
          <div className="goal-banner-label">Confirmed Goal</div>
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

      {allDone && (
        <div className="complete-banner" id="all-complete-banner">
          <div className="complete-banner-icon">✓</div>
          <h3 className="complete-banner-title">All Steps Completed!</h3>
          <p className="complete-banner-sub">You have finished the full SMART action plan for this goal.</p>
        </div>
      )}

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

      <div className="bottom-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          id="regenerate-btn"
          className="btn btn-primary"
          onClick={() => generatePlan(goalId, goalInfo)}
          disabled={generating}
        >
          Regenerate Action Plan
        </button>
        <button
          className="btn"
          style={{ background: '#f1f5f9', color: '#475569' }}
          onClick={() => navigate('/progress')}
        >
          Go to Progress
        </button>
      </div>
      {showRevisionModal && (
        <div className="revision-modal-overlay">
          <div className="revision-modal">
            <h2>Adjusted Action Plan</h2>
            
            <p className="revision-modal-sub">
              AI suggested updated deadlines based on your current progress.
            </p>
            
            <div className="revision-list">
              {revisedSteps.map((step) => (
                <div key={step.id} className="revision-item">
                  <h4>{step.title}</h4>

                  <div className="revision-dates">
                    <span className="old-date">
                      Old: {formatDeadline(step.old_deadline)}
                    </span>

                    <span className="new-date">
                      New: {formatDeadline(step.deadline)}
                    </span>
                  </div>
                </div>
              ))}
            </div><div className="revision-actions">
              <button
                className="btn"
                onClick={handleKeepOriginal}
              >
                Keep Original Plan
              </button>

              <button
                className="btn btn-primary"
                onClick={handleAcceptRevision}
              >
                Accept Adjusted Plan
              </button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
