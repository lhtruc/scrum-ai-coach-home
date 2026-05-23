import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import assessmentApi from '../services/assessmentApi';
import './SkillAssessment.css'; 

export default function GoalSelection({ userId, userName, skillName, ratingLevel, onResetFlow }) {
  const navigate = useNavigate();
  const [view, setView] = useState('LOADING'); // LOADING, SELECTION, PROCESSING, CONFIRM, SAVING, COMPLETE
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState(null); // Lưu trữ mục tiêu được chọn để xác nhận
  const [savedGoalId, setSavedGoalId] = useState(null); // ID trả về sau khi lưu vào Supabase
  
  const [selectionType, setSelectionType] = useState(null); // 'SUGGESTED' hoặc 'CUSTOM'
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(null);
  const [customGoalText, setCustomGoalText] = useState("");
  const [warningMsg, setWarningMsg] = useState(null);

  // Khởi tạo lấy gợi ý mục tiêu từ AI
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const payload = {
          user_id: userId,
          name: userName,
          skills: [{ skills_name: skillName, rating_level: ratingLevel }]
        };
        const response = await assessmentApi.suggestGoals(payload);
        setSuggestedGoals(response.goals);
        setView('SELECTION');
      } catch (err) {
        console.error("AI Error", err);
        setWarningMsg("Failed to load AI suggestions.");
        setView('SELECTION');
      }
    };
    fetchSuggestions();
  }, [skillName, ratingLevel, userId, userName]);

  // Helper render màu sắc cho mức độ khả thi (Feasibility Badge)
  const renderFeasibilityBadge = (feasibility) => {
    let bg = '#f1f5f9';
    let color = '#475569';
    if (feasibility === 'HIGH') { bg = '#dcfce7'; color = '#166534'; }
    if (feasibility === 'MEDIUM') { bg = '#fef3c7'; color = '#92400e'; }
    if (feasibility === 'LOW') { bg = '#fee2e2'; color = '#991b1b'; }

    return (
      <span style={{
        padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem',
        fontWeight: 'bold', backgroundColor: bg, color: color, marginLeft: '8px'
      }}>
        {feasibility}
      </span>
    );
  };

  const handleSelectSuggested = (index) => {
    setSelectionType('SUGGESTED');
    setSelectedGoalIndex(index);
    setCustomGoalText(""); 
    setWarningMsg(null);
  };

  const handleCustomInput = (e) => {
    setSelectionType('CUSTOM');
    setSelectedGoalIndex(null); 
    setCustomGoalText(e.target.value);
    setWarningMsg(null);
  };

  // Bước xử lý khi ấn nút "Continue to Confirm" tại màn hình chọn
  const handleGoToConfirm = async () => {
    if (selectionType === 'SUGGESTED' && selectedGoalIndex !== null) {
      setActiveGoal(suggestedGoals[selectedGoalIndex]);
      setView('CONFIRM');
      return;
    }

    if (selectionType === 'CUSTOM' && customGoalText.trim() !== "") {
      setView('PROCESSING');
      try {
        const payload = {
          user_id: userId,
          name: userName,
          custom_goal: customGoalText,
          goal_technique: skillName,
          skills: [{ skills_name: skillName, rating_level: ratingLevel }]
        };
        
        const response = await assessmentApi.refineCustomGoal(payload);
        
        if (response.status === "REJECTED") {
          setWarningMsg(response.notification.message);
          setView('SELECTION');
        } else {
          setActiveGoal(response.goal);
          setView('CONFIRM');
        }
      } catch (error) {
        setWarningMsg("Network error verifying custom goal.");
        setView('SELECTION');
      }
    }
  };

  // Bước cuối cùng: Gọi API lưu chính thức vào database Supabase
  const handleSaveToSupabase = async () => {
    if (!activeGoal) return;
    setView('SAVING');

    const payload = {
      user_id: userId,
      name: userName,
      goal_title: activeGoal.goal_title,
      goal_technique: activeGoal.goal_technique || skillName,
      feasibility: activeGoal.feasibility,
      // Đóng gói các metadata khác vào trường json validation_response
      validation_response: {
        goal_description: activeGoal.goal_description,
        target_skill_level: activeGoal.target_skill_level,
        duration_weeks: activeGoal.duration_weeks,
        weekly_commitment_hours: activeGoal.weekly_commitment_hours,
        reason: activeGoal.reason
      }
    };

    try {
      const result = await assessmentApi.confirmGoal(payload);
      // Capture the returned goal ID if the backend sends it back
      if (result && result.saved_goal && result.saved_goal.id) {
        setSavedGoalId(result.saved_goal.id);
      }
      setView('COMPLETE');
    } catch (error) {
      alert("Failed to save goal to database!");
      setView('CONFIRM');
    }
  };

  // ================= STATE: LOADING / PROCESSING / SAVING =================
  if (view === 'LOADING' || view === 'PROCESSING' || view === 'SAVING') {
    return (
      <div className="mobile-container">
        <div className="glass-card text-center pulse-anim">
          <div className="loader-ring"></div>
          <h3 className="title" style={{marginTop: '20px'}}>
            {view === 'LOADING' && "AI is generating goals..."}
            {view === 'PROCESSING' && "AI is validating your custom goal..."}
            {view === 'SAVING' && "Saving your roadmap to Database..."}
          </h3>
        </div>
      </div>
    );
  }

  // ================= MÀN HÌNH 2: XÁC NHẬN GOAL CHI TIẾT (CONFIRM SCREEN) =================
  if (view === 'CONFIRM') {
    return (
      <div className="mobile-container slide-left">
        <div className="header-text">
          <h1 className="title">Confirm Roadmap</h1>
          <p className="subtitle">Review the timeline formulated by AI Coach.</p>
        </div>

        <div className="glass-card" style={{ marginBottom: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 'bold' }}>
              {activeGoal.goal_technique}
            </span>
            {renderFeasibilityBadge(activeGoal.feasibility)}
          </div>
          
          <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>{activeGoal.goal_title}</h3>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 15px 0' }}>
            {activeGoal.goal_description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Duration</span>
              <div style={{ fontWeight: 'bold', color: '#334155' }}>{activeGoal.duration_weeks} Weeks</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Commitment</span>
              <div style={{ fontWeight: 'bold', color: '#334155' }}>{activeGoal.weekly_commitment_hours} hrs/wk</div>
            </div>
          </div>

          <h4 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '0.9rem' }}>Coach Analysis:</h4>
          <p style={{ color: '#64748b', fontSize: '0.85rem', italic: 'true', margin: 0 }}>
            "{activeGoal.reason}"
          </p>
        </div>

        <div className="bottom-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleSaveToSupabase}>Activate & Save Roadmap</button>
          <button className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={() => setView('SELECTION')}>Back to List</button>
        </div>
      </div>
    );
  }

  // ================= MÀN HÌNH 3: HOÀN THÀNH KÝ SỰ (COMPLETE SCREEN) =================
  if (view === 'COMPLETE') {
    return (
      <div className="mobile-container text-center fade-in">
        <div className="glass-card" style={{ padding: '40px 20px', marginTop: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚀</div>
          <h2 className="title" style={{ color: '#166534' }}>Roadmap Activated!</h2>
          <p className="subtitle" style={{ marginBottom: '30px' }}>
            Your learning sprint for <strong>{activeGoal.goal_title}</strong> has been successfully registered in Supabase.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedGoalId && (
              <button
                id="view-action-plan-btn"
                className="btn btn-primary"
                onClick={() => navigate('/action-plan', {
                  state: {
                    goalId: savedGoalId,
                    goalTitle: activeGoal.goal_title,
                    goalTechnique: activeGoal.goal_technique || skillName,
                    feasibility: activeGoal.feasibility
                  }
                })}
              >
                📋 View SMART Action Plan
              </button>
            )}
            <button className="btn" style={{ background: '#f1f5f9', color: '#475569' }} onClick={onResetFlow}>
              Explore More Skills
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= MÀN HÌNH 1: DANH SÁCH CHỌN GOAL (SELECTION SCREEN) =================
  return (
    <div className="mobile-container slide-up">
      <div className="header-text">
        <h1 className="title">Select Your Goal</h1>
        <p className="subtitle">Choose a recommended path or define your own.</p>
      </div>

      {warningMsg && (
        <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2', marginBottom: '15px' }}>
          <p style={{ color: '#991b1b', margin: 0, fontWeight: 500 }}>⚠️ {warningMsg}</p>
        </div>
      )}

      <div className="goal-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '100px' }}>
        
        {suggestedGoals.map((goal, idx) => {
          const isSelected = selectionType === 'SUGGESTED' && selectedGoalIndex === idx;
          const isDisabled = selectionType === 'CUSTOM' && customGoalText.trim().length > 0;
          
          return (
            <div 
              key={idx} 
              className={`glass-card ${isSelected ? 'selected' : ''}`}
              style={{ 
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                border: isSelected ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.2)'
              }}
              onClick={() => !isDisabled && handleSelectSuggested(idx)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: '0 0 8px 0', color: isSelected ? 'var(--primary)' : '#1e293b', flex: 1 }}>
                  {goal.goal_title}
                </h4>
                {renderFeasibilityBadge(goal.feasibility)}
              </div>
              <p style={{ margin: '0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                {goal.goal_description}
              </p>
              <div style={{ marginTop: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>
                ⏱ {goal.duration_weeks} Weeks | 📚 {goal.weekly_commitment_hours} hrs/week
              </div>
            </div>
          );
        })}

        <div 
          className="glass-card" 
          style={{ border: selectionType === 'CUSTOM' ? '2px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Or write your own custom goal</h4>
          <textarea 
            className="form-control"
            style={{ 
              width: '100%', minHeight: '80px', padding: '10px',
              borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit'
            }}
            placeholder="E.g., I want to master basic SQL queries in 1 week..."
            value={customGoalText}
            onChange={handleCustomInput}
            onClick={() => setSelectionType('CUSTOM')}
          />
        </div>
      </div>

      <div className="bottom-action-bar">
        <button 
          className="btn btn-primary" 
          onClick={handleGoToConfirm} 
          disabled={!selectionType || (selectionType === 'CUSTOM' && customGoalText.trim() === '')}
        >
          Continue to Confirm
        </button>
      </div>
    </div>
  );
}