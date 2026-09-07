import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 5000

// Middleware
app.use(cors())
app.use(express.json())

// ==================== SAMPLE DATABASE ====================

// Invoices Database
const invoices = [
  {
    id: 'INV-2024-001',
    studentName: 'Aarav Sharma',
    class: 'Class 10-A',
    admissionId: 'ADM-2024-1234',
    academicYear: '2024-2025',
    invoiceDate: '2024-03-01',
    dueDate: '2024-03-15',
    status: 'Pending',
    totalAmount: 25000,
    paidAmount: 0,
    feeBreakdown: [
      { description: 'Admission Fee', amount: 5000 },
      { description: 'Tuition Fee', amount: 15000 },
      { description: 'Transport Fee', amount: 3000 },
      { description: 'Library Fee', amount: 2000 },
    ],
  },
  {
    id: 'INV-2024-002',
    studentName: 'Ananya Patel',
    class: 'Class 9-B',
    admissionId: 'ADM-2024-1235',
    academicYear: '2024-2025',
    invoiceDate: '2024-03-01',
    dueDate: '2024-03-15',
    status: 'Pending',
    totalAmount: 30000,
    paidAmount: 0,
    feeBreakdown: [
      { description: 'Admission Fee', amount: 5000 },
      { description: 'Tuition Fee', amount: 18000 },
      { description: 'Transport Fee', amount: 4000 },
      { description: 'Library Fee', amount: 3000 },
    ],
  },
  {
    id: 'INV-2024-003',
    studentName: 'Rohan Gupta',
    class: 'Class 8-C',
    admissionId: 'ADM-2024-1236',
    academicYear: '2024-2025',
    invoiceDate: '2024-03-02',
    dueDate: '2024-03-16',
    status: 'Paid',
    totalAmount: 28500,
    paidAmount: 28500,
    feeBreakdown: [
      { description: 'Admission Fee', amount: 4500 },
      { description: 'Tuition Fee', amount: 16000 },
      { description: 'Transport Fee', amount: 4000 },
      { description: 'Library Fee', amount: 4000 },
    ],
  },
]

// Transactions Database
const transactions = [
  {
    id: 1,
    invoiceId: 'INV-2024-003',
    studentName: 'Rohan Gupta',
    class: 'Class 8-C',
    amount: 28500,
    status: 'Paid',
    paymentMethod: 'Razorpay',
    transactionId: 'TXN-1234567890',
    date: '2024-03-09',
  },
  {
    id: 2,
    invoiceId: 'INV-2024-004',
    studentName: 'Priya Singh',
    class: 'Class 11-A',
    amount: 32000,
    status: 'Pending',
    paymentMethod: 'UPI',
    transactionId: 'TXN-1234567891',
    date: '2024-03-08',
  },
  {
    id: 3,
    invoiceId: 'INV-2024-005',
    studentName: 'Kabir Reddy',
    class: 'Class 7-B',
    amount: 27000,
    status: 'Paid',
    paymentMethod: 'Stripe',
    transactionId: 'TXN-1234567892',
    date: '2024-03-08',
  },
  {
    id: 4,
    invoiceId: 'INV-2024-006',
    studentName: 'Diya Mehta',
    class: 'Class 10-B',
    amount: 26500,
    status: 'Processing',
    paymentMethod: 'UPI',
    transactionId: 'TXN-1234567893',
    date: '2024-03-07',
  },
  {
    id: 5,
    invoiceId: 'INV-2024-007',
    studentName: 'Arjun Verma',
    class: 'Class 9-A',
    amount: 29000,
    status: 'Paid',
    paymentMethod: 'Razorpay',
    transactionId: 'TXN-1234567894',
    date: '2024-03-07',
  },
  {
    id: 6,
    invoiceId: 'INV-2024-008',
    studentName: 'Ishita Joshi',
    class: 'Class 12-A',
    amount: 35000,
    status: 'Overdue',
    paymentMethod: 'UPI',
    transactionId: 'TXN-1234567895',
    date: '2024-03-06',
  },
]

// ==================== API ENDPOINTS ====================

// GET: Dashboard Summary Data (Legacy endpoint)
app.get('/api/dashboard', (req, res) => {
  const totalCollected = transactions
    .filter((t) => t.status === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalPending = transactions
    .filter((t) => t.status === 'Pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOverdue = transactions
    .filter((t) => t.status === 'Overdue')
    .reduce((sum, t) => sum + t.amount, 0)

  const dashboardData = {
    totalCollected,
    totalPending,
    totalOverdue,
    totalRefund: 22800,
    recentTransactions: transactions.slice(0, 5),
    monthlyData: [
      { month: 'Jan', collected: 250000, pending: 45000 },
      { month: 'Feb', collected: 320000, pending: 38000 },
      { month: 'Mar', collected: 285000, pending: 52000 },
      { month: 'Apr', collected: 410000, pending: 25000 },
      { month: 'May', collected: 380000, pending: 35000 },
      { month: 'Jun', collected: 450000, pending: 15000 },
    ],
    paymentMethodData: [
      { name: 'Razorpay', value: 450000 },
      { name: 'UPI', value: 320000 },
      { name: 'Stripe', value: 280000 },
      { name: 'Others', value: 150000 },
    ],
  }

  res.json(dashboardData)
})

// GET: Dashboard Stats (Frontend expected endpoint)
app.get('/api/fee-payments/dashboard/stats', (req, res) => {
  const totalCollected = transactions
    .filter((t) => t.status === 'Paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalPending = transactions
    .filter((t) => t.status === 'Pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOverdue = transactions
    .filter((t) => t.status === 'Overdue')
    .reduce((sum, t) => sum + t.amount, 0)

  const stats = {
    totalCollected,
    totalPending,
    totalOverdue,
    totalRefund: 22800,
    statsByStatus: [
      { _id: 'paid', totalCollected: totalCollected, totalAmount: totalCollected },
      { _id: 'pending', totalCollected: 0, totalAmount: totalPending },
      { _id: 'overdue', totalCollected: 0, totalAmount: totalOverdue },
    ],
  }

  res.json({ data: stats })
})

// GET: Monthly Collection Data
app.get('/api/fee-payments/dashboard/monthly', (req, res) => {
  const monthlyData = [
    { _id: 1, total: 250000, pending: 45000, month: 'Jan' },
    { _id: 2, total: 320000, pending: 38000, month: 'Feb' },
    { _id: 3, total: 285000, pending: 52000, month: 'Mar' },
    { _id: 4, total: 410000, pending: 25000, month: 'Apr' },
    { _id: 5, total: 380000, pending: 35000, month: 'May' },
    { _id: 6, total: 450000, pending: 15000, month: 'Jun' },
    { _id: 7, total: 420000, pending: 28000, month: 'Jul' },
    { _id: 8, total: 390000, pending: 32000, month: 'Aug' },
    { _id: 9, total: 440000, pending: 22000, month: 'Sep' },
    { _id: 10, total: 460000, pending: 18000, month: 'Oct' },
    { _id: 11, total: 470000, pending: 16000, month: 'Nov' },
    { _id: 12, total: 500000, pending: 10000, month: 'Dec' },
  ]

  res.json({ data: monthlyData })
})

// GET: Pending Fees (with pagination)
app.get('/api/fee-payments/pending', (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 100

  const pendingFees = invoices
    .filter((inv) => inv.status === 'Pending')
    .map((inv) => ({
      id: inv.id,
      invoiceId: inv.id,
      studentName: inv.studentName,
      class: inv.class,
      amount: inv.totalAmount,
      dueDate: inv.dueDate,
      status: inv.status,
    }))

  // Pagination logic
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedData = pendingFees.slice(startIndex, endIndex)

  res.json({
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: pendingFees.length,
      totalPages: Math.ceil(pendingFees.length / limit),
    },
  })
})

// GET: All Transactions (with correct response format)
app.get('/api/transactions', (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const sort = req.query.sort || '-date'
  
  let sorted = [...transactions]
  if (sort === '-date') {
    sorted.sort((a, b) => new Date(b.date) - new Date(a.date))
  }
  
  const limited = sorted.slice(0, limit)
  
  res.json({
    data: limited,
    total: transactions.length,
  })
})

// GET: Payment Methods Distribution
app.get('/api/fee-payments/payment-methods', (req, res) => {
  const paymentMethodMap = {}
  
  transactions.forEach((t) => {
    if (!paymentMethodMap[t.paymentMethod]) {
      paymentMethodMap[t.paymentMethod] = 0
    }
    paymentMethodMap[t.paymentMethod] += t.amount
  })
  
  const paymentMethodData = Object.entries(paymentMethodMap).map(([method, amount]) => ({
    name: method,
    value: amount,
  }))
  
  res.json({ data: paymentMethodData })
})

// GET: Single Invoice Details
app.get('/api/invoice/:id', (req, res) => {
  const invoice = invoices.find((inv) => inv.id === req.params.id)

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' })
  }

  res.json(invoice)
})

// POST: Process Payment
app.post('/api/payment', (req, res) => {
  const { invoiceId, amount, method } = req.body

  // Validation
  if (!invoiceId || !amount || !method) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Find invoice
  const invoice = invoices.find((inv) => inv.id === invoiceId)
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' })
  }

  // Generate transaction ID (simulate)
  const transactionId = `TXN-${Date.now()}`

  // Update invoice status (simulate)
  invoice.status = 'Paid'
  invoice.paidAmount = amount

  // Generate payment response
  const paymentResponse = {
    success: true,
    invoiceId,
    amount,
    method,
    transactionId,
    timestamp: new Date().toISOString(),
    message: 'Payment processed successfully',
  }

  res.json(paymentResponse)
})

// GET: Pending Fees
app.get('/api/pending-fees', (req, res) => {
  const pendingFees = invoices
    .filter((inv) => inv.status === 'Pending')
    .map((inv) => ({
      id: inv.id,
      invoiceId: inv.id,
      studentName: inv.studentName,
      class: inv.class,
      amount: inv.totalAmount,
      dueDate: inv.dueDate,
    }))

  res.json(pendingFees)
})

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() })
})

// ==================== ERROR HANDLING ====================

app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`📌 API Base URL: http://localhost:${PORT}/api`)
})
