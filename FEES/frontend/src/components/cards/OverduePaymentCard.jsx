import React from 'react'

const OverduePaymentCard = ({ amount, description }) => (
  <article className="stat-card">
    <div className="stat-row">
      <div className="stat-icon">⚠️</div>
      <div>
        <div className="stat-label">Overdue Payments</div>
        <div className="stat-value">{amount}</div>
      </div>
    </div>
    <div className="text-sm text-muted mt-2">{description}</div>
  </article>
)

export default OverduePaymentCard
