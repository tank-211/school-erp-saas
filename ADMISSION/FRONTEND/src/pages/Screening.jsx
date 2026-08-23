// ── Screening.jsx ───────────────────────────────────────────
import "../style.css";

const screeningData = [
  { id:1, student:"Aarav Sharma", grade:"Grade 5", test:"Mar 5, 2026",  interview:"Mar 8, 2026", status:"scheduled"      },
  { id:2, student:"Diya Patel",   grade:"Grade 3", test:"Mar 6, 2026",  interview:"Pending",     status:"test_scheduled" },
  { id:3, student:"Arjun Kumar",  grade:"Grade 8", test:"Completed",    interview:"Completed",   status:"approved"       },
];
const statusMap = { scheduled:"badge-blue", test_scheduled:"badge-orange", approved:"badge-green", waitlisted:"badge-purple" };
const statusLabel = s => s.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase());

export function Screening() {
  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Screening & Evaluation</h1><p className="page-sub">Manage entrance tests and interviews</p></div>
      </div>
      <div className="grid-4 mb-5">
        {[["Tests Scheduled","24","var(--blue)"],["Interviews Pending","12","var(--orange)"],["Approved","67","var(--green)"],["Waitlisted","15","var(--purple)"]].map(([l,v,c],i)=>(
          <div className="stat-card" key={i}><div className="stat-label">{l}</div><div className="stat-value" style={{color:c}}>{v}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Screening Schedule</div></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student Name</th><th>Grade</th><th>Test Date</th><th>Interview Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {screeningData.map(s=>(
                <tr key={s.id}>
                  <td className="td-bold">{s.student}</td><td>{s.grade}</td><td>{s.test}</td><td>{s.interview}</td>
                  <td><span className={`badge ${statusMap[s.status]||"badge-gray"}`}>{statusLabel(s.status)}</span></td>
                  <td><button className="btn btn-outline btn-sm">Evaluate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}