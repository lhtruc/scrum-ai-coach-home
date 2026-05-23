import { useEffect, useMemo, useState } from 'react';
import assessmentApi from '../services/assessmentApi';
import './ActionProgress.css';

export default function ActionProgress() {
  const [goalId, setGoalId] = useState(11);
  const [steps, setSteps] = useState([]);
  const [summary, setSummary] = useState({
    total_steps: 0,
    completed_steps: 0,
    progress_percentage: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [updatingStepId, setUpdatingStepId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const pendingSteps = useMemo(() => {
    return summary.total_steps - summary.completed_steps;
  }, [summary]);

  const loadActionSteps = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await assessmentApi.getGoalActionSteps(goalId);

      setSteps(data.steps || []);
      setSummary({
        total_steps: data.total_steps || 0,
        completed_steps: data.completed_steps || 0,
        progress_percentage: data.progress_percentage || 0
      });
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to load action steps. Please check the backend or goal ID.');
      setSteps([]);
      setSummary({
        total_steps: 0,
        completed_steps: 0,
        progress_percentage: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActionSteps();
  }, []);

  const handleToggleStep = async (stepId, isCompleted) => {
    setUpdatingStepId(stepId);
    setErrorMessage('');

    try {
      await assessmentApi.updateActionStepStatus(stepId, isCompleted);
      await loadActionSteps();
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to update step status. Please try again.');
    } finally {
      setUpdatingStepId(null);
    }
  };

  return (
    <div className="progress-page">
      <section className="progress-hero">
        <p className="progress-eyebrow">Action Plan Progress</p>
        <h1>Track Your Learning Progress</h1>
        <p>
          Review your saved action steps, mark progress as complete or incomplete,
          and see your overall completion percentage update dynamically.
        </p>
      </section>

      <section className="progress-panel">
        <div className="goal-search-row">
          <div>
            <label htmlFor="goalId">Goal ID</label>
            <input
              id="goalId"
              type="number"
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
            />
          </div>

          <button type="button" onClick={loadActionSteps} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load Progress'}
          </button>
        </div>

        {errorMessage && (
          <div className="progress-alert">
            {errorMessage}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Steps</span>
            <strong>{summary.total_steps}</strong>
          </div>

          <div className="stat-card success">
            <span>Completed</span>
            <strong>{summary.completed_steps}</strong>
          </div>

          <div className="stat-card warning">
            <span>Pending</span>
            <strong>{pendingSteps}</strong>
          </div>

          <div className="stat-card primary">
            <span>Progress</span>
            <strong>{summary.progress_percentage}%</strong>
          </div>
        </div>

        <div className="progress-bar-shell">
          <div
            className="progress-bar-fill"
            style={{ width: `${summary.progress_percentage}%` }}
          />
        </div>
      </section>

      <section className="steps-section">
        <div className="steps-header">
          <h2>Saved Action Steps</h2>
          <p>Completed steps are visually distinguished from pending steps.</p>
        </div>

        {isLoading ? (
          <div className="empty-state">Loading action steps...</div>
        ) : steps.length === 0 ? (
          <div className="empty-state">
            No action steps found for this goal.
          </div>
        ) : (
          <div className="steps-list">
            {steps.map((step, index) => (
              <article
                key={step.id}
                className={`step-item ${step.is_completed ? 'completed' : ''}`}
              >
                <div className="step-check">
                  <input
                    type="checkbox"
                    checked={Boolean(step.is_completed)}
                    disabled={updatingStepId === step.id}
                    onChange={(event) => handleToggleStep(step.id, event.target.checked)}
                  />
                </div>

                <div className="step-content">
                  <div className="step-topline">
                    <span>Step {index + 1}</span>
                    <span className={step.is_completed ? 'status-done' : 'status-pending'}>
                      {step.is_completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>

                  <div className="step-meta-grid">
                    <div>
                      <span>Metric</span>
                      <strong>{step.metric}</strong>
                    </div>

                    <div>
                      <span>Deadline</span>
                      <strong>{step.deadline}</strong>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}