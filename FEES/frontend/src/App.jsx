import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import BulkUpload from './pages/BulkUpload'
import ExportReport from './pages/ExportReport'
import Fees from './pages/Fees'
import Invoice from './pages/Invoice'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import Receipt from './pages/Receipt'
import RefundManagement from './pages/RefundManagement'
import RefundRequest from './pages/RefundRequest'
import RefundDetails from './pages/RefundDetails'
import RefundRequestSuccess from './pages/RefundRequestSuccess'
import StudentFeeManagement from './pages/StudentFeeManagement'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={(
          <ProtectedRoute>
            <MainLayout><Dashboard /></MainLayout>
          </ProtectedRoute>
        )} />
        <Route path="/bulk-upload" element={<ProtectedRoute><MainLayout><BulkUpload /></MainLayout></ProtectedRoute>} />
        <Route path="/export-report" element={<ProtectedRoute><MainLayout><ExportReport /></MainLayout></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute><MainLayout><Fees /></MainLayout></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute><MainLayout><StudentFeeManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/StudentFeeManagement" element={<ProtectedRoute><MainLayout><StudentFeeManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/invoice/:invoiceId" element={<ProtectedRoute><MainLayout><Invoice /></MainLayout></ProtectedRoute>} />
        <Route path="/payment/:invoiceId" element={<ProtectedRoute><MainLayout><Payment /></MainLayout></ProtectedRoute>} />
        <Route path="/payment-success" element={<ProtectedRoute><MainLayout><PaymentSuccess /></MainLayout></ProtectedRoute>} />
        <Route path="/receipt/:invoiceId" element={<ProtectedRoute><MainLayout><Receipt /></MainLayout></ProtectedRoute>} />
        <Route path="/refund/success" element={<ProtectedRoute><MainLayout><RefundRequestSuccess /></MainLayout></ProtectedRoute>} />
        <Route path="/refund-management" element={<ProtectedRoute><MainLayout><RefundManagement /></MainLayout></ProtectedRoute>} />
        <Route path="/refund-request" element={<ProtectedRoute><MainLayout><RefundRequest /></MainLayout></ProtectedRoute>} />
        <Route path="/refund-details/:id" element={<ProtectedRoute><MainLayout><RefundDetails /></MainLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App