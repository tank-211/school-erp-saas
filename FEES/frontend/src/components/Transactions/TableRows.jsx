import React from 'react'
import TransactionRow from './TransactionRow'

const TableRows = ({ rows }) => (
  <tbody>
    {rows.map((tx) => (
      <TransactionRow key={tx.id} {...tx} />
    ))}
  </tbody>
)

export default TableRows
