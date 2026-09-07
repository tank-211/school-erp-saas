/**
 * Mock Data Service for Development Without Database
 * Provides sample data when database is unavailable
 */

export const mockStudents = [
  {
    id: '1',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    class: 'Class 10',
    rollNumber: '001',
    parentName: 'Raj Sharma',
    parentPhone: '9876543210',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-06-19'),
  },
  {
    id: '2',
    name: 'Priya Patel',
    email: 'priya@example.com',
    class: 'Class 10',
    rollNumber: '002',
    parentName: 'Meera Patel',
    parentPhone: '9876543211',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-06-19'),
  },
  {
    id: '3',
    name: 'Rohan Kumar',
    email: 'rohan@example.com',
    class: 'Class 11',
    rollNumber: '101',
    parentName: 'Vikram Kumar',
    parentPhone: '9876543212',
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-06-19'),
  },
];

export const mockFeePayments = [
  {
    id: '1',
    studentId: '1',
    invoiceId: 'INV-001',
    totalAmount: 50000,
    amountPaid: 50000,
    paymentStatus: 'PAID',
    paymentMethod: 'BANK_TRANSFER',
    dueDate: new Date('2026-05-31'),
    paidDate: new Date('2026-05-25'),
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-05-25'),
  },
  {
    id: '2',
    studentId: '1',
    invoiceId: 'INV-002',
    totalAmount: 50000,
    amountPaid: 25000,
    paymentStatus: 'PARTIAL',
    paymentMethod: 'ONLINE',
    dueDate: new Date('2026-06-30'),
    paidDate: new Date('2026-06-10'),
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-10'),
  },
  {
    id: '3',
    studentId: '2',
    invoiceId: 'INV-003',
    totalAmount: 50000,
    amountPaid: 0,
    paymentStatus: 'PENDING',
    paymentMethod: null,
    dueDate: new Date('2026-06-30'),
    paidDate: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-19'),
  },
  {
    id: '4',
    studentId: '3',
    invoiceId: 'INV-004',
    totalAmount: 60000,
    amountPaid: 0,
    paymentStatus: 'OVERDUE',
    paymentMethod: null,
    dueDate: new Date('2026-05-31'),
    paidDate: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-06-19'),
  },
];

export const mockTransactions = [
  {
    id: 'TXN001',
    feePaymentId: '1',
    studentId: '1',
    amount: 50000,
    method: 'BANK_TRANSFER',
    status: 'SUCCESS',
    transactionDate: new Date('2026-05-25'),
    referenceNumber: 'REF-001',
  },
  {
    id: 'TXN002',
    feePaymentId: '2',
    studentId: '1',
    amount: 25000,
    method: 'ONLINE',
    status: 'SUCCESS',
    transactionDate: new Date('2026-06-10'),
    referenceNumber: 'REF-002',
  },
  {
    id: 'TXN003',
    feePaymentId: '4',
    studentId: '3',
    amount: 0,
    method: null,
    status: 'PENDING',
    transactionDate: null,
    referenceNumber: null,
  },
];

export const mockRefundRequests = [
  {
    id: 'REF001',
    feePaymentId: '1',
    studentId: '1',
    amount: 5000,
    reason: 'Partial refund requested',
    status: 'APPROVED',
    approvedBy: 'admin@feesystem.com',
    approvedAt: new Date('2026-06-15'),
    createdAt: new Date('2026-06-14'),
    updatedAt: new Date('2026-06-15'),
  },
  {
    id: 'REF002',
    feePaymentId: '3',
    studentId: '2',
    amount: 10000,
    reason: 'Scholarship adjustment',
    status: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-06-16'),
    updatedAt: new Date('2026-06-16'),
  },
];

export const mockUsers = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@feesystem.com',
    password: '$2a$10$1Q6M8.5u8KxY3wJ7uU9LLekGkc.6LdR5nO2vL8qW5xY6zU7vM8nE2', // Admin@2024 (hashed)
    role: 'ADMIN',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '2',
    name: 'Staff User',
    email: 'staff@feesystem.com',
    password: '$2a$10$1Q6M8.5u8KxY3wJ7uU9LLekGkc.6LdR5nO2vL8qW5xY6zU7vM8nE2', // Staff@2024 (hashed)
    role: 'STAFF',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

export const getDashboardStats = () => ({
  totalStudents: mockStudents.length,
  totalFeesPending: mockFeePayments
    .filter(fp => fp.paymentStatus === 'PENDING' || fp.paymentStatus === 'PARTIAL')
    .reduce((sum, fp) => sum + (fp.totalAmount - fp.amountPaid), 0),
  totalCollected: mockFeePayments
    .filter(fp => fp.paymentStatus === 'PAID' || fp.paymentStatus === 'PARTIAL')
    .reduce((sum, fp) => sum + fp.amountPaid, 0),
  totalOverdue: mockFeePayments
    .filter(fp => fp.paymentStatus === 'OVERDUE')
    .reduce((sum, fp) => sum + fp.totalAmount, 0),
  pendingRefunds: mockRefundRequests.filter(r => r.status === 'PENDING').length,
});

export const getMonthlyCollectionData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => ({
    month,
    collected: Math.floor(Math.random() * 500000) + 100000,
    pending: Math.floor(Math.random() * 300000) + 50000,
  }));
};

export const getPaymentMethodDistribution = () => [
  { name: 'Bank Transfer', value: 45, color: '#3b82f6' },
  { name: 'Online', value: 35, color: '#8b5cf6' },
  { name: 'Cash', value: 15, color: '#10b981' },
  { name: 'Cheque', value: 5, color: '#f59e0b' },
];

export default {
  mockStudents,
  mockFeePayments,
  mockTransactions,
  mockRefundRequests,
  mockUsers,
  getDashboardStats,
  getMonthlyCollectionData,
  getPaymentMethodDistribution,
};
