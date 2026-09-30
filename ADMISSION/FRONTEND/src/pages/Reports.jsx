import { useEffect, useState } from "react";
import { Download, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import {
  getFunnelData,
  getMonthlyTrend,
  getGradeDistribution,
  getCounselorPerformance,
} from "../services/dashboardService";
import "../style.css";

const COLORS = ["#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#ef4444", "#6366f1"];
const PERIODS = [
  ["week", "This Week"],
  ["month", "This Month"],
  ["quarter", "This Quarter"],
  ["year", "This Year"],
  ["all", "All Time"],
];

const Tip = ({active,payload,label}) => active&&payload?.length ? (
  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.1)",fontSize:13}}>
    <p style={{fontWeight:700,color:"#111",marginBottom:4}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color,fontWeight:500}}>{p.name} : {p.value}</p>)}
  </div>
) : null;

const Empty = ({ text }) => (
  <div style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)", fontSize: 13 }}>{text}</div>
);

// Builds a CSV file of every table on the page and downloads it
const downloadCsv = (filename, sections) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [];
  for (const { title, headers, rows } of sections) {
    lines.push(esc(title));
    lines.push(headers.map(esc).join(","));
    rows.forEach((r) => lines.push(r.map(esc).join(",")));
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export function Reports() {
  const [period, setPeriod] = useState("month");
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [funnel, setFunnel] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [grades, setGrades] = useState([]);
  const [counselors, setCounselors] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError("");
    Promise.all([
      getFunnelData(signal, period),
      getMonthlyTrend(signal, period),
      getGradeDistribution(signal, period),
      getCounselorPerformance(signal, period),
    ])
      .then(([f, m, g, c]) => {
        setFunnel([
          { stage: "Inquiries", count: f.inquiry || 0 },
          { stage: "Contacted", count: f.contacted || 0 },
          { stage: "Interested", count: f.interested || 0 },
          { stage: "Visited", count: f.visit || 0 },
          { stage: "Applied", count: f.applied || 0 },
          { stage: "Enrolled", count: f.enrolled || 0 },
        ]);
        setMonthly(m?.data || []);
        setGrades((g?.data || []).map((x, i) => ({ ...x, color: COLORS[i % COLORS.length] })));
        setCounselors(c?.data || []);
      })
      .catch((err) => {
        if (!signal.aborted) setError(err.response?.data?.message || err.message || "Failed to load reports");
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period]);

  const periodLabel = PERIODS.find((p) => p[0] === period)?.[1];
  // Used inside sentences: "Leads added this month" / "Leads added so far"
  const periodText = period === "all" ? "so far" : periodLabel.toLowerCase();
  const hasFunnel = funnel.some((f) => f.count > 0);

  const exportReport = () =>
    downloadCsv(`admission-report-${period}.csv`, [
      { title: `Conversion funnel (${periodLabel})`, headers: ["Stage", "Leads"], rows: funnel.map((f) => [f.stage, f.count]) },
      { title: `Enrollments by class (${periodLabel})`, headers: ["Class", "Students"], rows: grades.map((g) => [g.label, g.value]) },
      { title: "Monthly trend", headers: ["Month", "Year", "Inquiries", "Enrolled"], rows: monthly.map((m) => [m.month, m.year, m.inquiries, m.enrollments]) },
      { title: `Counselor performance (${periodLabel})`, headers: ["Counselor", "Leads", "Applications", "Conversion %"], rows: counselors.map((c) => [c.name, c.leads, c.conversions, c.pct]) },
    ]);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Reports & Analytics</h1><p className="page-sub">Admission insights for your school</p></div>
        <div className="page-actions">
          <div style={{position:"relative"}}>
            <button className="btn btn-outline" onClick={()=>setShowPeriodDrop(!showPeriodDrop)}>
              <Calendar size={14}/> {periodLabel}
            </button>
            {showPeriodDrop && (
              <div style={{position:"absolute",top:"110%",right:0,background:"#fff",border:"1px solid var(--gray-200)",borderRadius:"var(--r)",boxShadow:"var(--shadow-lg)",zIndex:50,minWidth:160}}>
                {PERIODS.map(([v,l])=>(
                  <div key={v} style={{padding:"10px 16px",cursor:"pointer",background:period===v?"var(--gray-50)":"",fontWeight:period===v?600:400,display:"flex",justifyContent:"space-between"}} onClick={()=>{setPeriod(v);setShowPeriodDrop(false);}}>
                    {l}{period===v&&<span style={{color:"var(--primary)"}}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-outline" onClick={exportReport} disabled={loading || !!error}>
            <Download size={14}/> Export Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, color: "#991b1b" }}>
          {error}
        </div>
      )}
      {loading && <div className="loading" style={{ marginBottom: 16 }}>Loading reports...</div>}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Conversion Funnel</div><div className="card-sub">Leads added {periodText}, by furthest stage reached</div></div></div>
          <div className="card-body">
            {hasFunnel ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={funnel} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                  <XAxis type="number" allowDecimals={false} tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="stage" tick={{fill:"#6b7280",fontSize:12}} axisLine={false} tickLine={false} width={80}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="count" name="Leads" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty text={loading ? "" : `No leads added ${periodText}.`} />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div><div className="card-title">Enrollments by Class</div><div className="card-sub">Completed admissions {periodText}</div></div></div>
          <div className="card-body">
            {grades.length ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={grades} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="label">
                      {grades.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip content={<Tip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid-2 gap-2 mt-3">
                  {grades.map((g,i)=>(
                    <div key={i} className="flex items-center gap-2">
                      <div style={{width:10,height:10,borderRadius:"50%",background:g.color,flexShrink:0}}/>
                      <span style={{fontSize:13,color:"var(--gray-600)"}}>{g.label}</span>
                      <span style={{fontWeight:700,marginLeft:"auto",fontSize:13}}>{g.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <Empty text={loading ? "" : `No completed admissions ${periodText}.`} />}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div><div className="card-title">Monthly Trend</div><div className="card-sub">New inquiries and completed admissions per month</div></div></div>
        <div className="card-body">
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Line type="monotone" dataKey="inquiries" stroke="#3b82f6" strokeWidth={2.5} dot={{r:4,fill:"#3b82f6"}} name="Inquiries"/>
                <Line type="monotone" dataKey="enrollments" stroke="#14b8a6" strokeWidth={2.5} dot={{r:4,fill:"#14b8a6"}} name="Enrolled"/>
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty text={loading ? "" : "No data yet."} />}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div><div className="card-title">Counselor Performance</div><div className="card-sub">Assigned leads {periodText} and how many reached an application</div></div></div>
        <div className="card-body">
          {counselors.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={counselors}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:12}} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="leads" fill="#8b5cf6" name="Leads" radius={[6,6,0,0]}/>
                <Bar dataKey="conversions" fill="#14b8a6" name="Applications" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text={loading ? "" : `No leads assigned to counselors ${periodText}.`} />}
        </div>
      </div>
    </div>
  );
}
