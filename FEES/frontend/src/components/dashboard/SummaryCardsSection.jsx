import React from 'react'
import FeeCollectedCard from './FeeCollectedCard'
import PendingPaymentCard from './PendingPaymentCard'
import OverduePaymentCard from './OverduePaymentCard'
import RefundRequestsCard from './RefundRequestsCard'

const SummaryCardsSection = ({ summary }) => (
  <section className="summary-cards">
    <FeeCollectedCard amount={summary.feeCollected.amount} change={summary.feeCollected.change} />
    <PendingPaymentCard amount={summary.pendingPayment.amount} change={summary.pendingPayment.change} />
    <OverduePaymentCard amount={summary.overduePayment.amount} change={summary.overduePayment.change} />
    <RefundRequestsCard amount={summary.refundRequests.amount} change={summary.refundRequests.change} />
  </section>
)

export default SummaryCardsSection
