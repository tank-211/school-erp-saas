import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const MonthlyFeeChart = ({ data = [] }) => {
  const defaultData = [
    { month: 'Jan', monthName: 'Jan', fees: 87000 },
    { month: 'Feb', monthName: 'Feb', fees: 93000 },
    { month: 'Mar', monthName: 'Mar', fees: 102000 },
    { month: 'Apr', monthName: 'Apr', fees: 98000 },
    { month: 'May', monthName: 'May', fees: 113000 },
    { month: 'Jun', monthName: 'Jun', fees: 107000 },
    { month: 'Jul', monthName: 'Jul', fees: 118000 },
    { month: 'Aug', monthName: 'Aug', fees: 121000 },
    { month: 'Sep', monthName: 'Sep', fees: 109000 },
    { month: 'Oct', monthName: 'Oct', fees: 124000 },
    { month: 'Nov', monthName: 'Nov', fees: 117000 },
    { month: 'Dec', monthName: 'Dec', fees: 130000 },
  ]

  // Transform data to ensure all 12 months are present
  const chartData = data.length > 0 
    ? data.map((item) => ({
        month: item.month || item.monthName,
        monthName: item.monthName || item.month,
        fees: item.amount || item.collected || item.fees || 0,
      }))
    : defaultData

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Monthly Fee Collection</h3>
      </div>
      <div className="card-body">
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
      </div>
    </div>
  )
}

export default MonthlyFeeChart

