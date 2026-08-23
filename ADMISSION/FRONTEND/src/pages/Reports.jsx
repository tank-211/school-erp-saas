import { useState } from "react";
import { Download, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import "../style.css";

const funnelData = [
  { stage:"Inquiries",  count:1234 },
  { stage:"Contacted",  count:980  },
  { stage:"Interested", count:756  },
  { stage:"Applied",    count:423  },
  { stage:"Enrolled",   count:234  },
];
const monthlyData = [
  {month:"Aug",inquiries:120,enrolled:45},{month:"Sep",inquiries:145,enrolled:52},
  {month:"Oct",inquiries:168,enrolled:61},{month:"Nov",inquiries:192,enrolled:68},
  {month:"Dec",inquiries:215,enrolled:75},{month:"Jan",inquiries:234,enrolled:82},
  {month:"Feb",inquiries:256,enrolled:89},
];
const gradeData = [
  {label:"Grade 1-3",value:125,color:"#14b8a6"},{label:"Grade 4-6",value:98,color:"#3b82f6"},
  {label:"Grade 7-9",value:76, color:"#8b5cf6"},{label:"Grade 10-12",value:45,color:"#ec4899"},
];
const counselorData = [
  {name:"Priya Sharma",leads:45,conversions:18},{name:"Amit Patel",leads:38,conversions:12},
  {name:"Neha Kumar",  leads:42,conversions:15},{name:"Rahul Singh",leads:35,conversions:9},
];

const Tip = ({active,payload,label}) => active&&payload?.length ? (
  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 12px rgba(0,0,0,.1)",fontSize:13}}>
    <p style={{fontWeight:700,color:"#111",marginBottom:4}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color,fontWeight:500}}>{p.name} : {p.value}</p>)}
  </div>
) : null;

export function Reports() {
  const [period,setPeriod] = useState("this-month");
  const [showPeriodDrop,setShowPeriodDrop] = useState(false);
  const periods = [["this-week","This Week"],["this-month","This Month"],["this-quarter","This Quarter"],["this-year","This Year"]];

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Reports & Analytics</h1><p className="page-sub">Comprehensive admission insights</p></div>
        <div className="page-actions">
          <div style={{position:"relative"}}>
            <button className="btn btn-outline" onClick={()=>setShowPeriodDrop(!showPeriodDrop)}>
              <Calendar size={14}/> {periods.find(p=>p[0]===period)?.[1]} ✓
            </button>
            {showPeriodDrop && (
              <div style={{position:"absolute",top:"110%",right:0,background:"#fff",border:"1px solid var(--gray-200)",borderRadius:"var(--r)",boxShadow:"var(--shadow-lg)",zIndex:50,minWidth:160}}>
                {periods.map(([v,l])=>(
                  <div key={v} style={{padding:"10px 16px",cursor:"pointer",background:period===v?"var(--gray-50)":"",fontWeight:period===v?600:400,display:"flex",justifyContent:"space-between"}} onClick={()=>{setPeriod(v);setShowPeriodDrop(false);}}>
                    {l}{period===v&&<span style={{color:"var(--primary)"}}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-outline"><Download size={14}/> Export Report</button>
        </div>
      </div>

      <div className="grid-2 mb-5">
        <div className="card">
          <div className="card-header"><div className="card-title">Conversion Funnel</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                <XAxis type="number" tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="stage" tick={{fill:"#6b7280",fontSize:12}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="count" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Grade Distribution</div></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {gradeData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={<Tip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="grid-2 gap-2 mt-3">
              {gradeData.map((g,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div style={{width:10,height:10,borderRadius:"50%",background:g.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:"var(--gray-600)"}}>{g.label}</span>
                  <span style={{fontWeight:700,marginLeft:"auto",fontSize:13}}>{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-5">
        <div className="card-header"><div className="card-title">Monthly Trend Analysis</div></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Line type="monotone" dataKey="inquiries" stroke="#3b82f6" strokeWidth={2.5} dot={{r:4,fill:"#3b82f6"}} name="Inquiries"/>
              <Line type="monotone" dataKey="enrolled"  stroke="#14b8a6" strokeWidth={2.5} dot={{r:4,fill:"#14b8a6"}} name="Enrolled"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Counselor Performance</div></div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={counselorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
              <XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="leads"       fill="#8b5cf6" name="Leads"       radius={[6,6,0,0]}/>
              <Bar dataKey="conversions" fill="#14b8a6" name="Conversions" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}