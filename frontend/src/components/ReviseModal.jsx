import { useEffect, useState } from 'react';
import actionPlanApi from '../services/actionPlanApi';
import './ReviseModal.css';

export default function ReviseModal({ isOpen, onClose, payload, onSave }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setOptions([]);

    (async () => {
      try {
        // Call revise API with provided payload; backend should respect instruction to keep completed steps
        const res = await actionPlanApi.revisePlan(payload);
        if (!mounted) return;
        // Expecting `res.options` (preferred) where each option has:
        // { version, strategy, description, deadline_change, steps }
        // Normalize into a consistent shape for the UI.
        const rawOpts = res.options || res.revision_options || [];

        if (Array.isArray(rawOpts) && rawOpts.length > 0) {
          const normalized = rawOpts.map(o => ({
            version: o.version || o.title || 'Option',
            strategy: o.strategy || o.strategy_description || '',
            description: o.description || o.explanation || '',
            deadline_change: o.deadline_change || o.deadlineChange || '',
            steps: Array.isArray(o.steps) ? o.steps : (Array.isArray(o.revised_steps) ? o.revised_steps : []),
            completed_steps: Array.isArray(o.completed_steps) ? o.completed_steps : []
          }));
          setOptions(normalized);
        } else if (res.revised_steps && res.revised_steps.length > 0) {
          // Backend returned only revised_steps — create a single normalized option
          const defaultOption = {
            version: 'Version 1',
            strategy: 'AI revised plan',
            description: 'AI returned revised steps (server only provided revised_steps).',
            deadline_change: '',
            steps: res.revised_steps,
            completed_steps: payload?.progress?.completed_steps || []
          };
          setOptions([defaultOption]);
        } else {
          setOptions([]);
        }
        setSelectedIndex(0);
      } catch (err) {
        console.error('Revise API failed', err);
        setError('Failed to get revision options. Try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [isOpen, payload]);

  const handleSave = async () => {
    const option = options[selectedIndex];
    if (!option) return;
    setApplying(true);
    setError(null);
    try {
      // Await parent save handler (which should perform bulk update and refresh)
      await onSave(option);
      // Close modal after successful apply
      onClose();
    } catch (err) {
      console.error('Apply revision failed', err);
      setError('Failed to apply revision. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="revise-modal-overlay" role="dialog" aria-modal="true">
      <div className="revise-modal">
        <div className="revise-header">
          <h3>Revise Action Plan</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="revise-loading">Generating revision options…</div>
        ) : error ? (
          <div className="revise-error">{error}</div>
        ) : (
          <div className="revise-body">
            <p className="revise-instruction">Choose one of the AI-generated revisions, or keep the current plan.</p>

            <div className="revise-options">
              {options.length === 0 && (
                <div className="no-options">No revision options returned.</div>
              )}

              {options.map((opt, i) => (
                <label key={i} className={`revise-option ${selectedIndex === i ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="reviseOption"
                    checked={selectedIndex === i}
                    onChange={() => setSelectedIndex(i)}
                  />
                  <div className="opt-content">
                    <div className="opt-title">{opt.version || `Option ${i + 1}`}</div>
                    {opt.strategy && <div className="opt-explain"><strong>{opt.strategy}</strong> — {opt.description}</div>}

                    {/* Show a compact view of steps: keep completed, and list pending/new with any deadline changes */}
                    <div className={`revision-option-body ${(opt.completed_steps || []).length === 0 ? 'no-completed' : ''}`}>
                      <div className="revision-column completed-column">
                        <div className="group-title">Completed (kept)</div>
                        <ul>
                          {(opt.completed_steps || []).map(s => (
                            <li key={s.id || s}>{s.title || s.name || `#${s.id || s}`}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="revision-column pending-column">
                        <div className="group-title">Pending / Revised</div>
                        <ul className="revision-steps-list">
                          {(opt.steps || []).filter(st => !st.is_completed).map(s => (
                            <li key={s.id || s}>
                              <span className="step-title">{s.title || s.name || `#${s.id || s}`}</span>
                              {(s.deadline || s.deadline_new || s.deadline_old) && (
                                <span className="deadline-change">{s.deadline_old || ''}{s.deadline_old ? ' → ' : ''}{s.deadline || s.deadline_new || ''}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="revise-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={applying}>Keep The Plan</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || options.length === 0 || applying}>
            {applying ? 'Applying...' : 'Apply Selected Revision'}
          </button>
        </div>
      </div>
    </div>
  );
}
