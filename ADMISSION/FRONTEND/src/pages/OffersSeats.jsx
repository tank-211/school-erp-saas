import { Award, TrendingUp, Users, FileText } from "lucide-react";
import "../style.css";

const offers = [
  { id:1, student:"Arjun Kumar",  grade:"Grade 8", section:"A", offerDate:"Mar 1, 2026", expiry:"Mar 15, 2026", status:"Accepted" },
  { id:2, student:"Ananya Singh", grade:"Grade 1", section:"B", offerDate:"Mar 2, 2026", expiry:"Mar 16, 2026", status:"Pending"  },
];
const seats = [
  { grade:"Grade 1", total:60, allocated:45 },
  { grade:"Grade 2", total:60, allocated:52 },
  { grade:"Grade 3", total:60, allocated:58 },
];

export function OffersSeats() {
  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Offers & Seat Allocation</h1><p className="page-sub">Manage admission offers and class capacities</p></div>
      </div>

      <div className="grid-4 mb-5">
        {[
          { label:"Offers Sent",  value:"156", icon:Award,     color:"var(--blue-bg)",  ic:"var(--blue)"   },
          { label:"Accepted",     value:"112", icon:TrendingUp, color:"var(--green-bg)", ic:"var(--green)"  },
          { label:"Total Seats",  value:"720", icon:Users,     color:"var(--purple-bg)",ic:"var(--purple)" },
          { label:"Available",    value:"98",  icon:FileText,  color:"var(--orange-bg)",ic:"var(--orange)" },
        ].map((s,i)=>{const Icon=s.icon;return(
          <div className="stat-card" key={i}>
            <div className="stat-wide">
              <div className="stat-icon" style={{background:s.color}}><Icon size={20} style={{color:s.ic}}/></div>
              <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
            </div>
          </div>
        );})}
      </div>

      <div className="card mb-5">
        <div className="card-header">
          <div className="card-title">Offers Generated</div>
          <button className="btn btn-primary btn-sm">Generate Offer</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student Name</th><th>Grade</th><th>Section</th><th>Offer Date</th><th>Expiry Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {offers.map(o=>(
                <tr key={o.id}>
                  <td className="td-bold">{o.student}</td><td>{o.grade}</td><td>{o.section}</td><td>{o.offerDate}</td><td>{o.expiry}</td>
                  <td><span className={`badge ${o.status==="Accepted"?"badge-green":"badge-orange"}`}>{o.status}</span></td>
                  <td><button className="btn btn-outline btn-sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Seat Capacity</div></div>
        <div className="card-body">
          {seats.map(s=>(
            <div className="seat-row" key={s.grade}>
              <div className="seat-row-top">
                <span className="seat-grade">{s.grade}</span>
                <span className="seat-count">{s.allocated}/{s.total} allocated</span>
              </div>
              <div className="progress-bar"><div className="progress-fill" style={{width:`${(s.allocated/s.total)*100}%`}}/></div>
              <div className="seat-available">{s.total-s.allocated} seats available</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}