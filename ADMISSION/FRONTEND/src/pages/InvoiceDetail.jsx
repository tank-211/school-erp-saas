import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Printer,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { getInvoiceDetails } from "../services/feeService";
import "../style.css";

export function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInvoiceDetails();
  }, [id]);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceDetails(id);
      setInvoice(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading">Loading invoice details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-message">{error}</div>
        <button className="btn btn-outline" onClick={() => navigate("/fees")}>
          <ArrowLeft size={16} /> Back to Fees
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page">
        <div className="error-message">Invoice not found</div>
        <button className="btn btn-outline" onClick={() => navigate("/fees")}>
          <ArrowLeft size={16} /> Back to Fees
        </button>
      </div>
    );
  }

  const studentName =
    `${invoice.first_name} ${invoice.middle_name || ""} ${invoice.last_name}`.trim();

  return (
    <div className="page">
      {/* Print Header - Hidden in normal view */}
      <div className="print-header" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: "0", fontSize: "24px" }}>
            {invoice.school_name}
          </h1>
          <p style={{ margin: "5px 0" }}>{invoice.school_address}</p>
          <p style={{ margin: "5px 0" }}>
            Phone: {invoice.school_phone} | Email: {invoice.school_email}
          </p>
        </div>
      </div>

      {/* Action Bar - Hidden when printing */}
      <div
        className="page-header print-hide"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button className="btn btn-outline" onClick={() => navigate("/fees")}>
            <ArrowLeft size={16} /> Back to Fees
          </button>
          <h1 className="page-title">Invoice Details</h1>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> Print Invoice
        </button>
      </div>

      {/* Invoice Content */}
      <div
        className="invoice-container"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          padding: "30px",
        }}
      >
        {/* Invoice Header */}
        <div
          className="invoice-header"
          style={{
            borderBottom: "2px solid #eee",
            paddingBottom: "20px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2
              style={{ margin: "0 0 10px 0", fontSize: "28px", color: "#333" }}
            >
              INVOICE
            </h2>
            <p style={{ margin: "0", fontSize: "16px", fontWeight: "bold" }}>
              #{invoice.invoice_number}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>
              {invoice.school_name}
            </h3>
            <p style={{ margin: "2px 0", fontSize: "14px" }}>
              {invoice.school_address}
            </p>
            <p style={{ margin: "2px 0", fontSize: "14px" }}>
              <Phone size={12} style={{ marginRight: "5px" }} />
              {invoice.school_phone}
            </p>
            <p style={{ margin: "2px 0", fontSize: "14px" }}>
              <Mail size={12} style={{ marginRight: "5px" }} />
              {invoice.school_email}
            </p>
          </div>
        </div>

        {/* Invoice Details */}
        <div
          className="invoice-details"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "30px",
            marginBottom: "30px",
          }}
        >
          <div>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                borderBottom: "1px solid #eee",
                paddingBottom: "5px",
              }}
            >
              Bill To:
            </h4>
            <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
              <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
                <User size={14} style={{ marginRight: "5px" }} />
                {studentName}
              </p>
              <p style={{ margin: "0 0 5px 0" }}>
                <FileText size={14} style={{ marginRight: "5px" }} />
                Class: {invoice.class_name} (Grade {invoice.grade})
              </p>
              <p style={{ margin: "0 0 5px 0" }}>
                <Mail size={14} style={{ marginRight: "5px" }} />
                {invoice.student_email}
              </p>
              <p style={{ margin: "0 0 5px 0" }}>
                <Phone size={14} style={{ marginRight: "5px" }} />
                {invoice.student_phone}
              </p>
              {invoice.parent_address && (
                <p style={{ margin: "0" }}>
                  <MapPin size={14} style={{ marginRight: "5px" }} />
                  {invoice.parent_address}
                </p>
              )}
            </div>
          </div>

          <div>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                borderBottom: "1px solid #eee",
                paddingBottom: "5px",
              }}
            >
              Invoice Details:
            </h4>
            <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
              <p style={{ margin: "0 0 5px 0" }}>
                <Calendar size={14} style={{ marginRight: "5px" }} />
                Invoice Date:{" "}
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
              <p style={{ margin: "0 0 5px 0" }}>
                <Calendar size={14} style={{ marginRight: "5px" }} />
                Due Date: {new Date(invoice.due_date).toLocaleDateString()}
              </p>
              <p style={{ margin: "0 0 5px 0" }}>
                Status:{" "}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor:
                      invoice.status === "paid"
                        ? "#d4edda"
                        : invoice.status === "partial"
                          ? "#fff3cd"
                          : "#f8d7da",
                    color:
                      invoice.status === "paid"
                        ? "#155724"
                        : invoice.status === "partial"
                          ? "#856404"
                          : "#721c24",
                  }}
                >
                  {invoice.status.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Fee Breakdown - Placeholder for now */}
        <div className="fee-breakdown" style={{ marginBottom: "30px" }}>
          <h4
            style={{
              margin: "0 0 15px 0",
              fontSize: "16px",
              borderBottom: "1px solid #eee",
              paddingBottom: "5px",
            }}
          >
            Fee Breakdown:
          </h4>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th
                  style={{
                    padding: "10px",
                    textAlign: "left",
                    border: "1px solid #dee2e6",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    border: "1px solid #dee2e6",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder - in real implementation, this would come from the API */}
              <tr>
                <td style={{ padding: "10px", border: "1px solid #dee2e6" }}>
                  Tuition Fee
                </td>
                <td
                  style={{
                    padding: "10px",
                    textAlign: "right",
                    border: "1px solid #dee2e6",
                  }}
                >
                  ₹{invoice.total_amount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="payment-history" style={{ marginBottom: "30px" }}>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                borderBottom: "1px solid #eee",
                paddingBottom: "5px",
              }}
            >
              Payment History:
            </h4>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    Method
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    Transaction ID
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment, index) => (
                  <tr key={index}>
                    <td
                      style={{ padding: "10px", border: "1px solid #dee2e6" }}
                    >
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #dee2e6" }}
                    >
                      {payment.payment_method}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #dee2e6" }}
                    >
                      {payment.transaction_id || "-"}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        border: "1px solid #dee2e6",
                      }}
                    >
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td
                      style={{ padding: "10px", border: "1px solid #dee2e6" }}
                    >
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor:
                            payment.status === "successful"
                              ? "#d4edda"
                              : "#f8d7da",
                          color:
                            payment.status === "successful"
                              ? "#155724"
                              : "#721c24",
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div
          className="invoice-totals"
          style={{
            borderTop: "2px solid #eee",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ width: "200px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              <span>Total Amount:</span>
              <span style={{ fontWeight: "bold" }}>
                ₹{invoice.total_amount.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              <span>Paid Amount:</span>
              <span style={{ fontWeight: "bold", color: "#28a745" }}>
                ₹{invoice.paid_amount.toLocaleString()}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "16px",
                fontWeight: "bold",
                borderTop: "1px solid #eee",
                paddingTop: "10px",
              }}
            >
              <span>Balance Due:</span>
              <span
                style={{
                  color: invoice.pending_amount > 0 ? "#dc3545" : "#28a745",
                }}
              >
                ₹{invoice.pending_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div
            className="invoice-notes"
            style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}
          >
            <strong>Notes:</strong> {invoice.notes}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .invoice-container {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 20px !important;
            max-width: none !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
          }
          th,
          td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
