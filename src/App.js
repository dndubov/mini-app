import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import { LayoutList, BarChart2, Users, FileText, Receipt } from "lucide-react";

const API = "https://karate-divisibly-extrovert.ngrok-free.dev/api";
const chatId = "639127846";

const TABS = [
  { id: "shifts",    label: "Смены",     Icon: LayoutList },
  { id: "report",    label: "Отчёт",     Icon: BarChart2  },
  { id: "employees", label: "Команда",   Icon: Users      },
  { id: "documents", label: "Документы", Icon: FileText   },
  { id: "expenses",  label: "Затраты",   Icon: Receipt    },
];

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);

const formatMoneyFull = (amount) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(amount);

export default function App() {
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [shiftTotals, setShiftTotals] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [activeTab, setActiveTab] = useState("shifts");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePayer, setExpensePayer] = useState("Дзюба");
  const [addingExpense, setAddingExpense] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/shifts`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json()),
      fetch(`${API}/users`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json()),
      fetch(`${API}/report/summary`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json()),
    ]).then(async ([s, e, sum]) => {
      const sorted = s.sort((a, b) => new Date(b.date) - new Date(a.date));
      setShifts(sorted);
      setUsers(e);
      setSummary(sum);
      const last10 = sorted.slice(0, 10).reverse();
      const totals = await Promise.all(
        last10.map((sh) =>
          fetch(`${API}/shifts/${sh.id}/earnings`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } })
            .then((r) => r.json())
            .then((data) => ({ date: formatDate(sh.date), total: data.totalAmount || 0 }))
            .catch(() => ({ date: formatDate(sh.date), total: 0 }))
        )
      );
      setShiftTotals(totals);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    });
  }, []);

  const openShift = async (shift) => {
    if (selectedShift?.id === shift.id) { setSelectedShift(null); setEarnings(null); return; }
    setSelectedShift(shift);
    setEarnings(null);
    const data = await fetch(`${API}/shifts/${shift.id}/earnings`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json());
    setEarnings(data);
  };

  useEffect(() => {
    if (activeTab !== "documents") return;
    setDocsLoading(true);
    fetch(`${API}/documents`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } })
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [activeTab]);

  const fetchExpenses = () => {
    setExpensesLoading(true);
    fetch(`${API}/expenses`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } })
      .then((r) => r.json())
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch(() => setExpenses([]))
      .finally(() => setExpensesLoading(false));
  };

  useEffect(() => {
    if (activeTab !== "expenses") return;
    fetchExpenses();
  }, [activeTab]);

  const uploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      await fetch(`${API}/documents/upload`, { method: "POST", headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId }, body: form });
      const data = await fetch(`${API}/documents`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json());
      setDocuments(Array.isArray(data) ? data : []);
    } catch (_) {}
    setUploading(false);
  };

  const syncDocuments = async () => {
    setSyncing(true);
    try {
      await fetch(`${API}/documents/scan`, { method: "POST", headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } });
      const data = await fetch(`${API}/documents`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json());
      setDocuments(Array.isArray(data) ? data : []);
    } catch (_) {}
    setSyncing(false);
  };

  const addExpense = async () => {
    if (!expenseDesc.trim() || !expenseAmount) return;
    setAddingExpense(true);
    try {
      await fetch(`${API}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId },
        body: JSON.stringify({ description: expenseDesc.trim(), amount: parseFloat(expenseAmount), addedBy: expensePayer }),
      });
      setExpenseDesc(""); setExpenseAmount(""); setExpensePayer("Дзюба"); setShowExpenseForm(false);
      fetchExpenses();
    } catch (_) {}
    setAddingExpense(false);
  };

  const deleteExpense = async (id) => {
    try {
      await fetch(`${API}/expenses/${id}`, { method: "DELETE", headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } });
      fetchExpenses();
    } catch (_) {}
  };

  const markPaid = async () => {
    if (!selectedShift) return;
    setPaying(true);
    await fetch(`${API}/shifts/${selectedShift.id}/pay`, { method: "POST", headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } });
    setShifts((prev) => prev.map((s) => (s.id === selectedShift.id ? { ...s, isPaid: true } : s)));
    setSelectedShift({ ...selectedShift, isPaid: true });
    const sum = await fetch(`${API}/report/summary`, { headers: { "ngrok-skip-browser-warning": "true", "X-Telegram-User-Id": chatId } }).then((r) => r.json());
    setSummary(sum);
    setPaying(false);
  };

  const unpaidShifts = shifts.filter((s) => !s.isPaid && s.status === "CLOSED");
  const paidShifts = shifts.filter((s) => s.isPaid && s.status === "CLOSED");
  const closedShifts = shifts.filter((s) => s.status === "CLOSED");
  const paidPercent = closedShifts.length > 0 ? Math.round((paidShifts.length / closedShifts.length) * 100) : 0;
  const totalSummaryPaid = summary.reduce((a, r) => a + r.paid, 0);
  const totalSummaryUnpaid = summary.reduce((a, r) => a + r.unpaid, 0);
  const totalSummaryAll = summary.reduce((a, r) => a + r.total, 0);
  const barData = summary.map((row) => ({ name: row.name.split(" ")[0], оплачено: Math.round(row.paid), неОплачено: Math.round(row.unpaid) }));
  const filteredShifts =
    shiftFilter === "paid" ? shifts.filter((s) => s.isPaid) :
    shiftFilter === "unpaid" ? shifts.filter((s) => !s.isPaid && s.status === "CLOSED") :
    shifts;

  const dt = isDesktop;
  const accent = dt ? "#1d9e75" : "#2AABEE";
  const card = dt
    ? { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12 }
    : { background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14 };
  const textPrimary  = dt ? "#111827" : "#ffffff";
  const textSec      = dt ? "#6b7280" : "#8899aa";
  const textMuted    = dt ? "#9ca3af" : "#556677";
  const gridColor    = dt ? "#f3f4f6" : "#ffffff08";
  const tickColor    = dt ? "#9ca3af" : "#8899aa";
  const divider      = dt ? "#f3f4f6" : "rgba(255,255,255,0.04)";
  const tooltipStyle = { background: dt ? "#fff" : "#1c2333", border: dt ? "1px solid #e5e7eb" : "1px solid rgba(42,171,238,0.3)", borderRadius: 10, fontSize: 12 };
  const inputStyle   = { background: dt ? "#f9fafb" : "rgba(255,255,255,0.07)", border: `1px solid ${dt ? "#e5e7eb" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, padding: "10px 14px", color: textPrimary, fontSize: 14, outline: "none" };
  const primaryBtn   = { background: accent, border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: dt ? "#f9fafb" : "#0f1117" }}>
        <style>{dt ? desktopCss : css}</style>
        <div style={{ width: 36, height: 36, border: `3px solid ${accent}33`, borderTop: `3px solid ${accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: accent, fontSize: 13, marginTop: 16 }}>Загрузка...</div>
      </div>
    );
  }

  const tabContent = (() => {
    if (activeTab === "shifts") return (
      <div className="fade-in">
        {shiftTotals.length > 0 && shiftFilter === "all" && (
          <div style={{ ...card, padding: dt ? "20px 20px 12px" : "14px 12px 8px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Динамика последних {shiftTotals.length} смен
            </div>
            <ResponsiveContainer width="100%" height={dt ? 150 : 90}>
              <LineChart data={shiftTotals} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatMoney(v), "Сумма"]} labelStyle={{ color: textSec }} />
                <Line type="monotone" dataKey="total" stroke={accent} strokeWidth={2} dot={{ fill: accent, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: accent, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {filteredShifts.length === 0 && <div style={{ textAlign: "center", color: textMuted, fontSize: 14, padding: "40px 0" }}>Нет смен в этой категории</div>}
        {filteredShifts.map((shift) => {
          const sa = shift.isPaid ? accent : shift.status === "OPEN" ? "#4CAF50" : "#f59e0b";
          const isActive = selectedShift?.id === shift.id;
          return (
            <div key={shift.id}
              style={{ ...card, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s",
                ...(isActive ? { background: dt ? "#f0fdf9" : "rgba(42,171,238,0.1)", border: `1px solid ${dt ? accent : "rgba(42,171,238,0.35)"}` } : {}) }}
              onClick={() => openShift(shift)} className="card-hover">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: sa }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>Смена #{shift.id} · {formatDate(shift.date)}</div>
                    <div style={{ fontSize: 12, color: textSec, marginTop: 2 }}>{shift.status === "OPEN" ? "Открыта" : shift.isPaid ? "Оплачено" : "Не оплачено"}</div>
                  </div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, background: `${sa}22`, color: sa }}>
                  {shift.isPaid ? "✓" : shift.status === "OPEN" ? "●" : "!"}
                </div>
              </div>
              {isActive && earnings && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${dt ? "#e5e7eb" : "rgba(255,255,255,0.06)"}`, paddingTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 11, color: textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Начисления</div>
                  {earnings.earnings?.map((e, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${divider}` }}>
                      <span style={{ fontSize: 14, color: dt ? "#374151" : "#aabbcc" }}>{e.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>{formatMoneyFull(e.earned)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 700, color: textPrimary }}>
                    <span>Итого</span>
                    <span style={{ color: accent }}>{formatMoneyFull(earnings.totalAmount)}</span>
                  </div>
                  {!shift.isPaid && shift.status === "CLOSED" && (
                    <button style={{ ...primaryBtn, width: "100%", marginTop: 14, padding: "12px 0", opacity: paying ? 0.6 : 1 }} onClick={markPaid} disabled={paying} className="pay-btn">
                      {paying ? "Сохраняю..." : "Отметить оплаченной"}
                    </button>
                  )}
                </div>
              )}
              {isActive && !earnings && <div style={{ marginTop: 12, color: textSec, fontSize: 13, textAlign: "center" }}>Загрузка...</div>}
            </div>
          );
        })}
      </div>
    );

    if (activeTab === "report") return (
      <div className="fade-in">
        {!dt && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { val: formatMoney(totalSummaryAll), label: "Всего", color: textPrimary },
              { val: formatMoney(totalSummaryPaid), label: "Оплачено", color: "#10b981" },
              { val: formatMoney(totalSummaryUnpaid), label: "Не оплачено", color: "#f59e0b" },
            ].map((m) => (
              <div key={m.label} style={{ ...card, padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.val}</div>
                <div style={{ fontSize: 10, color: textSec, marginTop: 3 }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
        {barData.length > 0 && (
          <div style={{ ...card, padding: dt ? "20px 20px 12px" : "14px 12px 8px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Заработок по монтажникам</div>
            <ResponsiveContainer width="100%" height={barData.length * 44 + 20}>
              <BarChart layout="vertical" data={barData} margin={{ top: 4, right: 10, left: 10, bottom: 0 }} barSize={9} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`} />
                <YAxis type="category" dataKey="name" tick={{ fill: dt ? "#374151" : "#aabbcc", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [formatMoney(v), name === "оплачено" ? "Оплачено" : "Не оплачено"]} labelStyle={{ color: textSec }} cursor={false} />
                <Bar dataKey="оплачено" fill="#10b981" radius={[0, 4, 4, 0]} isAnimationActive={false} background={false} />
                <Bar dataKey="неОплачено" fill="#f59e0b" radius={[0, 4, 4, 0]} isAnimationActive={false} background={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div style={{ ...card, overflow: "hidden", overflowX: "auto", marginBottom: 12 }}>
          <div style={{ display: "flex", padding: "10px 8px", borderBottom: `1px solid ${dt ? "#e5e7eb" : "rgba(255,255,255,0.04)"}`, gap: 4, background: dt ? "#f9fafb" : "rgba(42,171,238,0.06)", fontSize: 11, fontWeight: 600, color: textSec, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <div style={{ flex: 1.5, minWidth: 70, textAlign: "left" }}>ФИО</div>
            {["Смен", "Опл.", "Не опл.", "Итого"].map((h) => <div key={h} style={{ flex: 1, fontSize: 10, textAlign: "right", minWidth: 0 }}>{h}</div>)}
          </div>
          {summary.map((row, i) => (
            <div key={i} style={{ display: "flex", padding: "10px 8px", borderBottom: `1px solid ${divider}`, gap: 4, background: i % 2 === 0 ? (dt ? "#fafafa" : "rgba(255,255,255,0.02)") : "transparent" }}>
              <div style={{ flex: 1.5, minWidth: 70, textAlign: "left", fontSize: 10, color: textPrimary, fontWeight: 500 }}>{row.name.split(" ")[0]}</div>
              <div style={{ flex: 1, fontSize: 10, color: textSec, textAlign: "right", minWidth: 0 }}>{row.shiftCount}</div>
              <div style={{ flex: 1, fontSize: 10, color: "#10b981", textAlign: "right", minWidth: 0 }}>{formatMoney(row.paid)}</div>
              <div style={{ flex: 1, fontSize: 10, color: "#f59e0b", textAlign: "right", minWidth: 0 }}>{formatMoney(row.unpaid)}</div>
              <div style={{ flex: 1, fontSize: 10, color: textPrimary, fontWeight: 600, textAlign: "right", minWidth: 0 }}>{formatMoney(row.total)}</div>
            </div>
          ))}
          <div style={{ display: "flex", padding: "10px 8px", gap: 4, background: dt ? "#f9fafb" : "rgba(42,171,238,0.06)", fontSize: 11, fontWeight: 700, color: textPrimary }}>
            <div style={{ flex: 1.5, minWidth: 70, textAlign: "left" }}>ИТОГО</div>
            <div style={{ flex: 1, fontSize: 10, textAlign: "right", minWidth: 0 }}>{summary.reduce((a, r) => a + r.shiftCount, 0)}</div>
            <div style={{ flex: 1, fontSize: 10, color: "#10b981", textAlign: "right", minWidth: 0 }}>{formatMoney(totalSummaryPaid)}</div>
            <div style={{ flex: 1, fontSize: 10, color: "#f59e0b", textAlign: "right", minWidth: 0 }}>{formatMoney(totalSummaryUnpaid)}</div>
            <div style={{ flex: 1, fontSize: 10, color: accent, textAlign: "right", minWidth: 0 }}>{formatMoney(totalSummaryAll)}</div>
          </div>
        </div>
      </div>
    );

    if (activeTab === "documents") return (
      <div className="fade-in">
        <input id="doc-upload" type="file" style={{ display: "none" }} onChange={uploadDocument} />
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button style={{ flex: 1, padding: "13px 0", background: accent, border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
            disabled={uploading} onClick={() => document.getElementById("doc-upload").click()} className="pay-btn">
            {uploading ? "Загружаю..." : "＋ Загрузить документ"}
          </button>
          <button style={{ flexShrink: 0, padding: "13px 14px", background: dt ? "rgba(29,158,117,0.1)" : "rgba(42,171,238,0.15)", border: `1px solid ${accent}66`, borderRadius: 14, color: accent, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: syncing ? 0.6 : 1 }}
            disabled={syncing} onClick={syncDocuments} className="pay-btn">
            {syncing ? "Синхронизация..." : "⟳ Синхронизировать папку"}
          </button>
        </div>
        {docsLoading && <div style={{ textAlign: "center", color: textMuted, fontSize: 14, padding: "40px 0" }}>Загрузка...</div>}
        {!docsLoading && documents.length === 0 && <div style={{ textAlign: "center", color: textMuted, fontSize: 14, padding: "40px 0" }}>Нет загруженных документов</div>}
        {!docsLoading && documents.map((doc) => (
          <div key={doc.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, transition: "all 0.2s" }} className="card-hover">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: dt ? "rgba(29,158,117,0.1)" : "rgba(42,171,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileText size={22} color={accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.fileName || doc.name || `Документ #${doc.id}`}</div>
              <div style={{ fontSize: 11, color: textSec, marginTop: 3 }}>
                {doc.uploadedAt || doc.createdAt ? new Date(doc.uploadedAt || doc.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <a href={`${API}/documents/${doc.id}/download`} target="_blank" rel="noreferrer"
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: dt ? "rgba(29,158,117,0.1)" : "rgba(42,171,238,0.15)", border: `1px solid ${accent}55`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}>↓</a>
          </div>
        ))}
      </div>
    );

    if (activeTab === "employees") return (
      <div className="fade-in">
        {!dt && (
          <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: accent }}>{users.length}</div>
            <div style={{ fontSize: 13, color: textSec, marginTop: 4 }}>монтажников в команде</div>
          </div>
        )}
        {users.map((emp) => (
          <div key={emp.chatId} style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 8, transition: "all 0.2s" }} className="card-hover">
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${dt ? "#16a34a" : "#29B6F6"})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {emp.fullName[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{emp.fullName}</div>
              <div style={{ fontSize: 12, color: textSec, marginTop: 2 }}>{emp.username ? `@${emp.username}` : "без username"} · ID: {emp.chatId}</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: emp.active ? "#4CAF50" : "#ef4444", boxShadow: emp.active ? "0 0 6px #4CAF5088" : "none" }} />
          </div>
        ))}
      </div>
    );

    if (activeTab === "expenses") return (
      <div className="fade-in">
        <button style={{ display: "block", width: "100%", padding: "13px 0", background: accent, border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 14, opacity: showExpenseForm ? 0.6 : 1 }}
          onClick={() => setShowExpenseForm((v) => !v)} className="pay-btn">
          {showExpenseForm ? "Отмена" : "+ Добавить затрату"}
        </button>
        {showExpenseForm && (
          <div style={{ ...card, padding: "14px 16px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <input style={inputStyle} placeholder="Описание" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} />
            <input style={inputStyle} placeholder="Сумма, ₽" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            <select style={inputStyle} value={expensePayer} onChange={(e) => setExpensePayer(e.target.value)}>
              {["Дзюба", "Назначило", "Дубов"].map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button style={{ ...primaryBtn, width: "100%", padding: "12px 0", opacity: addingExpense ? 0.6 : 1 }} onClick={addExpense} disabled={addingExpense} className="pay-btn">
              {addingExpense ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
        )}
        {expensesLoading && <div style={{ textAlign: "center", color: textMuted, fontSize: 14, padding: "40px 0" }}>Загрузка...</div>}
        {!expensesLoading && expenses.length === 0 && <div style={{ textAlign: "center", color: textMuted, fontSize: 14, padding: "40px 0" }}>Нет затрат</div>}
        {!expensesLoading && expenses.map((exp) => (
          <div key={exp.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 8, transition: "all 0.2s" }} className="card-hover">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.description}</div>
              <div style={{ fontSize: 11, color: textSec, marginTop: 3 }}>
                {exp.addedBy && <span style={{ color: accent, marginRight: 6 }}>{exp.addedBy}</span>}
                {exp.createdAt ? new Date(exp.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: accent, flexShrink: 0 }}>{formatMoney(exp.amount)}</div>
            <button style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              onClick={() => deleteExpense(exp.id)} className="pay-btn">✕</button>
          </div>
        ))}
        {!expensesLoading && expenses.length > 0 && (() => {
          const total = expenses.reduce((a, e) => a + (e.amount || 0), 0);
          return (
            <div style={{ ...card, padding: "14px 16px", marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${dt ? "#e5e7eb" : "rgba(255,255,255,0.08)"}` }}>
                <span style={{ fontSize: 13, color: textSec, fontWeight: 600 }}>Итого затрат</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>{formatMoney(total)}</span>
              </div>
              {["Дзюба", "Назначило", "Дубов"].map((name) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${divider}` }}>
                  <span style={{ fontSize: 13, color: dt ? "#374151" : "#aabbcc" }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: accent }}>{formatMoney(total / 3)}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );

    return null;
  })();

  // ---- DESKTOP LAYOUT ----
  if (dt) {
    const metrics = [
      { label: "К выплате",        value: formatMoney(totalSummaryUnpaid), color: "#f59e0b", sub: "задолженность" },
      { label: "Всего заработано",  value: formatMoney(totalSummaryAll),    color: accent,    sub: "за всё время" },
      { label: "Оплачено",          value: formatMoney(totalSummaryPaid),   color: "#10b981", sub: `${paidPercent}% смен` },
      { label: "Всего смен",        value: shifts.length,                   color: "#6366f1", sub: `${unpaidShifts.length} не оплачено` },
    ];
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <style>{desktopCss}</style>
        {/* Sidebar */}
        <div style={{ width: 220, position: "fixed", top: 0, left: 0, height: "100vh", background: "#ffffff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", zIndex: 10 }}>
          <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: accent, letterSpacing: -0.5 }}>TrackFlow</span>
          </div>
          <nav style={{ padding: "12px 10px", flex: 1 }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2, transition: "all 0.15s", fontSize: 14,
                  background: activeTab === id ? "rgba(29,158,117,0.1)" : "transparent",
                  color: activeTab === id ? accent : "#374151",
                  fontWeight: activeTab === id ? 600 : 400,
                }}>
                <Icon size={18} color={activeTab === id ? accent : "#6b7280"} />
                {label}
              </button>
            ))}
          </nav>
        </div>
        {/* Main content */}
        <div style={{ marginLeft: 220, flex: 1, padding: "32px 32px", minHeight: "100vh" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            {/* 4-column metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{m.sub}</div>
                </div>
              ))}
            </div>
            {/* Shift filter pills */}
            {activeTab === "shifts" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[
                  { id: "all",    label: "Все смены",    count: shifts.length },
                  { id: "paid",   label: "Оплачено",     count: paidShifts.length },
                  { id: "unpaid", label: "Не оплачено",  count: unpaidShifts.length },
                ].map((pill) => (
                  <button key={pill.id} onClick={() => setShiftFilter(pill.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: shiftFilter === pill.id ? `1.5px solid ${accent}` : "1px solid #e5e7eb", background: shiftFilter === pill.id ? "rgba(29,158,117,0.08)" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: shiftFilter === pill.id ? 600 : 400, color: shiftFilter === pill.id ? accent : "#374151", transition: "all 0.15s" }}>
                    {pill.label}
                    <span style={{ background: shiftFilter === pill.id ? accent : "#f3f4f6", color: shiftFilter === pill.id ? "#fff" : "#6b7280", borderRadius: 10, padding: "1px 7px", fontSize: 12, fontWeight: 600 }}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {tabContent}
          </div>
        </div>
      </div>
    );
  }

  // ---- MOBILE LAYOUT (unchanged) ----
  return (
    <div style={{ ...styles.app, opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}>
      <style>{css}</style>
      <div style={styles.header}>
        <div style={styles.headerLabel}>К выплате</div>
        <div style={styles.headerAmount}>{formatMoney(totalSummaryUnpaid)}</div>
        <div style={styles.headerSub}>из {formatMoney(totalSummaryAll)} общего заработка</div>
        <div style={styles.progressWrap}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${paidPercent}%` }} />
          </div>
          <div style={styles.progressLabel}>{paidPercent}%</div>
        </div>
      </div>
      <div style={styles.pills}>
        {[
          { id: "all",    icon: "📋", label: "Все смены",   count: shifts.length },
          { id: "paid",   icon: "✅", label: "Оплачено",    count: paidShifts.length },
          { id: "unpaid", icon: "⏳", label: "Не оплачено", count: unpaidShifts.length },
        ].map((pill) => (
          <button key={pill.id}
            style={{ ...styles.pill, ...(shiftFilter === pill.id && activeTab === "shifts" ? styles.pillActive : {}) }}
            onClick={() => { setActiveTab("shifts"); setShiftFilter(pill.id); }}>
            <span style={styles.pillIcon}>{pill.icon}</span>
            <span style={styles.pillLabel}>{pill.label}</span>
            <span style={styles.pillCount}>{pill.count}</span>
          </button>
        ))}
      </div>
      <div style={styles.content}>{tabContent}</div>
      <div style={styles.bottomNav}>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} style={styles.navBtn} onClick={() => setActiveTab(id)}>
            <Icon size={22} color={activeTab === id ? "#2AABEE" : "#556677"} />
            <span style={{ ...styles.navLabel, ...(activeTab === id ? { color: "#2AABEE" } : {}) }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const glass = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const styles = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 },
  header: { textAlign: "center", padding: "36px 24px 20px", background: "linear-gradient(180deg, rgba(42,171,238,0.07) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  headerLabel: { fontSize: 13, color: "#8899aa", fontWeight: 500, letterSpacing: 0.3 },
  headerAmount: { fontSize: 38, fontWeight: 700, color: "#fff", letterSpacing: -1, margin: "6px 0 4px" },
  headerSub: { fontSize: 12, color: "#556677" },
  progressWrap: { display: "flex", alignItems: "center", gap: 10, margin: "18px auto 0", maxWidth: 280 },
  progressBar: { flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #2AABEE, #29B6F6)", borderRadius: 2, transition: "width 1s ease" },
  progressLabel: { fontSize: 11, color: "#8899aa", flexShrink: 0, minWidth: 28 },
  pills: { display: "flex", gap: 8, padding: "14px 16px 6px", overflowX: "auto" },
  pill: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", ...glass, borderRadius: 20, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 },
  pillActive: { background: "rgba(42,171,238,0.18)", border: "1px solid rgba(42,171,238,0.45)", boxShadow: "0 0 12px rgba(42,171,238,0.18)" },
  pillIcon: { fontSize: 14 },
  pillLabel: { fontSize: 13, color: "#aabbcc", fontWeight: 500 },
  pillCount: { fontSize: 13, color: "#fff", fontWeight: 700 },
  content: { padding: "10px 16px" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", background: "rgba(15,17,23,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "8px 0 14px", zIndex: 100 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0", transition: "all 0.2s" },
  navLabel: { fontSize: 11, color: "#556677", fontWeight: 500, transition: "color 0.2s" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1117; }
  .card-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(42,171,238,0.12); border-color: rgba(42,171,238,0.3) !important; }
  .pay-btn:hover { opacity: 0.85 !important; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { display: none; }
`;

const desktopCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f9fafb; }
  .card-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .pay-btn:hover { opacity: 0.85 !important; }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f1f5f9; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;
