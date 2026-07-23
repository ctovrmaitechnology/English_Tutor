import AdminUserDetail from "./AdminUserDetail";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import api from "../services/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLORS       = ["#6366f1","#10b981","#3b82f6","#8b5cf6","#f59e0b","#ec4899"];
const AVATAR_COLORS= ["#6366f1","#10b981","#3b82f6","#8b5cf6","#f59e0b","#ec4899","#14b8a6","#f43f5e","#84cc16","#0ea5e9"];

// ─── HARDCODED DEFAULT UI DATA (POWERBI, PROGRESS, ASSESSMENTS, ORG) ─────────
const MOCK_ADMIN_DATA = {
  "/admin/overview": {
    totalUsers: 48,
    activeUsers: 42,
    inactiveUsers: 6,
    totalCertificates: 28,
    weeklyLogins: [
      { day: "Mon", logins: 38 },
      { day: "Tue", logins: 44 },
      { day: "Wed", logins: 42 },
      { day: "Thu", logins: 46 },
      { day: "Fri", logins: 40 },
      { day: "Sat", logins: 22 },
      { day: "Sun", logins: 18 }
    ],
    monthlyUsage: [
      { month: "Feb", hours: 140 },
      { month: "Mar", hours: 195 },
      { month: "Apr", hours: 260 },
      { month: "May", hours: 320 },
      { month: "Jun", hours: 410 },
      { month: "Jul", hours: 490 }
    ],
    skillTrend: [
      { week: "W1", speaking: 62, writing: 58 },
      { week: "W2", speaking: 68, writing: 64 },
      { week: "W3", speaking: 74, writing: 70 },
      { week: "W4", speaking: 79, writing: 76 },
      { week: "W5", speaking: 84, writing: 81 },
      { week: "W6", speaking: 88, writing: 85 }
    ]
  },

  "/admin/learning/progress": {
    moduleProgress: [
      { module: "SP-1", completed: 42, inProgress: 4, notStarted: 2 },
      { module: "SP-2", completed: 38, inProgress: 6, notStarted: 4 },
      { module: "SP-3", completed: 35, inProgress: 8, notStarted: 5 },
      { module: "SP-4", completed: 28, inProgress: 10, notStarted: 10 },
      { module: "WR-1", completed: 40, inProgress: 5, notStarted: 3 },
      { module: "WR-2", completed: 36, inProgress: 7, notStarted: 5 },
      { module: "WR-3", completed: 31, inProgress: 9, notStarted: 8 },
      { module: "WR-4", completed: 24, inProgress: 12, notStarted: 12 }
    ],
    userProgress: [
      { id: "u1", name: "Sri Harsha", batch: "Batch A", modulesDone: 7, speakingPct: 88, writingPct: 84, assessmentScore: 88, status: "active" },
      { id: "u2", name: "Priya Sharma", batch: "Batch A", modulesDone: 8, speakingPct: 96, writingPct: 92, assessmentScore: 94, status: "active" },
      { id: "u3", name: "Rahul Verma", batch: "Batch B", modulesDone: 5, speakingPct: 75, writingPct: 70, assessmentScore: 78, status: "active" },
      { id: "u4", name: "Ananya Patel", batch: "Batch B", modulesDone: 6, speakingPct: 82, writingPct: 80, assessmentScore: 82, status: "active" },
      { id: "u5", name: "Karthik Raja", batch: "Batch C", modulesDone: 4, speakingPct: 70, writingPct: 68, assessmentScore: 72, status: "active" }
    ],
    certSummary: [
      { id: "u1", name: "Sri Harsha", batch: "Batch A", certCount: 2, assessmentScore: 88, status: "active", certificates: [{ createdAt: "2026-06-15" }] },
      { id: "u2", name: "Priya Sharma", batch: "Batch A", certCount: 3, assessmentScore: 94, status: "active", certificates: [{ createdAt: "2026-06-20" }] },
      { id: "u3", name: "Rahul Verma", batch: "Batch B", certCount: 1, assessmentScore: 78, status: "active", certificates: [{ createdAt: "2026-07-01" }] },
      { id: "u4", name: "Ananya Patel", batch: "Batch B", certCount: 2, assessmentScore: 82, status: "active", certificates: [{ createdAt: "2026-07-05" }] }
    ],
    certStats: { totalCerts: 28, speakingCerts: 16, writingCerts: 12, usersWithCerts: 22 }
  },

  "/admin/assessment/analytics": {
    userScores: [
      { id: "u1", name: "Sri Harsha", fullName: "Sri Harsha", batch: "Batch A", entryScore: 68, moduleScore: 88, weeklyScore: 90, growth: 20, passed: true, studiedModulesThisWeek: ["SP-3", "WR-3"], weeklyAssessmentBased: "Based on: SP-3, WR-3", status: "active" },
      { id: "u2", name: "Priya Sharma", fullName: "Priya Sharma", batch: "Batch A", entryScore: 74, moduleScore: 94, weeklyScore: 96, growth: 20, passed: true, studiedModulesThisWeek: ["SP-4", "WR-4"], weeklyAssessmentBased: "Based on: SP-4, WR-4", status: "active" },
      { id: "u3", name: "Rahul Verma", fullName: "Rahul Verma", batch: "Batch B", entryScore: 58, moduleScore: 78, weeklyScore: 80, growth: 20, passed: true, studiedModulesThisWeek: ["SP-2", "WR-2"], weeklyAssessmentBased: "Based on: SP-2, WR-2", status: "active" },
      { id: "u4", name: "Ananya Patel", fullName: "Ananya Patel", batch: "Batch B", entryScore: 62, moduleScore: 82, weeklyScore: 85, growth: 20, passed: true, studiedModulesThisWeek: ["SP-3", "WR-2"], weeklyAssessmentBased: "Based on: SP-3, WR-2", status: "active" },
      { id: "u5", name: "Karthik Raja", fullName: "Karthik Raja", batch: "Batch C", entryScore: 52, moduleScore: 72, weeklyScore: 74, growth: 20, passed: true, studiedModulesThisWeek: ["SP-1", "WR-1"], weeklyAssessmentBased: "Based on: SP-1, WR-1", status: "active" }
    ],
    skillTrend: [
      { week: "W1", speaking: 60, writing: 56 },
      { week: "W2", speaking: 66, writing: 62 },
      { week: "W3", speaking: 72, writing: 68 },
      { week: "W4", speaking: 78, writing: 74 },
      { week: "W5", speaking: 84, writing: 80 },
      { week: "W6", speaking: 88, writing: 85 }
    ],
    summary: { avgEntry: 62, avgModule: 82, avgWeekly: 85, topPerformer: "Priya Sharma" }
  },

  "/admin/org/reports": {
    summary: { totalUsers: 48, activeUsers: 42, inactiveUsers: 6, completionRate: 84, totalTrainingHours: 490, avgImprovement: 22 },
    completionTrend: [
      { month: "Feb", rate: 35 },
      { month: "Mar", rate: 48 },
      { month: "Apr", rate: 62 },
      { month: "May", rate: 72 },
      { month: "Jun", rate: 79 },
      { month: "Jul", rate: 84 }
    ],
    featureUsage: [
      { name: "Speaking Drills", value: 380 },
      { name: "Writing Practice", value: 310 },
      { name: "Grammar Ninja", value: 240 },
      { name: "Word Chain", value: 190 },
      { name: "Learning Modules", value: 450 }
    ],
    batchReports: [
      { batch: "Batch A", total: 16, active: 15, inactive: 1, adoptionRate: "94%", avgScore: "91%", modulesCompleted: 122, certificates: 14, completionRate: "95%" },
      { batch: "Batch B", total: 18, active: 16, inactive: 2, adoptionRate: "89%", avgScore: "82%", modulesCompleted: 110, certificates: 9, completionRate: "85%" },
      { batch: "Batch C", total: 14, active: 11, inactive: 3, adoptionRate: "79%", avgScore: "74%", modulesCompleted: 78, certificates: 5, completionRate: "70%" }
    ]
  },

  "/admin/powerbi/kpis": {
    kpis: [
      { label: "Avg Score Improvement", value: "+22%", sub: "Entry vs Latest Assessment", color: "#6366f1" },
      { label: "Platform Adoption Rate", value: "88%", sub: "42 of 48 users active", color: "#10b981" },
      { label: "Avg AI Tutor Usage", value: "38 min", sub: "Per completed session", color: "#8b5cf6" },
      { label: "Module Completion Rate", value: "84%", sub: "Across all active batches", color: "#3b82f6" },
      { label: "Certificates Issued", value: "28", sub: "Total across all trainees", color: "#f59e0b" },
      { label: "Training ROI Est.", value: "3.2x", sub: "vs traditional classroom cost", color: "#ec4899" }
    ],
    completionTrend: [
      { month: "Feb", rate: 35 },
      { month: "Mar", rate: 48 },
      { month: "Apr", rate: 62 },
      { month: "May", rate: 72 },
      { month: "Jun", rate: 79 },
      { month: "Jul", rate: 84 }
    ],
    featureUsage: [
      { name: "Speaking Drills", value: 380 },
      { name: "Writing Practice", value: 310 },
      { name: "Grammar Ninja", value: 240 },
      { name: "Word Chain", value: 190 },
      { name: "Learning Modules", value: 450 }
    ],
    batchReports: [
      { batch: "Batch A", total: 16, active: 15, inactive: 1, adoptionRate: "94%", avgScore: "91%", modulesCompleted: 122, certificates: 14, completionRate: "95%" },
      { batch: "Batch B", total: 18, active: 16, inactive: 2, adoptionRate: "89%", avgScore: "82%", modulesCompleted: 110, certificates: 9, completionRate: "85%" },
      { batch: "Batch C", total: 14, active: 11, inactive: 3, adoptionRate: "79%", avgScore: "74%", modulesCompleted: 78, certificates: 5, completionRate: "70%" }
    ]
  }
};

// ─── API HOOKS ────────────────────────────────────────────────────────────────
function useAdminData(endpoint) {
  const isLiveOnly = endpoint === "/admin/users/activity";
  const defaultMock = isLiveOnly ? null : (MOCK_ADMIN_DATA[endpoint] || null);
  const [data, setData] = useState(defaultMock);
  const [loading, setLoading] = useState(isLiveOnly);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!endpoint) return;
    if (isLiveOnly) setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint);
      if (res?.data) {
        setData(res.data);
        setError(null);
      }
    } catch (e) {
      if (isLiveOnly) {
        setError(e?.response?.data?.message || "Failed to load user activity data");
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, isLiveOnly]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data: isLiveOnly ? data : (data || MOCK_ADMIN_DATA[endpoint]), loading, error, refetch: fetch };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app:       { fontFamily:"'Inter',-apple-system,sans-serif", background:"#f1f5f9", minHeight:"100vh", display:"flex" },
  sidebar:   { width:230, background:"linear-gradient(180deg,#1e1b4b,#312e81)", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:100, boxShadow:"4px 0 20px rgba(0,0,0,0.15)" },
  logo:      { padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  logoTop:   { fontSize:11, color:"#a5b4fc", fontWeight:700, letterSpacing:2, textTransform:"uppercase" },
  logoName:  { fontSize:22, color:"#fff", fontWeight:800, margin:"4px 0 2px" },
  logoBadge: { display:"inline-block", background:"#6366f1", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20, letterSpacing:1, textTransform:"uppercase" },
  nav:       { padding:"16px 12px", flex:1 },
  navSection:{ fontSize:9, color:"#818cf8", fontWeight:700, letterSpacing:2, textTransform:"uppercase", padding:"12px 8px 6px" },
  navItem:   (a) => ({ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer", marginBottom:2, background:a?"rgba(99,102,241,0.25)":"transparent", color:a?"#fff":"#c7d2fe", fontSize:13, fontWeight:a?600:400, border:a?"1px solid rgba(99,102,241,0.4)":"1px solid transparent" }),
  navIcon:   { fontSize:16, width:20, textAlign:"center" },
  main:      { marginLeft:230, flex:1, padding:"0 28px 28px" },
  topbar:    { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 0 24px", borderBottom:"1px solid #e2e8f0", marginBottom:28 },
  pageTitle: { fontSize:22, fontWeight:800, color:"#1e1b4b", margin:0 },
  pageSub:   { fontSize:13, color:"#64748b", marginTop:2 },
  badge:     (c) => ({ background:c+"18", color:c, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, border:`1px solid ${c}30` }),
  card:      { background:"#fff", borderRadius:16, padding:24, boxShadow:"0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)", border:"1px solid #f1f5f9" },
  cardTitle: { fontSize:14, fontWeight:700, color:"#1e293b", marginBottom:4 },
  cardSub:   { fontSize:12, color:"#94a3b8", marginBottom:20 },
  grid2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 },
  kpiGrid:   { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 },
  kpiCard:   (c) => ({ background:"#fff", borderRadius:14, padding:"18px 20px", borderLeft:`4px solid ${c}`, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }),
  kpiVal:    (c) => ({ fontSize:28, fontWeight:800, color:c, lineHeight:1.1 }),
  kpiLabel:  { fontSize:12, fontWeight:700, color:"#334155", marginTop:4 },
  kpiSub:    { fontSize:11, color:"#94a3b8", marginTop:2 },
  statRow:   { display:"flex", gap:16, marginBottom:28 },
  statCard:  (c) => ({ flex:1, background:"#fff", borderRadius:14, padding:"18px 20px", borderTop:`3px solid ${c}`, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }),
  statVal:   { fontSize:30, fontWeight:800, color:"#1e293b" },
  statLabel: { fontSize:12, color:"#64748b", marginTop:4, fontWeight:500 },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.8, padding:"10px 12px", textAlign:"left", borderBottom:"2px solid #f1f5f9", background:"#f8fafc" },
  td:        { fontSize:13, color:"#334155", padding:"12px 12px", borderBottom:"1px solid #f1f5f9" },
  avatar:    (c) => ({ width:32, height:32, borderRadius:"50%", background:c, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }),
  progressBar: () => ({ height:6, borderRadius:10, background:"#f1f5f9", position:"relative", overflow:"hidden" }),
  progressFill:(p,c) => ({ height:"100%", borderRadius:10, background:c, width:`${Math.min(p,100)}%` }),
  chip:      (s) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:s==="active"?"#d1fae5":"#fee2e2", color:s==="active"?"#065f46":"#991b1b" }),
  btn:       (c) => ({ background:c, color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }),
  filterRow: { display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" },
  select:    { padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13, color:"#334155", background:"#fff", cursor:"pointer" },
  input:     { padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13, color:"#334155", background:"#fff", width:220 },
  tabRow:    { display:"flex", gap:4, marginBottom:24, background:"#f1f5f9", borderRadius:10, padding:4 },
  tab:       (a) => ({ flex:1, padding:"8px 0", textAlign:"center", fontSize:12, fontWeight:600, borderRadius:8, cursor:"pointer", border:"none", background:a?"#fff":"transparent", color:a?"#6366f1":"#64748b", boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none" }),
  modal:     { position:"fixed", inset:0, background:"rgba(15,23,42,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 },
  modalBox:  { background:"#fff", borderRadius:20, padding:32, width:600, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" },
  spinner:   { display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", color:"#6366f1", fontSize:14, flexDirection:"column", gap:12 },
  errBox:    { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:12, padding:"16px 20px", color:"#991b1b", fontSize:13, marginBottom:20 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1e293b", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#f8fafc" }}>
      <div style={{ fontWeight:700, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color||"#a5b4fc" }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

const Spinner = ({ text = "Loading..." }) => (
  <div style={S.spinner}>
    <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    {text}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const ErrMsg = ({ msg, onRetry }) => (
  <div style={S.errBox}>
    ⚠️ {msg}
    {onRetry && <button onClick={onRetry} style={{ marginLeft:12, ...S.btn("#ef4444"), padding:"4px 12px", fontSize:12 }}>Retry</button>}
  </div>
);

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

// ─── USER MODAL ───────────────────────────────────────────────────────────────
function UserModal({ user, onClose }) {
  const { data, loading } = useAdminData(user ? `/admin/users/${user.id}/sessions` : null);
  if (!user) return null;
  const sc = user.assessmentScore >= 80 ? "#10b981" : user.assessmentScore >= 65 ? "#f59e0b" : "#ef4444";
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
          <div style={{ ...S.avatar(AVATAR_COLORS[user.id?.charCodeAt(0) % 10 || 0]), width:52, height:52, fontSize:20 }}>{user.name?.[0]}</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#1e1b4b" }}>{user.name}</div>
            <div style={{ fontSize:13, color:"#64748b" }}>{user.email} · {user.batch}</div>
          </div>
          <span style={{ marginLeft:"auto", ...S.chip(user.status) }}><span style={{ fontSize:8 }}>●</span> {user.status}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
          {[
            { label:"Total Usage",       val: user.totalUsage + " hrs",    color:"#6366f1" },
            { label:"Avg Session",        val: user.avgSessionMins + " min", color:"#8b5cf6" },
            { label:"Modules Done",       val: user.modulesDone + " / 8",   color:"#3b82f6" },
            { label:"Assessment Score",   val: user.assessmentScore + "%",  color: sc },
            { label:"Current Streak",     val: user.streak + " days",       color:"#f59e0b" },
            { label:"Certificates",       val: user.certificates,           color:"#10b981" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#f8fafc", borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${s.color}` }}>
              <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Recent Session History</div>
          {loading ? <Spinner text="Loading sessions..." /> : (
            data?.gameSessions?.length > 0 ? (
              <table style={S.table}>
                <thead><tr>
                  {["Game","Category","Score","Accuracy","Status","Date"].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.gameSessions.slice(0,8).map(s => (
                    <tr key={s.id}>
                      <td style={S.td}>{s.gameType}</td>
                      <td style={S.td}><span style={S.badge("#6366f1")}>{s.category}</span></td>
                      <td style={S.td}>{s.score}/{s.maxScore}</td>
                      <td style={S.td}>{s.accuracy}%</td>
                      <td style={S.td}>{s.completed ? <span style={S.badge("#10b981")}>Done</span> : <span style={S.badge("#94a3b8")}>Incomplete</span>}</td>
                      <td style={S.td}>{fmt(s.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color:"#94a3b8", fontSize:13 }}>No game sessions yet.</p>
          )}
        </div>
        <button style={{ ...S.btn("#6366f1"), marginTop:20, width:"100%" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── BULK UPLOAD MODAL ────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onComplete }) {
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/admin/users/bulk-template', { responseType:'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url; a.download = 'vrm_buddy_users_template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Failed to download template'); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.xlsx')) { setFile(f); setError(''); }
    else setError('Please upload a .xlsx file only.');
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.name.endsWith('.xlsx')) { setFile(f); setError(''); }
    else setError('Please upload a .xlsx file only.');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/admin/users/bulk-upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      if (res.data.created > 0) onComplete();
    } catch (e) {
      setError(e?.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, width:560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#1e1b4b' }}>📊 Bulk Upload Users</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Upload an Excel file to create multiple accounts at once</div>
          </div>
          <button onClick={onClose} style={{ background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:16, color:'#64748b' }}>✕</button>
        </div>

        {/* Step 1 */}
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#065f46', marginBottom:6 }}>Step 1 — Download the template</div>
          <div style={{ fontSize:12, color:'#14532d', marginBottom:10 }}>
            Fill in the Excel template. Required columns: First Name, Last Name, Username, Email, Password, Batch, Role.
          </div>
          <button onClick={handleDownloadTemplate} style={{ ...S.btn('#10b981'), padding:'8px 16px', fontSize:12 }}>
            ⬇ Download Template
          </button>
        </div>

        <div style={{ fontSize:13, fontWeight:700, color:'#475569', marginBottom:8 }}>Step 2 — Upload filled Excel file</div>

        {!result && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById('bulk-file-input').click()}
              style={{
                border:`2px dashed ${dragOver ? '#6366f1' : '#e2e8f0'}`,
                borderRadius:12, padding:'32px 20px', textAlign:'center',
                cursor:'pointer', marginBottom:16,
                background: dragOver ? '#ede9fe' : '#f8fafc',
                transition:'all 0.15s',
              }}
            >
              <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
              {file ? (
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#6366f1' }}>✅ {file.name}</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{(file.size/1024).toFixed(1)} KB — Click to change</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#334155' }}>Drag & drop your Excel file here</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>or click to browse — .xlsx files only</div>
                </div>
              )}
              <input id="bulk-file-input" type="file" accept=".xlsx" style={{ display:'none' }} onChange={handleFileChange} />
            </div>

            {error && <div style={{ ...S.errBox, marginBottom:12 }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button style={{ ...S.btn('#f1f5f9'), color:'#64748b', flex:1, padding:'12px 0' }} onClick={onClose}>Cancel</button>
              <button
                style={{ ...S.btn('#6366f1'), flex:2, padding:'12px 0', fontSize:14, opacity: !file || uploading ? 0.7 : 1 }}
                onClick={handleUpload} disabled={!file || uploading}
              >
                {uploading ? '⏳ Creating Users...' : '🚀 Upload & Create Users'}
              </button>
            </div>
          </>
        )}

        {result && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              {[
                { label:'Total Rows', val:result.total,   color:'#6366f1' },
                { label:'✅ Created', val:result.created, color:'#10b981' },
                { label:'❌ Failed',  val:result.failed,  color:'#ef4444' },
              ].map((s,i) => (
                <div key={i} style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', textAlign:'center', borderLeft:`3px solid ${s.color}` }}>
                  <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight:240, overflowY:'auto', border:'1px solid #f1f5f9', borderRadius:10 }}>
              <table style={S.table}>
                <thead><tr>{['Row','Name','Email','Status','Reason'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((r,i) => (
                    <tr key={i}>
                      <td style={S.td}>{r.row}</td>
                      <td style={S.td}>{r.name}</td>
                      <td style={S.td}>{r.email}</td>
                      <td style={S.td}>{r.status==='created' ? <span style={S.badge('#10b981')}>✅ Created</span> : <span style={S.badge('#ef4444')}>❌ Failed</span>}</td>
                      <td style={S.td}><span style={{ fontSize:11, color:'#94a3b8' }}>{r.reason||'—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button style={{ ...S.btn('#6366f1'), width:'100%', padding:'12px 0', marginTop:16 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CREATE USER MODAL ────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onAdd, batches }) {
  const [form,  setForm]  = useState({ firstName:"", lastName:"", email:"", username:"", password:"", batch:"Batch A", role:"Agent", isActive:true });
  const [error, setError] = useState("");
  const [saving,setSaving]= useState(false);

  const handleSubmit = async () => {
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!form.email.trim() || !form.email.includes("@")) return setError("Valid email is required.");
    if (!form.username.trim()) return setError("Username is required.");
    if (!form.password.trim()) return setError("Password is required.");
    setError(""); setSaving(true);
    try {
      const res = await api.post("/admin/users", form);
      onAdd(res.data);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create user.");
    } finally { setSaving(false); }
  };

  const field = { display:"flex", flexDirection:"column", gap:6, marginBottom:16 };
  const label = { fontSize:12, fontWeight:700, color:"#475569" };
  const inp   = { ...S.input, width:"100%", boxSizing:"border-box", padding:"10px 14px" };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, width:460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"#1e1b4b" }}>Create New User</div>
            <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>Fill in details and assign a batch</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, color:"#64748b" }}>✕</button>
        </div>
        {error && <div style={S.errBox}>{error}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={field}><label style={label}>First Name *</label><input style={inp} placeholder="e.g. Arun" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} /></div>
          <div style={field}><label style={label}>Last Name *</label><input style={inp} placeholder="e.g. Kumar" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} /></div>
        </div>
        <div style={field}><label style={label}>Email *</label><input style={inp} placeholder="e.g. arun@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={field}><label style={label}>Username *</label><input style={inp} placeholder="e.g. arun123" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></div>
          <div style={field}><label style={label}>Password *</label><input style={inp} type="password" placeholder="Min 8 chars" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
          <div style={field}>
            <label style={label}>Assign Batch *</label>
            <select style={inp} value={form.batch} onChange={e=>setForm({...form,batch:e.target.value})}>
              {batches.map(b=><option key={b}>{b}</option>)}
              <option value="Batch D">Batch D (New)</option>
            </select>
          </div>
          <div style={field}>
            <label style={label}>Role</label>
            <select style={inp} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option>Agent</option><option>Team Lead</option><option>Trainer</option>
            </select>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <button style={{ ...S.btn("#f1f5f9"), color:"#64748b", flex:1, padding:"12px 0" }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn("#6366f1"), flex:2, padding:"12px 0", fontSize:14, opacity:saving?0.7:1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview() {
  const { data, loading, error, refetch } = useAdminData("/admin/overview");
  if (loading) return <Spinner text="Loading overview..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;
  const { totalUsers, activeUsers, inactiveUsers, totalCertificates, weeklyLogins, monthlyUsage, skillTrend } = data;

  return (
    <div>
      <div style={S.statRow}>
        {[
          { label:"Total Users",        val: totalUsers,        color:"#6366f1", icon:"👥" },
          { label:"Active Users",       val: activeUsers,       color:"#10b981", icon:"✅" },
          { label:"Inactive Users",     val: inactiveUsers,     color:"#ef4444", icon:"⚠️" },
          { label:"Certificates Issued",val: totalCertificates, color:"#f59e0b", icon:"🏆" },
        ].map((s,i) => (
          <div key={i} style={S.statCard(s.color)}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div style={S.statVal}>{s.val}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardTitle}>Daily Login Activity (This Week)</div>
          <div style={S.cardSub}>Login count per day</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyLogins} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Bar dataKey="logins" fill="#6366f1" radius={[6,6,0,0]} />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Platform Usage Hours (Monthly)</div>
          <div style={S.cardSub}>Total hours across all users</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyUsage} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <defs><linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Area type="monotone" dataKey="hours" stroke="#6366f1" fill="url(#ug)" strokeWidth={2} />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Skill Improvement Trend</div>
          <div style={S.cardSub}>Avg speaking vs writing scores (6 weeks)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={skillTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Line type="monotone" dataKey="speaking" stroke="#6366f1" strokeWidth={2.5} dot={{ r:4, fill:"#6366f1" }} name="Speaking" />
              <Line type="monotone" dataKey="writing"  stroke="#10b981" strokeWidth={2.5} dot={{ r:4, fill:"#10b981" }} name="Writing" />
              <XAxis dataKey="week" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} />
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Active vs Inactive Users</div>
          <div style={S.cardSub}>Platform adoption distribution</div>
          <div style={{ display:"flex", alignItems:"center", gap:24 }}>
            <ResponsiveContainer width={180} height={200}>
              <PieChart>
                <Pie data={[{ name:"Active", value:activeUsers, color:"#10b981" },{ name:"Inactive", value:inactiveUsers, color:"#ef4444" }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {[{ color:"#10b981" },{ color:"#ef4444" }].map((d,i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CT />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {[{ name:"Active", value:activeUsers, color:"#10b981" },{ name:"Inactive", value:inactiveUsers, color:"#ef4444" }].map((d,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:d.color }} />
                  <span style={{ fontSize:13, color:"#334155", flex:1 }}>{d.name}</span>
                  <strong style={{ color:d.color, fontSize:18 }}>{d.value}</strong>
                </div>
              ))}
              <div style={{ marginTop:16, padding:"12px 16px", background:"#f0fdf4", borderRadius:10, fontSize:12, color:"#065f46", fontWeight:600 }}>
                {Math.round((activeUsers/totalUsers)*100)}% adoption rate ✅
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── USER ACTIVITY ────────────────────────────────────────────────────────────
function UserActivity() {
  const { data, loading, error, refetch } = useAdminData("/admin/users/activity");
  const [search,       setSearch]       = useState("");
  const [batchFilter,  setBatchFilter]  = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showBulk,     setShowBulk]     = useState(false);
  const [localUsers,   setLocalUsers]   = useState(null);

  const users   = localUsers ?? data?.users ?? [];
  const batches = [...new Set(users.map(u => u.batch).filter(b => b && b !== "—"))].sort();

  const filtered = useMemo(() => users.filter(u =>
    (batchFilter  === "All" || u.batch  === batchFilter) &&
    (statusFilter === "All" || u.status === statusFilter) &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  ), [users, search, batchFilter, statusFilter]);

  useEffect(() => { if (data?.users) setLocalUsers(data.users); }, [data]);

  const handleAddUser = (newUser) => setLocalUsers(prev => [{ ...newUser, name: `${newUser.first_name} ${newUser.last_name}`, totalUsage:0, avgSessionMins:0, aiTutorMins:0, modulesDone:0, assessmentScore:0, streak:0, certificates:0, recentSessions:[] }, ...(prev || [])]);

  const handleToggleStatus = async (u) => {
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive: u.status === "inactive" });
      setLocalUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === "active" ? "inactive" : "active" } : x));
    } catch (e) { alert("Failed to update status"); }
  };

  if (loading) return <Spinner text="Loading user activity..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;

  return (
    <div>
      {showCreate   && <CreateUserModal onClose={() => setShowCreate(false)} onAdd={handleAddUser} batches={batches.length ? batches : ["Batch A","Batch B","Batch C"]} />}
      {showBulk     && <BulkUploadModal onClose={() => setShowBulk(false)} onComplete={() => { setShowBulk(false); refetch(); }} />}
      {selectedUser && <div style={{position:"fixed",inset:0,background:"#f8fafc",zIndex:300,overflowY:"auto"}}><AdminUserDetail userId={selectedUser.id} onBack={() => setSelectedUser(null)} /></div>}

      <div style={S.statRow}>
        {[
          { label:"Avg Usage / User",    val: data?.avgUsage     + " hrs", color:"#6366f1" },
          { label:"Avg AI Tutor Usage",  val: data?.avgAiTutor   + " min", color:"#8b5cf6" },
          { label:"Avg Session Length",  val: data?.avgSessionLen + " min", color:"#3b82f6" },
          { label:"Top Streak",          val: data?.topStreak    + " days", color:"#f59e0b" },
        ].map((s,i) => (
          <div key={i} style={S.statCard(s.color)}>
            <div style={S.statVal}>{s.val}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.filterRow}>
          <input style={S.input} placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={S.select} value={batchFilter} onChange={e => setBatchFilter(e.target.value)}>
            <option>All</option>{batches.map(b => <option key={b}>{b}</option>)}
          </select>
          <select style={S.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All</option><option>active</option><option>inactive</option>
          </select>
          <span style={{ fontSize:12, color:"#94a3b8" }}>{filtered.length} users</span>
          <button style={{ ...S.btn("#6366f1"), marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }} onClick={() => setShowCreate(true)}>+ Create User</button>
          <button style={{ ...S.btn("#10b981"), display:"flex", alignItems:"center", gap:6 }} onClick={() => setShowBulk(true)}>📊 Bulk Upload</button>
        </div>
        <table style={S.table}>
          <thead><tr>{["User","Batch","Level","Status","Total Usage","AI Tutor","Last Login","Streak","Action"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((u,i) => (
              <tr key={u.id} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={S.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div>
                    <div><div style={{ fontWeight:600 }}>{u.name}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{u.email}</div></div>
                  </div>
                </td>
                <td style={S.td}><span style={S.badge("#6366f1")}>{u.batch || "—"}</span></td>
                <td style={S.td}>
                  <span style={{
                    ...S.badge(u.entryLevel === 'intermediate' ? '#10b981' : '#f59e0b'),
                    textTransform:'capitalize',
                  }}>
                    {u.entryLevel || 'beginner'}
                  </span>
                </td>
                <td style={S.td}><span style={S.chip(u.status)}><span style={{ fontSize:8 }}>●</span> {u.status}</span></td>
                <td style={S.td}><strong>{u.totalUsage}</strong> hrs</td>
                <td style={S.td}>{u.aiTutorMins} min</td>
                <td style={S.td}>{fmt(u.lastLogin)}</td>
                <td style={S.td}>{u.streak}d</td>
                <td style={S.td}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button style={{ ...S.btn("#6366f1"), padding:"5px 12px", fontSize:12 }} onClick={() => setSelectedUser(u)}>View</button>
                    <button style={{ ...S.btn(u.status==="active"?"#ef4444":"#10b981"), padding:"5px 12px", fontSize:12 }} onClick={() => handleToggleStatus(u)}>
                      {u.status==="active"?"Deactivate":"Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LEARNING PROGRESS ────────────────────────────────────────────────────────
function LearningProgress() {
  const { data, loading, error, refetch } = useAdminData("/admin/learning/progress");
  const [view, setView] = useState(0);
  if (loading) return <Spinner text="Loading learning progress..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;
  const { moduleProgress, userProgress, certSummary, certStats } = data;

  return (
    <div>
      <div style={S.tabRow}>
        {["Module Progress","User Learning Paths","Certification Status"].map((t,i) => (
          <button key={i} style={S.tab(view===i)} onClick={() => setView(i)}>{t}</button>
        ))}
      </div>

      {view === 0 && (
        <div style={S.grid2}>
          <div style={{ ...S.card, gridColumn:"1/-1" }}>
            <div style={S.cardTitle}>Module Completion Status (All Users)</div>
            <div style={S.cardSub}>Completed vs Not Started per module</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={moduleProgress} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Bar dataKey="completed"  stackId="a" fill="#10b981" name="Completed" />
                <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                <Bar dataKey="notStarted" stackId="a" fill="#e2e8f0" name="Not Started" radius={[4,4,0,0]} />
                <XAxis dataKey="module" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CT />} />
                <Legend wrapperStyle={{ fontSize:11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {userProgress.map((u,i) => (
            <div key={u.id} style={S.card}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div>
                <div><div style={{ fontWeight:700, fontSize:13 }}>{u.name}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{u.batch}</div></div>
                <span style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color:"#6366f1" }}>{u.modulesDone}/8</span>
              </div>
              <div style={S.progressBar()}><div style={S.progressFill(u.modulesDone/8*100,"#6366f1")} /></div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>{Math.min(100,Math.round(u.modulesDone/8*100))}% complete</div>
            </div>
          ))}
        </div>
      )}

      {view === 1 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Individual Learning Path Progress</div>
          <table style={S.table}>
            <thead><tr>{["User","Batch","Speaking Progress","Writing Progress","Score","Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {userProgress.map((u,i) => (
                <tr key={u.id}>
                  <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div><span style={{ fontWeight:600 }}>{u.name}</span></div></td>
                  <td style={S.td}><span style={S.badge("#6366f1")}>{u.batch}</span></td>
                  <td style={S.td}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ ...S.progressBar(), flex:1, height:8 }}><div style={S.progressFill(u.speakingPct,"#6366f1")} /></div>
                      <span style={{ fontSize:11, color:"#64748b", minWidth:35 }}>{Math.min(100,u.speakingPct)}%</span>
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ ...S.progressBar(), flex:1, height:8 }}><div style={S.progressFill(u.writingPct,"#10b981")} /></div>
                      <span style={{ fontSize:11, color:"#64748b", minWidth:35 }}>{Math.min(100,u.writingPct)}%</span>
                    </div>
                  </td>
                  <td style={S.td}><span style={{ color: u.assessmentScore>=70?"#10b981":"#f59e0b", fontWeight:700 }}>{u.assessmentScore}%</span></td>
                  <td style={S.td}><span style={S.chip(u.status)}><span style={{ fontSize:8 }}>●</span> {u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 2 && (
        <div>
          <div style={{ ...S.statRow, marginBottom:20 }}>
            {[
              { label:"Total Certificates", val: certStats.totalCerts,     color:"#f59e0b" },
              { label:"Users with Certs",   val: certStats.usersWithCerts, color:"#10b981" },
              { label:"Speaking Certs",     val: certStats.speakingCerts,  color:"#6366f1" },
              { label:"Writing Certs",      val: certStats.writingCerts,   color:"#8b5cf6" },
            ].map((s,i) => (
              <div key={i} style={S.statCard(s.color)}><div style={S.statVal}>{s.val}</div><div style={S.statLabel}>{s.label}</div></div>
            ))}
          </div>
          <div style={S.card}>
            <table style={S.table}>
              <thead><tr>{["User","Batch","Certificates","Score","Issue Date","Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {certSummary.map((u,i) => (
                  <tr key={u.id}>
                    <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div><span style={{ fontWeight:600 }}>{u.name}</span></div></td>
                    <td style={S.td}><span style={S.badge("#6366f1")}>{u.batch}</span></td>
                    <td style={S.td}>{u.certCount > 0 ? <span style={{ color:"#f59e0b", fontWeight:700 }}>{"🏆".repeat(u.certCount)} {u.certCount}</span> : <span style={{ color:"#94a3b8" }}>—</span>}</td>
                    <td style={S.td}><span style={{ color:u.assessmentScore>=70?"#10b981":"#f59e0b", fontWeight:700 }}>{u.assessmentScore}%</span></td>
                    <td style={S.td}>{u.certificates?.[0] ? fmt(u.certificates[0].createdAt) : "—"}</td>
                    <td style={S.td}>{u.certCount > 0 ? <span style={S.badge("#10b981")}>Issued</span> : <span style={S.badge("#94a3b8")}>Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ASSESSMENTS ──────────────────────────────────────────────────────────────
function Assessments() {
  const { data, loading, error, refetch } = useAdminData("/admin/assessment/analytics");
  const [view, setView] = useState(0);
  if (loading) return <Spinner text="Loading assessment data..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;
  const { userScores, skillTrend, summary } = data;

  return (
    <div>
      <div style={S.tabRow}>
        {["Score Overview","Skill Trends","Weekly Assessment","Individual Report"].map((t,i) => (
          <button key={i} style={S.tab(view===i)} onClick={() => setView(i)}>{t}</button>
        ))}
      </div>

      {view === 0 && (
        <div style={S.grid2}>
          <div style={{ ...S.card, gridColumn:"1/-1" }}>
            <div style={S.cardTitle}>Entry vs Module vs Weekly Assessment Scores</div>
            <div style={S.cardSub}>Score comparison per user across all assessment types</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userScores} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Bar dataKey="entryScore"  fill="#94a3b8" name="Entry"  radius={[4,4,0,0]} />
                <Bar dataKey="moduleScore" fill="#6366f1" name="Module" radius={[4,4,0,0]} />
                <Bar dataKey="weeklyScore" fill="#10b981" name="Weekly" radius={[4,4,0,0]} />
                <XAxis dataKey="name" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} />
                <Tooltip content={<CT />} />
                <Legend wrapperStyle={{ fontSize:11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {[
            { label:"Avg Entry Score",  val: summary.avgEntry  + "%", color:"#94a3b8", icon:"📋" },
            { label:"Avg Module Score", val: summary.avgModule + "%", color:"#6366f1", icon:"📚" },
            { label:"Avg Weekly Score", val: summary.avgWeekly + "%", color:"#10b981", icon:"📅" },
            { label:"Top Performer",    val: summary.topPerformer,   color:"#f59e0b", icon:"⭐" },
          ].map((s,i) => (
            <div key={i} style={S.statCard(s.color)}><div style={{ fontSize:24 }}>{s.icon}</div><div style={S.statVal}>{s.val}</div><div style={S.statLabel}>{s.label}</div></div>
          ))}
        </div>
      )}

      {view === 1 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Speaking & Writing Skill Trend (6 Weeks)</div>
          <div style={S.cardSub}>Average scores improving week over week</div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={skillTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Area type="monotone" dataKey="speaking" stroke="#6366f1" fill="url(#sg)" strokeWidth={2.5} name="Speaking" />
              <Area type="monotone" dataKey="writing"  stroke="#10b981" fill="url(#wg)" strokeWidth={2.5} name="Writing" />
              <XAxis dataKey="week" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} />
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {view === 2 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Weekly Assessment Results</div>
          <div style={S.cardSub}>Based on modules each user studied this week</div>
          <table style={S.table}>
            <thead><tr>{["User","Batch","Weekly Score","Modules Studied","Growth","Result"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {userScores.map((u,i) => (
                <tr key={u.id}>
                  <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div><span style={{ fontWeight:600 }}>{u.fullName}</span></div></td>
                  <td style={S.td}><span style={S.badge("#6366f1")}>{u.batch}</span></td>
                  <td style={S.td}><span style={{ color:"#10b981", fontWeight:700 }}>{u.weeklyScore}%</span></td>
                  <td style={S.td} style={{ fontSize:11, color:"#64748b" }}>{u.weeklyAssessmentBased}</td>
                  <td style={S.td}><span style={{ color: u.growth>=0?"#10b981":"#ef4444", fontWeight:700 }}>{u.growth >= 0 ? "+" : ""}{u.growth}%</span></td>
                  <td style={S.td}>{u.passed ? <span style={S.badge("#10b981")}>Pass</span> : <span style={S.badge("#ef4444")}>Needs Work</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 3 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Individual Performance Report</div>
          <table style={S.table}>
            <thead><tr>{["User","Batch","Entry","Module","Weekly","Growth","Result"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {userScores.map((u,i) => (
                <tr key={u.id}>
                  <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={S.avatar(AVATAR_COLORS[i%10])}>{u.name?.[0]}</div><span style={{ fontWeight:600 }}>{u.fullName}</span></div></td>
                  <td style={S.td}><span style={S.badge("#6366f1")}>{u.batch}</span></td>
                  <td style={S.td}>{u.entryScore}%</td>
                  <td style={S.td}><span style={{ color:"#6366f1", fontWeight:700 }}>{u.moduleScore}%</span></td>
                  <td style={S.td}><span style={{ color:"#10b981", fontWeight:700 }}>{u.weeklyScore}%</span></td>
                  <td style={S.td}><span style={{ color:u.growth>=0?"#10b981":"#ef4444", fontWeight:700, background:u.growth>=0?"#d1fae5":"#fee2e2", padding:"2px 8px", borderRadius:20, fontSize:12 }}>{u.growth>=0?"+":""}{u.growth}%</span></td>
                  <td style={S.td}>{u.passed ? <span style={S.badge("#10b981")}>Pass</span> : <span style={S.badge("#ef4444")}>Needs Work</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── ORG REPORTS ──────────────────────────────────────────────────────────────
function OrgReports() {
  const { data, loading, error, refetch } = useAdminData("/admin/org/reports");
  if (loading) return <Spinner text="Loading org reports..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;
  const { summary, completionTrend, featureUsage, batchReports } = data;

  return (
    <div>
      <div style={S.statRow}>
        {[
          { label:"Overall Completion Rate", val: summary.completionRate  + "%", color:"#10b981" },
          { label:"Active Users",            val: summary.activeUsers + "/" + summary.totalUsers, color:"#6366f1" },
          { label:"Avg Score Improvement",   val: "+" + summary.avgImprovement + "%", color:"#8b5cf6" },
          { label:"Total Training Hours",    val: summary.totalTrainingHours + " hrs", color:"#3b82f6" },
        ].map((s,i) => (
          <div key={i} style={S.statCard(s.color)}><div style={S.statVal}>{s.val}</div><div style={S.statLabel}>{s.label}</div></div>
        ))}
      </div>
      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardTitle}>Completion Rate Trend (Monthly)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={completionTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Area type="monotone" dataKey="rate" stroke="#10b981" fill="url(#cg)" strokeWidth={2.5} name="Completion %" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} />
              <Tooltip content={<CT />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Feature Usage Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={featureUsage} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}>
                {featureUsage.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...S.card, gridColumn:"1/-1" }}>
          <div style={S.cardTitle}>Batch-wise Summary Report</div>
          <table style={S.table}>
            <thead><tr>{["Batch","Total Users","Active","Inactive","Adoption Rate","Avg Score","Modules Completed","Certificates","Completion Rate"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {batchReports.map((b,i) => (
                <tr key={i}>
                  <td style={S.td}><strong>{b.batch}</strong></td>
                  <td style={S.td}>{b.total}</td>
                  <td style={S.td}><span style={{ color:"#10b981", fontWeight:700 }}>{b.active}</span></td>
                  <td style={S.td}><span style={{ color:"#ef4444", fontWeight:700 }}>{b.inactive}</span></td>
                  <td style={S.td}><span style={S.badge("#10b981")}>{b.adoptionRate}</span></td>
                  <td style={S.td}><strong>{b.avgScore}</strong></td>
                  <td style={S.td}>{b.modulesCompleted}</td>
                  <td style={S.td}>🏆 {b.certificates}</td>
                  <td style={S.td}><span style={S.badge("#6366f1")}>{b.completionRate}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── POWERBI ──────────────────────────────────────────────────────────────────
function PowerBI() {
  const { data, loading, error, refetch } = useAdminData("/admin/powerbi/kpis");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/admin/reports/export", { responseType:"blob" });
      const url  = URL.createObjectURL(new Blob([res.data], { type:"text/csv" }));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `aiBuddy_report_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Export failed"); }
    finally { setExporting(false); }
  };

  if (loading) return <Spinner text="Loading KPIs..." />;
  if (error)   return <ErrMsg msg={error} onRetry={refetch} />;
  const { kpis, skillTrend, featureUsage, completionTrend, batchReports } = data;

  return (
    <div>
      <div style={{ ...S.card, marginBottom:20, background:"linear-gradient(135deg,#1e1b4b,#312e81)", color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:40 }}>📊</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>PowerBI Executive Dashboard</div>
            <div style={{ fontSize:13, color:"#c7d2fe" }}>Real-time KPIs · Visual analytics · Management insights · ROI monitoring</div>
          </div>
          <button style={{ ...S.btn("#6366f1"), marginLeft:"auto" }} onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "⬇ Export CSV"}
          </button>
        </div>
      </div>

      <div style={{ ...S.kpiGrid, marginBottom:20 }}>
        {kpis.map((k,i) => (
          <div key={i} style={S.kpiCard(k.color)}>
            <div style={S.kpiVal(k.color)}>{k.value}</div>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={S.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardTitle}>Completion Rate Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={completionTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="url(#rg)" strokeWidth={2.5} name="Completion %" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} domain={[0,100]} />
              <Tooltip content={<CT />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Feature Usage Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={featureUsage} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}>
                {featureUsage.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CT />} />
              <Legend wrapperStyle={{ fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ ...S.card, gridColumn:"1/-1" }}>
          <div style={S.cardTitle}>Batch-wise KPI Summary</div>
          <table style={S.table}>
            <thead><tr>{["Batch","Users","Adoption","Avg Score","Modules","Certs","Completion"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {batchReports?.map((b,i) => (
                <tr key={i}>
                  <td style={S.td}><strong>{b.batch}</strong></td>
                  <td style={S.td}>{b.total}</td>
                  <td style={S.td}><span style={S.badge("#10b981")}>{b.adoptionRate}</span></td>
                  <td style={S.td}><strong>{b.avgScore}</strong></td>
                  <td style={S.td}>{b.modulesCompleted}</td>
                  <td style={S.td}>🏆 {b.certificates}</td>
                  <td style={S.td}><span style={S.badge("#6366f1")}>{b.completionRate}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
const NAV = [
  { section:"Overview",    items:[{ id:"overview", label:"Dashboard",    icon:"📊" },{ id:"powerbi", label:"PowerBI KPIs", icon:"📈" }] },
  { section:"Users",       items:[{ id:"users",    label:"User Activity", icon:"👥" },{ id:"progress", label:"Learning Progress", icon:"📚" }] },
  { section:"Performance", items:[{ id:"assessment", label:"Assessments", icon:"🎯" },{ id:"org", label:"Org Reports", icon:"🏢" }] },
];
const TITLES = {
  overview:   { title:"Dashboard Overview",              sub:"Real-time snapshot of all platform activity" },
  users:      { title:"User Activity Tracking",          sub:"Monitor usage, logins, AI tutor sessions, and engagement trends" },
  progress:   { title:"Learning Progress",               sub:"Track module completion, learning paths, and certification status" },
  assessment: { title:"Assessment & Performance",        sub:"Entry, module, and weekly assessment scores with skill tracking" },
  org:        { title:"Organisation-Level Reporting",    sub:"Completion rates, adoption metrics, and batch-wise performance" },
  powerbi:    { title:"PowerBI Executive Dashboard",     sub:"Real-time KPIs, ROI tracking, and management-level insights" },
};

export default function AdminDashboard({ adminUser, onLogout }) {
  const [active, setActive] = useState("overview");
  const { title, sub } = TITLES[active];
  const today = new Date().toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoTop}>VRM AI Technology</div>
          <div style={S.logoName}>AI Buddy</div>
          <span style={S.logoBadge}>Admin Panel</span>
        </div>
        <div style={S.nav}>
          {NAV.map(section => (
            <div key={section.section}>
              <div style={S.navSection}>{section.section}</div>
              {section.items.map(item => (
                <div key={item.id} style={S.navItem(active===item.id)} onClick={() => setActive(item.id)}>
                  <span style={S.navIcon}>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize:11, color:"#818cf8", marginBottom:8 }}>
            <div style={{ fontWeight:700, color:"#c7d2fe", marginBottom:2 }}>
              {adminUser ? `${adminUser.first_name || ''} ${adminUser.last_name || ''}`.trim() || adminUser.username : 'Admin Account'}
            </div>
            <div>{adminUser?.email || 'admin@vrmaitechnology.com'}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(239,68,68,0.15)", color:"#fca5a5", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}
            >
              🚪 Sign Out
            </button>
          )}
        </div>
      </div>

      <div style={S.main}>
        <div style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{title}</h1>
            <div style={S.pageSub}>{sub}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"#94a3b8" }}>{today}</span>
            <span style={{ ...S.badge("#10b981"), display:"flex", alignItems:"center", gap:4 }}><span style={{ fontSize:8 }}>●</span> Live</span>
          </div>
        </div>

        {active === "overview"   && <Overview />}
        {active === "users"      && <UserActivity />}
        {active === "progress"   && <LearningProgress />}
        {active === "assessment" && <Assessments />}
        {active === "org"        && <OrgReports />}
        {active === "powerbi"    && <PowerBI />}
      </div>
    </div>
  );
}