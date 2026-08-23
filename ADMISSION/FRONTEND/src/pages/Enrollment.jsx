import { GraduationCap, UserCheck, CheckCircle, Key } from "lucide-react";
import "../style.css";

const enrollments = [
  { id:1, student:"Arjun Kumar",  grade:"Grade 8", section:"A", studentId:"ST2026001", status:"Enrolled"   },
  { id:2, student:"Vihaan Reddy", grade:"Grade 6", section:"B", studentId:"ST2026002", status:"Enrolled"   },
  { id:3, student:"Diya Patel",   grade:"Grade 3", section:"A", studentId:"Pending",   status:"Processing" },
];
const processSteps = [
  { label:"Application Approved",   done:true  },
  { label:"Payment Confirmed",      done:true  },
  { label:"Student ID Generated",   done:true  },
  { label:"Class Assigned",         done:true  },
  { label:"Parent Portal Activated",done:false },
];

export function Enrollment() {
  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Enrollment Management</h1><p className="page-sub">Convert approved applications to enrolled students</p></div>
      </div>

      <div className="grid-4 mb-5">
        {[
          { label:"Total Enrolled",   value:"234", icon:GraduationCap, color:"var(--green-bg)",  ic:"var(--green)"  },
          { label:"This Month",       value:"45",  icon:UserCheck,     color:"var(--blue-bg)",   ic:"var(--blue)"   },
          { label:"Processing",       value:"12",  icon:CheckCircle,   color:"var(--purple-bg)", ic:"var(--purple)" },
          { label:"Portal Activated", value:"220", icon:Key,           color:"var(--orange-bg)", ic:"var(--orange)" },
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
          <div className="card-title">Recent Enrollments</div>
          <button className="btn btn-primary btn-sm">Convert to Student</button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student Name</th><th>Grade</th><th>Section</th><th>Student ID</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {enrollments.map(e=>(
                <tr key={e.id}>
                  <td className="td-bold">{e.student}</td><td>{e.grade}</td><td>{e.section}</td>
                  <td className="td-mono">{e.studentId}</td>
                  <td><span className={`badge ${e.status==="Enrolled"?"badge-green":"badge-blue"}`}>{e.status}</span></td>
                  <td><button className="btn btn-outline btn-sm">{e.status==="Enrolled"?"View":"Process"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Enrollment Process</div></div>
          <div className="card-body">
            {processSteps.map((s,i)=>(
              <div className="enroll-step" key={i}>
                <div className={`enroll-step-icon ${s.done?"done":"todo"}`}>
                  {s.done ? <CheckCircle size={16}/> : i+1}
                </div>
                <span className="enroll-step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Parent Portal Access</div></div>
          <div className="card-body">
            <div className="info-box info-box-blue mb-4">
              <div>
                <div className="info-box-text"><strong>220 parents</strong> have been granted portal access</div>
                <div className="info-box-text mt-1">Parents can now view student information, fees, and attendance</div>
              </div>
            </div>
            <button className="btn btn-outline w-full"><Key size={14}/> Send Portal Credentials</button>
          </div>
        </div>
      </div>
    </div>
  );
}