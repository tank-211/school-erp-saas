import React from 'react'

const RefundRequestsCard = ({ amount, change }) => {
  const isPositive = change >= 0
  return (
    <article className="summary-card refund-requests">
      <div className="card-top">
        <span className="card-icon" aria-hidden="true">🔄</span>
        <h3>Refund Requests</h3>
      </div>
      <p className="card-value">{amount}</p>
      <p className={`card-trend ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '▲' : '▼'} {Math.abs(change)}% from last week
      </p>
    </article>
  )
}

export default RefundRequestsCard
