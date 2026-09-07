import { useState } from "react";

const data = [
  { id: "REF-2024-001", name: "Aarav Sharma", invoice: "INV-2024-015", amount: 25000, reason: "Duplicate Payment", status: "Pending", date: "2024-03-08" },
  { id: "REF-2024-002", name: "Priya Kapoor", invoice: "INV-2024-018", amount: 15000, reason: "Student Withdrawal", status: "Approved", date: "2024-03-07" },
  { id: "REF-2024-003", name: "Rahul Verma", invoice: "INV-2024-020", amount: 8000, reason: "Overpayment", status: "Processed", date: "2024-03-06" },
  { id: "REF-2024-004", name: "Sneha Gupta", invoice: "INV-2024-012", amount: 30000, reason: "Technical Error", status: "Rejected", date: "2024-03-05" }
];

export default function RefundManagement() {
  const [refunds, setRefunds] = useState(data);
  const [search, setSearch] = useState("");

  const filtered = refunds.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const count = (status) =>
    refunds.filter((r) => r.status === status).length;

  return (
    <div className="page">

      {/* HEADER */}
      <div className="header">
        <div>
          <h2>Refund Management</h2>
          <p>Review and process refund requests</p>
        </div>

        <div className="header-btns">
          <button className="btn light">Export Report</button>
          <button className="btn green">New Refund Request</button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="summary">
        <div className="card active">
          <p>All Requests</p>
          <h3>{refunds.length}</h3>
        </div>
        <div className="card">
          <p>Pending</p>
          <h3 className="orange">{count("Pending")}</h3>
        </div>
        <div className="card">
          <p>Approved</p>
          <h3 className="green-text">{count("Approved")}</h3>
        </div>
        <div className="card">
          <p>Rejected</p>
          <h3 className="red">{count("Rejected")}</h3>
        </div>
        <div className="card">
          <p>Processed</p>
          <h3 className="green-text">{count("Processed")}</h3>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-bar">
        <input
          placeholder="Search by student name, request ID, or invoice ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn green small">Approve All Pending</button>
      </div>

      {/* TABLE */}
      <div className="table-box">
        <h4>Refund Requests ({filtered.length})</h4>

        <table>
          <thead>
            <tr>
              <th>REQUEST ID</th>
              <th>STUDENT NAME</th>
              <th>INVOICE ID</th>
              <th>AMOUNT</th>
              <th>REASON</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.invoice}</td>
                <td className="amount">₹{r.amount}</td>
                <td>{r.reason}</td>

                <td>
                  <span className={`badge ${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </td>

                <td>{r.date}</td>

                <td className="actions">
                  <button className="view">👁</button>

                  {r.status === "Pending" && (
                    <>
                      <button className="approve">✔</button>
                      <button className="reject">✖</button>
                    </>
                  )}

                  {r.status === "Approved" && (
                    <button className="process">⚙</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
