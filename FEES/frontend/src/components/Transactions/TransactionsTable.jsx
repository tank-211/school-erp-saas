import React from 'react'
import TableRows from './TableRows'

const TransactionsTable = ({ rows }) => (
  <section className="transactions-section">
    <h3>Recent Transactions</h3>
    <div className="transactions-table-wrap">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Invoice ID</th>
            <th>Payment Method</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
            <th>Send Message</th>
          </tr>
        </thead>
        <TableRows rows={rows} />
      </table>
    </div>
  </section>
)

export default TransactionsTable
