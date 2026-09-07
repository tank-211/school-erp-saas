import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div style={{
        background: 'white',
        padding: '12px 16px',
        border: '2px solid #22c55e',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#0f172a' }}>
          {data.name}
        </p>
        <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#475569' }}>
          Amount: ₹{(data.value || 0).toLocaleString()}
        </p>
        {data.count > 0 && (
          <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
            Transactions: {data.count}
          </p>
        )}
      </div>
    )
  }
  return null
}

const PaymentMethodChart = ({ data = [] }) => {
  const defaultData = [
    { name: 'Online', value: 7200 },
    { name: 'Cheque', value: 2800 },
    { name: 'Cash', value: 1950 },
  ]

  const colors = ['#22c55e', '#108fb9', '#0ea5e9', '#f59e0b', '#f97316']

  // Transform backend data to chart format
  const chartData = data.length > 0 
    ? data.map((item) => ({
        name: item.method 
          ? item.method.replace(/_/g, ' ').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : item.name,
        value: item.totalAmount || item.value || 0,
        count: item.count || 0
      }))
    : defaultData

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Payment Method Distribution</h3>
      </div>
      <div className="card-body">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default PaymentMethodChart
