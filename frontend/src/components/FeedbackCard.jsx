import React from 'react';
import './FeedbackCard.css';

export default function FeedbackCard({ title, children }) {
  return (
    <div className="feedback-card">
      <h3 className="feedback-card-title">{title}</h3>
      <div className="feedback-card-body">{children}</div>
    </div>
  );
}
