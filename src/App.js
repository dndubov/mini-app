import { useState, useEffect } from "react";

const API = "http://localhost:8080/api";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);

export default function App() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [activeTab, setActiveTab] = useState("shifts");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/shifts`).then((r) => r.json()),
      fetch(`${API}/employees`).then((r) => r.json()),
    ]).then(([s, e]) => {
      setShifts(s.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setEmployees(e);
      setLoading(false);
    });
  }, []);

  const openShift = async (shift) => {
    setSelectedShift(shift);
    setEarnings(null);
    const data = await fetch(`${API}/shifts/${shift.id}/earnings`).then((r) => r.json());
    setEarnings(data);
  };

  const markPaid = async () => {
    if (!selectedShift) return;
    setPaying(true);
    await fetch(`${API}/shifts/${selectedShift.id}/pay`, { method: "POST" });
    const updated = shifts.map((s) => (s.id === selectedShift.id ? { ...s, isPaid: true } : s));
    setShifts(updated);
    setSelectedShift({ ...selectedShift, isPaid: true });
    setPaying(false);
  };

  const unpaidShifts = shifts.filter((s) => !s.isPaid && s.status === "CLOSED");
  const paidShifts = shifts.filter((s) => s.isPaid);
  const totalUnpaid = unpaidShifts.length;

  if (loading) {
    return (
      <div style={styles.loader}>
        <div style={styles.loaderDot} />
        <div style={{ ...styles.loaderDot, animationDelay: "0.2s" }} />
        <div style={{ ...styles.loaderDot, animationDelay: "0.4s" }} />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{css}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Учёт работ</div>
          <div style={styles.headerSub}>Монтажная бригада</div>
        </div>
        <div style={styles.badge}>{totalUnpaid} не оплачено</div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{shifts.length}</div>
          <div style={styles.statLabel}>Всего смен</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: "#f59e0b" }}>{totalUnpaid}</div>
          <div style={styles.statLabel}>Не оплачено</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: "#10b981" }}>{paidShifts.length}</div>
          <div style={styles.statLabel}>Оплачено</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: "#6366f1" }}>{employees.length}</div>
          <div style={styles.statLabel}>Монтажников</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {["shifts", "employees"].map((tab) => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "shifts" ? "Смены" : "Монтажники"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === "shifts" && (
          <div>
            {shifts.map((shift) => (
              <div
                key={shift.id}
                style={{
                  ...styles.shiftCard,
                  ...(selectedShift?.id === shift.id ? styles.shiftCardActive : {}),
                  borderLeft: `4px solid ${shift.isPaid ? "#10b981" : shift.status === "OPEN" ? "#6366f1" : "#f59e0b"}`,
                }}
                onClick={() => openShift(shift)}
                className="shift-card"
              >
                <div style={styles.shiftRow}>
                  <div>
                    <div style={styles.shiftDate}>#{shift.id} · {formatDate(shift.date)}</div>
                    <div style={styles.shiftStatus}>
                      {shift.status === "OPEN" ? "🟢 Открыта" : shift.isPaid ? "✅ Оплачено" : "🟡 Не оплачено"}
                    </div>
                  </div>
                  <div style={styles.arrow}>›</div>
                </div>

                {selectedShift?.id === shift.id && earnings && (
                  <div style={styles.earningsPanel} onClick={(e) => e.stopPropagation()}>
                    <div style={styles.earningsTitle}>Начисления</div>
                    {earnings.earnings?.map((e, i) => (
                      <div key={i} style={styles.earningRow}>
                        <span style={styles.earningName}>{e.name}</span>
                        <span style={styles.earningAmount}>{formatMoney(e.earned)}</span>
                      </div>
                    ))}
                    <div style={styles.earningTotal}>
                      <span>Итого</span>
                      <span>{formatMoney(earnings.totalAmount)}</span>
                    </div>
                    {!shift.isPaid && shift.status === "CLOSED" && (
                      <button
                        style={{ ...styles.payBtn, opacity: paying ? 0.6 : 1 }}
                        onClick={markPaid}
                        disabled={paying}
                      >
                        {paying ? "Сохраняю..." : "✅ Отметить оплаченной"}
                      </button>
                    )}
                  </div>
                )}

                {selectedShift?.id === shift.id && !earnings && (
                  <div style={styles.earningsLoading}>Загрузка...</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "employees" && (
          <div>
            {employees.map((emp) => (
              <div key={emp.chatId} style={styles.empCard}>
                <div style={styles.empAvatar}>{emp.fullName[0]}</div>
                <div>
                  <div style={styles.empName}>{emp.fullName}</div>
                  <div style={styles.empMeta}>
                    {emp.username ? `@${emp.username}` : "без username"} · ID: {emp.chatId}
                  </div>
                  <div style={{ ...styles.empStatus, color: emp.active ? "#10b981" : "#ef4444" }}>
                    {emp.active ? "Активен" : "Заблокирован"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#0f0f13", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", paddingBottom: 32 },
  loader: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", gap: 8, background: "#0f0f13" },
  loaderDot: { width: 10, height: 10, borderRadius: "50%", background: "#6366f1", animation: "bounce 0.8s infinite" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 20px 16px", borderBottom: "1px solid #1e1e2e" },
  headerTitle: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  badge: { background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 },
  stats: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "16px 20px" },
  statCard: { background: "#1a1a24", borderRadius: 12, padding: "12px 8px", textAlign: "center" },
  statNum: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  statLabel: { fontSize: 10, color: "#64748b", marginTop: 2 },
  tabs: { display: "flex", margin: "0 20px", background: "#1a1a24", borderRadius: 10, padding: 4, gap: 4 },
  tab: { flex: 1, padding: "8px 0", border: "none", borderRadius: 8, background: "transparent", color: "#64748b", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" },
  tabActive: { background: "#6366f1", color: "#fff" },
  content: { padding: "16px 20px" },
  shiftCard: { background: "#1a1a24", borderRadius: 12, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s", borderLeft: "4px solid #f59e0b" },
  shiftCardActive: { background: "#1e1e2e" },
  shiftRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  shiftDate: { fontSize: 15, fontWeight: 600, color: "#f1f5f9" },
  shiftStatus: { fontSize: 12, color: "#94a3b8", marginTop: 3 },
  arrow: { color: "#64748b", fontSize: 20 },
  earningsPanel: { marginTop: 14, borderTop: "1px solid #2a2a3e", paddingTop: 12 },
  earningsTitle: { fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  earningRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e1e2e" },
  earningName: { fontSize: 14, color: "#cbd5e1" },
  earningAmount: { fontSize: 14, fontWeight: 600, color: "#f1f5f9" },
  earningTotal: { display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15, fontWeight: 700, color: "#f1f5f9" },
  earningsLoading: { marginTop: 12, color: "#64748b", fontSize: 13, textAlign: "center" },
  payBtn: { width: "100%", marginTop: 14, padding: "10px 0", background: "#10b981", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  empCard: { display: "flex", alignItems: "center", gap: 14, background: "#1a1a24", borderRadius: 12, padding: "14px 16px", marginBottom: 8 },
  empAvatar: { width: 44, height: 44, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 },
  empName: { fontSize: 15, fontWeight: 600, color: "#f1f5f9" },
  empMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  empStatus: { fontSize: 12, marginTop: 3, fontWeight: 500 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f0f13; }
  .shift-card:hover { transform: translateX(2px); }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
`;
