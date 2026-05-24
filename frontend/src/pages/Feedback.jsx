import React, { useEffect, useState } from 'react';
import FeedbackCard from '../components/FeedbackCard';
import './Feedback.css';

export default function Feedback() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyReports, setHistoryReports] = useState([]);

  const token = localStorage.getItem('access_token');

  const isEmptyWeek = feedback?.is_empty_week === true;
  const canGenerate = feedback?.can_generate !== false;

  const strengths = Array.isArray(feedback?.strengths)
    ? feedback.strengths
    : feedback?.strengths
      ? [String(feedback.strengths)]
      : [];

  const areas = Array.isArray(feedback?.areas)
    ? feedback.areas
    : Array.isArray(feedback?.areas_to_improve)
      ? feedback.areas_to_improve
      : feedback?.areas
        ? [String(feedback.areas)]
        : feedback?.improvements
          ? [String(feedback.improvements)]
          : [];

  const normalizeFeedback = (raw) => {
    const data = raw?.feedback || raw;

    if (data?.is_empty_week) {
      return {
        is_empty_week: true,
        can_generate: raw?.can_generate ?? data?.can_generate ?? true,
        progress_summary: null,
        strengths: [],
        areas: []
      };
    }

    return {
      is_empty_week: false,
      can_generate: raw?.can_generate ?? data?.can_generate ?? true,
      progress_summary:
        data?.progress_summary ||
        data?.progressSummary ||
        data?.summary ||
        '',

      strengths: Array.isArray(data?.strengths)
        ? data.strengths
        : data?.strengths
          ? [String(data.strengths)]
          : [],

      areas: Array.isArray(data?.areas)
        ? data.areas
        : Array.isArray(data?.areas_to_improve)
          ? data.areas_to_improve
          : data?.areas
            ? [String(data.areas)]
            : data?.improvements
              ? [String(data.improvements)]
              : []
    };
  };

  const generateFeedback = async () => {
    setError('');
    setLoading(true);

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/feedback/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!resp.ok) {
        throw new Error('Failed to generate feedback');
      }

      const result = await resp.json();
      setFeedback(normalizeFeedback(result));
    } catch (e) {
      setError(e.message || 'Error generating feedback');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const resp = await fetch('http://127.0.0.1:8000/api/feedback/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await resp.json();

      const reports = Array.isArray(data)
        ? data
        : Array.isArray(data.history)
          ? data.history
          : Array.isArray(data.feedbacks)
            ? data.feedbacks
            : Array.isArray(data.reports)
              ? data.reports
              : [];

      setHistoryReports(reports);
    } catch (e) {
      console.error('Failed to load history', e);
      setHistoryReports([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchCurrentFeedback = async () => {
      setLoading(true);

      try {
        const resp = await fetch('http://127.0.0.1:8000/api/feedback/current', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });

        if (resp.ok) {
          const res = await resp.json();

          if (res?.is_empty_week) {
            setFeedback(normalizeFeedback(res));
            return;
          }

          setFeedback(normalizeFeedback(res));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentFeedback();
  }, []);

  return (
    <div className="feedback-shell">
      <div className="feedback-header">
        <div>
          <h2>Weekly Feedback</h2>
          <p className="muted">
            AI-generated weekly summary of your progress, strengths and areas to improve.
          </p>
        </div>

        <div className="feedback-actions">
          <button className="btn-secondary" onClick={loadHistory}>
            View History
          </button>

          {canGenerate && (
            <button
              className="btn-primary"
              onClick={generateFeedback}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Feedback'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="feedback-error">{error}</div>}

      {isEmptyWeek ? (
        <div className="empty-week-message">
          {canGenerate
            ? 'No feedback generated for today yet. Generate it once when you are ready.'
            : 'Today feedback was generated, but there were no completed actions to summarize yet.'}
        </div>
      ) : (
        <div className="feedback-grid">
          <FeedbackCard title="Progress Summary">
            {feedback?.progress_summary ? (
              <ul className="feedback-point-list">
                <li>{String(feedback.progress_summary)}</li>
              </ul>
            ) : (
              <div className="empty">No progress summary yet.</div>
            )}
          </FeedbackCard>

          <FeedbackCard title="Strengths">
            {strengths.length ? (
              <ul className="feedback-point-list">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <div className="empty">No strengths yet.</div>
            )}
          </FeedbackCard>

          <FeedbackCard title="Areas to Improve">
            {areas.length ? (
              <ul className="feedback-point-list">
                {areas.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : (
              <div className="empty">No improvement areas yet.</div>
            )}
          </FeedbackCard>
        </div>
      )}

      {historyOpen && (
        <div
          className="history-modal-overlay"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-modal-header">
              <h3>Previous Reports</h3>
              <button
                className="close"
                onClick={() => setHistoryOpen(false)}
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <div className="history-loading">Loading...</div>
            ) : historyReports.length > 0 ? (
              <div className="history-list">
                {historyReports.map((report, index) => (
                  <div className="history-item" key={report.id || index}>
                    <div className="history-item-header">
                      {report.week_of || report.created_at || `Report ${index + 1}`}
                    </div>

                    <div className="history-item-section">
                      <strong>Progress Summary</strong>
                      <div className="history-item-body">
                        {report.progress_summary || report.summary || 'No summary'}
                      </div>
                    </div>

                    <div className="history-item-section">
                      <strong>Strengths</strong>
                      <div className="history-item-body">
                        {Array.isArray(report.strengths)
                          ? report.strengths.join(', ')
                          : report.strengths || '—'}
                      </div>
                    </div>

                    <div className="history-item-section">
                      <strong>Areas to Improve</strong>
                      <div className="history-item-body">
                        {Array.isArray(report.areas)
                          ? report.areas.join(', ')
                          : report.areas || report.areas_to_improve || report.improvements || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-history">
                No previous feedback reports yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
