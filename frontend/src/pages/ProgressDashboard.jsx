import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import actionPlanApi from '../services/actionPlanApi';
// [Lấy từ nhánh: main] - Import Modal chuyên dụng để xử lý 2 options revise
import ReviseModal from '../components/ReviseModal';
import './SkillAssessment.css';
import './ActionPlan.css';
import './ProgressDashboard.css';

// Helper: calculate days remaining from today to a deadline date string
function calcDaysRemaining(deadline) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

// Helper: format YYYY-MM-DD to readable string
function formatDeadline(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ percentage }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="donut-wrapper" id="donut-chart">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-label={`${percentage}% complete`}>
        {/* Background track */}
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {/* Progress arc */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      <div className="donut-label">
        <span className="donut-pct" id="donut-percentage">{percentage}%</span>
        <span className="donut-sublabel">Complete</span>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ id, value, label, color }) {
  return (
    <div className={`stat-card stat-card-${color}`} id={id}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ─── Compact Step Row (with checkbox toggle for real-time updates) ─────────────
function StepRow({ step, index, onToggle }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(step.id, !step.is_completed);
    setToggling(false);
  };

  return (
    <div
      id={`dashboard-step-${step.id}`}
      className={`dash-step-row${step.is_completed ? ' completed' : ''}${toggling ? ' toggling' : ''}`}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={step.is_completed}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
    >
      {/* Reuse step-checkbox styles from ActionPlan.css */}
      <div className="step-checkbox" aria-hidden="true">
        <span className="step-checkbox-check">✓</span>
      </div>
      <span className="dash-step-title">{index + 1}. {step.title}</span>
    </div>
  );
}

// ─── Main Progress Dashboard Component ──────────────────────────────────────────
export default function ProgressDashboard() {
  const navigate = useNavigate();

  // view: 'LOADING' | 'READY' | 'ERROR'
  const [view, setView] = useState('LOADING');
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [isGoalPickerOpen, setIsGoalPickerOpen] = useState(false);
  const [goal, setGoal] = useState(null);
  const [steps, setSteps] = useState([]);
  const [stats, setStats] = useState({
    total: 0, completed: 0, pending: 0,
    percentage: 0, daysRemaining: null, deadline: null
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [reviseLoading, setReviseLoading] = useState(false);
  
  // [Lấy từ nhánh: main] - Quản lý trạng thái mở Modal
  const [reviseOpen, setReviseOpen] = useState(false);

  const getDeadlineFromSteps = useCallback((stepList, fallbackDeadline = null) => {
    const deadlines = stepList
      .map((step) => step.deadline)
      .filter(Boolean)
      .sort();

    return deadlines.length > 0 ? deadlines[deadlines.length - 1] : fallbackDeadline;
  }, []);

  // Compute stats from current step list (for optimistic updates)
  const computeStats = useCallback((stepList, deadline) => {
    const total = stepList.length;
    const completed = stepList.filter(s => s.is_completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const daysRemaining = calcDaysRemaining(deadline);
    setStats({ total, completed, pending, percentage, daysRemaining, deadline });
  }, []);

  const loadGoalProgress = useCallback(async (targetGoal, { keepView = false } = {}) => {
    if (!targetGoal?.id) {
      setGoal(null);
      setSteps([]);
      computeStats([], null);
      return;
    }

    if (!keepView) {
      setView('LOADING');
    }

    const [data, overdueInfo] = await Promise.all([
      actionPlanApi.getActionSteps(targetGoal.id),
      actionPlanApi.checkOverdue(targetGoal.id).catch(err => {
        console.error('Check overdue failed:', err);
        return null;
      })
    ]);
    const fetchedSteps = data.steps || [];
    const deadline = getDeadlineFromSteps(fetchedSteps, targetGoal.goal_deadline || null);

    setGoal(targetGoal);
    setSelectedGoalId(String(targetGoal.id));
    setSteps(fetchedSteps);
    setOverdue(overdueInfo || null);
    computeStats(fetchedSteps, deadline);
    setView('READY');
  }, [computeStats, getDeadlineFromSteps]);

  useEffect(() => {
    (async () => {
      try {
        const goalsData = await actionPlanApi.getGoals();

        const fetchedGoals = goalsData.goals || [];

        if (fetchedGoals.length === 0) {
          setErrorMsg("You don't have a goal yet. Please create one to get started.");
          setView('ERROR');
          return;
        }

        setGoals(fetchedGoals);
        await loadGoalProgress(fetchedGoals[0], { keepView: true });
      } catch (err) {
        console.error('Dashboard load error:', err);
        setErrorMsg("We couldn't load your progress yet. Please try again.");
        setView('ERROR');
      }
    })();
  }, [loadGoalProgress]);

  const handleGoalSelect = async (goalId) => {
    const nextGoal = goals.find((item) => String(item.id) === String(goalId));
    if (!nextGoal) return;

    try {
      setIsGoalPickerOpen(false);
      await loadGoalProgress(nextGoal);
    } catch (err) {
      console.error('Goal progress load error:', err);
      setErrorMsg("We couldn't load progress for this goal. Please try again.");
      setView('ERROR');
    }
  };

  // [Lấy từ nhánh: main] - Khởi tạo payload chuẩn xác để gửi vào Modal
  const buildRevisePayload = () => {
    return {
      goal_id: goal?.id,
      progress: {
        completed_steps: steps.filter(s => s.is_completed).map(s => s.id),
        pending_steps: steps.filter(s => !s.is_completed).map(s => s.id),
        completion_percentage: stats.percentage
      },
      instruction: 'Do not modify completed steps. Keep all completed progress. Only revise incomplete steps. Return 2-3 options. Each option must include title, explanation, revised_steps, deadline_change.'
    };
  };

  // [Lấy từ nhánh: main] - Xử lý lưu kết quả trả về từ Modal
  const handleSaveRevision = async (option) => {
    if (!goal) return;
    setReviseLoading(true);
    try {
      const updates = option.steps || option.revised_steps || [];
      const shouldArchive = (option.version === 'Version 1') || ((option.strategy || '').toLowerCase().includes('reduce'));
      const payload = { goal_id: goal.id, steps: updates, archive_missing: Boolean(shouldArchive) };

      await actionPlanApi.bulkUpdate(payload);

      await loadGoalProgress(goal, { keepView: true });
      setReviseOpen(false);
    } catch (err) {
      console.error('Apply revision failed:', err);
    } finally {
      setReviseLoading(false);
    }
  };

  // Toggle a step — optimistic UI: update local state immediately, then call API
  const handleToggleStep = async (stepId, newStatus) => {
    // Optimistic update
    setSteps(prevSteps => {
      const updated = prevSteps.map(s => s.id === stepId ? { ...s, is_completed: newStatus } : s);
      computeStats(updated, stats.deadline);
      return updated;
    });

    try {
      await actionPlanApi.updateStepStatus(stepId, newStatus);
      if (goal?.id) {
        const overdueInfo = await actionPlanApi.checkOverdue(goal.id);
        setOverdue(overdueInfo);
      }
    } catch (err) {
      console.error('Toggle step error:', err);
      // Rollback on failure (invert status of the single step)
      setSteps(prevSteps => {
        const updated = prevSteps.map(s => s.id === stepId ? { ...s, is_completed: !newStatus } : s);
        computeStats(updated, stats.deadline);
        return updated;
      });
    }
  };

  const allDone = steps.length > 0 && steps.every(s => s.is_completed);

  // ──────── VIEW: LOADING ────────
  if (view === 'LOADING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{ marginTop: '20px' }}>Loading Dashboard...</h3>
          <p className="subtitle">Fetching your progress data.</p>
        </div>
      </div>
    );
  }

  // ──────── VIEW: ERROR ────────
  if (view === 'ERROR') {
    return (
      <div className="mobile-container fade-in">
        <div className="header-text">
          <h1 className="title">Progress Dashboard</h1>
        </div>
        <div className="fallback-card" id="dashboard-error">
          <p className="fallback-text">{errorMsg}</p>
        </div>
        <button
          className="btn btn-primary"
          id="dashboard-retry-btn"
          onClick={() => { setView('LOADING'); setErrorMsg(null); }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ──────── VIEW: READY ────────
  const daysLabel =
    stats.daysRemaining === null ? 'N/A' :
    stats.daysRemaining < 0     ? 'Overdue' :
    stats.daysRemaining === 0   ? 'Today' :
    `${stats.daysRemaining}d`;

  const daysColor =
    stats.daysRemaining === null           ? 'blue' :
    stats.daysRemaining < 0               ? 'red'  :
    stats.daysRemaining <= 3              ? 'orange' :
                                            'blue';

  return (
    <div className="mobile-container slide-up">

      {/* Header */}
      <div className="header-text">
        <h1 className="title">Progress Dashboard</h1>
        <p className="subtitle">Track your learning journey at a glance.</p>
      </div>

      {goals.length > 0 && (
        <div className="goal-picker" id="dashboard-goal-picker">
          <div>
            <span className="goal-picker-label">Selected Goal</span>
            <h2>{goal?.goal_title || goal?.name || 'Choose a goal'}</h2>
            <p>{goal?.goal_technique || 'General'} - {stats.percentage}% complete</p>
          </div>
          <button
            type="button"
            className="goal-picker-trigger"
            onClick={() => setIsGoalPickerOpen(true)}
          >
            Change Goal
          </button>
        </div>
      )}

      {isGoalPickerOpen && (
        <div
          className="goal-picker-overlay"
          role="presentation"
          onClick={() => setIsGoalPickerOpen(false)}
        >
          <div
            className="goal-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goal-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="goal-picker-dialog-header">
              <div>
                <span className="goal-picker-label">Your Goals</span>
                <h2 id="goal-picker-title">Choose progress to view</h2>
              </div>
              <button
                type="button"
                className="goal-picker-close"
                aria-label="Close goal picker"
                onClick={() => setIsGoalPickerOpen(false)}
              >
                X
              </button>
            </div>

            <div className="goal-picker-card-list">
              {goals.map((item) => {
                const isSelected = String(item.id) === selectedGoalId;
                const itemTotal = item.total_steps || 0;
                const itemCompleted = item.completed_steps || 0;
                const itemProgress = Math.round(item.progress_percentage || 0);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`goal-picker-card${isSelected ? ' selected' : ''}`}
                    onClick={() => handleGoalSelect(item.id)}
                  >
                    <div className="goal-picker-card-top">
                      <h3>{item.goal_title || item.name || `Goal #${item.id}`}</h3>
                      <span>{itemProgress}%</span>
                    </div>
                    <p>{item.goal_technique || 'General'}</p>
                    <div className="goal-picker-card-progress">
                      <div style={{ width: `${itemProgress}%` }}></div>
                    </div>
                    <div className="goal-picker-card-meta">
                      <span>{itemCompleted}/{itemTotal} steps</span>
                      <span>{item.goal_deadline ? formatDeadline(item.goal_deadline) : 'No deadline'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Overdue notification (from /api/actions/check-overdue) */}
      {overdue && overdue.needs_revision && (
        <div className="overdue-banner" id="dashboard-overdue-banner">
          <div className="overdue-icon">⚠️</div>
          <div className="overdue-body">
            <div className="overdue-text">You have {overdue.overdue_count} overdue action steps. Consider revising your action plan.</div>
          </div>
          <div className="overdue-actions">
            <button className="btn" onClick={() => setReviseOpen(true)} disabled={reviseLoading}>
              {reviseLoading ? 'Revising...' : 'Revise Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Active goal banner */}
      {goal && (
        <div className="goal-banner" id="dashboard-goal-banner">
          <div className="goal-banner-label">Selected Goal</div>
          <h2 className="goal-banner-title">{goal.goal_title || goal.name}</h2>
          
          {stats.deadline && (
            <div className="goal-banner-deadline">
              Deadline: {formatDeadline(stats.deadline)}
            </div>
          )}
        </div>
      )}

      {/* All-done celebration */}
      {allDone && (
        <div className="complete-banner" id="dashboard-complete-banner">
          <h3 className="complete-banner-title">Goal Completed!</h3>
          <p className="complete-banner-sub">You've finished all your SMART action steps. Amazing work!</p>
        </div>
      )}

      {/* Overview: Donut chart + Stat cards */}
      <div className="dash-overview glass-card" id="dashboard-overview">
        <DonutChart percentage={stats.percentage} />

        <div className="stat-grid" id="dashboard-stats">
          <StatCard
            id="stat-completed"
            value={stats.completed}
            label="Completed"
            color="green"
          />
          <StatCard
            id="stat-pending"
            value={stats.pending}
            label="Pending"
            color="orange"
          />
          <StatCard
            id="stat-days"
            value={daysLabel}
            label="Days Left"
            color={daysColor}
          />
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="progress-section" id="dashboard-progress-section">
        <div className="progress-header">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-pct" id="dashboard-progress-pct">{stats.percentage}%</span>
        </div>
        <div className="progress-bar-track">
          <div
            id="dashboard-progress-bar"
            className="progress-bar-fill"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* Step list — clicking toggles complete (real-time optimistic update) */}
      <div className="dash-steps-section">
        <div className="dash-steps-header">
          <span className="progress-label">Action Steps</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {stats.completed}/{stats.total}
          </span>
        </div>

        {steps.length === 0 ? (
          <div className="fallback-card" id="dashboard-no-steps">
            <p className="fallback-text">No action steps found for this goal yet.</p>
          </div>
        ) : (
          <div className="dash-step-list" id="dashboard-step-list">
            {steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                onToggle={handleToggleStep}
              />
            ))}
          </div>
        )}
      </div>

      {/* Navigate to full action plan */}
      <div className="bottom-action-bar">
        <button
          id="view-action-plan-btn"
          className="btn btn-primary"
          onClick={() => navigate('/action-plan', {
            state: {
              goalId: goal?.id,
              goalTitle: goal?.goal_title || goal?.name,
              goalTechnique: goal?.goal_technique,
              feasibility: goal?.feasibility
            }
          })}
        >
          Open Full Action Plan
        </button>
      </div>

      {/* [Lấy từ nhánh: main] - Tích hợp ReviseModal xịn xò */}
      <ReviseModal
        isOpen={reviseOpen}
        onClose={() => setReviseOpen(false)}
        payload={buildRevisePayload()}
        onSave={handleSaveRevision}
      />

    </div>
  );
}
