import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const MonthlyFeeChart = ({ data = [] }) => {
  // Transform data to ensure all 12 months are present
  const chartData = data.length > 0 
    ? data.map((item) => ({
        month: item.month || item.monthName,
        monthName: item.monthName || item.month,
        fees: item.amount || item.collected || item.fees || 0,
      }))
    : []

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Monthly Fee Collection</h3>
      </div>
      <div className="card-body">
        {chartData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            No payments recorded yet.
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="fees" name="Collected" fill='#22a97a' radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default MonthlyFeeChart

