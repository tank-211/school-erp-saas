// Dummy Refund Request Data
export const initialRefundData = [
 
  {
    id: "REF-2024-002",
    studentName: "Priya Kapoor",
    invoiceId: "INV-2024-018",
    amount: 15000,
    reason: "Student Withdrawal",
    status: "Approved",
    requestedDate: "2024-03-07",
    adminNotes: "Verified and approved"
  },
  {
    id: "REF-2024-003",
    studentName: "Rahul Verma",
    invoiceId: "INV-2024-020",
    amount: 8000,
    reason: "Overpayment",
    status: "Processed",
    requestedDate: "2024-03-06",
    adminNotes: "Refund processed on 2024-03-15"
  },
  {
    id: "REF-2024-004",
    studentName: "Sneha Gupta",
    invoiceId: "INV-2024-012",
    amount: 30000,
    reason: "Technical Error",
    status: "Rejected",
    requestedDate: "2024-03-05",
    adminNotes: "Payment already processed"
  },
  {
    id: "REF-2024-005",
    studentName: "Arjun Patel",
    invoiceId: "INV-2024-025",
    amount: 12500,
    reason: "Duplicate Payment",
    status: "Pending",
    requestedDate: "2024-03-04",
    adminNotes: ""
  },
  {
    id: "REF-2024-006",
    studentName: "Diya Malhotra",
    invoiceId: "INV-2024-030",
    amount: 20000,
    reason: "Student Withdrawal",
    status: "Approved",
    requestedDate: "2024-03-03",
    adminNotes: "Withdrawal application verified"
  },
  {
    id: "REF-2024-007",
    studentName: "Kabir Singh",
    invoiceId: "INV-2024-028",
    amount: 18000,
    reason: "Other",
    status: "Pending",
    requestedDate: "2024-03-02",
    adminNotes: ""
  },
  {
    id: "REF-2024-008",
    studentName: "Ananya Reddy",
    invoiceId: "INV-2024-035",
    amount: 22000,
    reason: "Overpayment",
    status: "Processed",
    requestedDate: "2024-03-01",
    adminNotes: "Refund transferred on 2024-03-14"
  }
];

export const refundReasons = [
  "Duplicate Payment",
  "Student Withdrawal",
  "Overpayment",
  "Technical Error",
  "Scholarship Adjustment",
  "Other"
];
