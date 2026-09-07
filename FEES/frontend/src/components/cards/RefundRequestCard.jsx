import React from 'react'

const RefundRequestCard = ({ amount, description }) => (
  <article className="stat-card">
    <div className="stat-row">
      <div className="stat-icon">🔄</div>
      <div>
        <div className="stat-label">Refund Requests</div>
        <div className="stat-value">{amount}</div>
      </div>
    </div>
    <div className="text-sm text-muted mt-2">{description}</div>
  </article>
)

export default RefundRequestCard
