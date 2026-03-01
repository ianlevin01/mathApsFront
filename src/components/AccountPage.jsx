import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getEmailFromToken, removeToken } from "../auth";
import "../styles/account.css";

const API_BASE = "http://localhost:3000";

const PLAN_META = {
  free: { label: "Free", color: "#8888aa", badge: "GRATIS", icon: "🔓" },
  plus: { label: "Plus", color: "#7c5cff", badge: "PLUS",   icon: "⚡" },
  pro:  { label: "Pro",  color: "#f0a500", badge: "PRO",    icon: "🚀" },
};

const PLAN_PRICE = { plus: "4.99", pro: "9.99" };

export default function AccountPage({ onLogout }) {
  const navigate = useNavigate();

  /* ── state ── */
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("overview");

  /* password change */
  const [pwForm, setPwForm]       = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  /* cancel modal */
  const [showCancel, setShowCancel]       = useState(false);
  const [cancelReason, setCancelReason]   = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  /* delete modal */
  const [showDelete, setShowDelete]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { fetchUser(); }, []);

  async function fetchUser() {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/auth/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        const email = getEmailFromToken();
        setUser({ email, plan: "free", messagesUsed: 0, messagesLimit: 20, imagesUsed: 0, imagesLimit: 5 });
      }
    } catch {
      const email = getEmailFromToken();
      setUser({ email, plan: "free", messagesUsed: 0, messagesLimit: 20, imagesUsed: 0, imagesLimit: 5 });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(""); setPwSuccess("");

    if (pwForm.next !== pwForm.confirm) { setPwError("Las contraseñas no coinciden."); return; }
    if (pwForm.next.length < 8)         { setPwError("Mínimo 8 caracteres."); return; }

    setPwLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/auth/user/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwSuccess("Contraseña actualizada correctamente.");
        setPwForm({ current: "", next: "", confirm: "" });
      } else {
        setPwError(d?.error || "Error al cambiar la contraseña.");
      }
    } catch {
      setPwError("Error de conexión.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/subscription/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setShowCancel(false);
        setCancelReason("");
        await fetchUser();
      }
    } catch { /* silencioso */ }
    finally { setCancelLoading(false); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.email) return;
    setDeleteLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/user/delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeToken();
        onLogout?.();
        navigate("/");
      }
    } catch { /* silencioso */ }
    finally { setDeleteLoading(false); }
  }

  if (loading) return (
    <div className="account-loading">
      <div className="account-spinner" />
    </div>
  );

  const plan     = user?.plan || "free";
  const planMeta = PLAN_META[plan] || PLAN_META.free;

  const msgPct = user?.messagesLimit
    ? Math.min(100, Math.round((user.messagesUsed / user.messagesLimit) * 100))
    : 0;

  const imgPct = user?.imagesLimit
    ? Math.min(100, Math.round((user.imagesUsed / user.imagesLimit) * 100))
    : 0;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="account-page">

      {/* ── SIDEBAR ── */}
      <aside className="account-sidebar">
        <button className="account-back" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>

        <div className="account-avatar-wrap">
          <div className="account-avatar">
            {(user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="account-avatar-info">
            <span className="account-avatar-name">{user?.email?.split("@")[0]}</span>
            <span className="account-avatar-plan" style={{ color: planMeta.color }}>
              {planMeta.icon} Plan {planMeta.label}
            </span>
          </div>
        </div>

        <nav className="account-nav">
          {[
            { id: "overview", icon: "◈", label: "Resumen" },
            { id: "billing",  icon: "◉", label: "Suscripción" },
            { id: "security", icon: "◎", label: "Seguridad" },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              className={`account-nav-item ${section === id ? "active" : ""}`}
              onClick={() => setSection(id)}
            >
              <span className="account-nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <button
          className="account-logout-btn"
          onClick={() => { removeToken(); onLogout?.(); navigate("/"); }}
        >
          Cerrar sesión
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="account-main">

        {/* ═══════════ OVERVIEW ═══════════ */}
        {section === "overview" && (
          <div className="account-section">
            <h1 className="account-section-title">Mi cuenta</h1>

            {/* Info personal */}
            <div className="acc-card">
              <div className="acc-card-header">
                <span className="acc-card-icon">👤</span>
                <h2>Información personal</h2>
              </div>
              <div className="acc-field-row">
                <span className="acc-field-label">Email</span>
                <span className="acc-field-value">{user?.email}</span>
              </div>
              <div className="acc-field-row">
                <span className="acc-field-label">Usuario</span>
                <span className="acc-field-value">{user?.email?.split("@")[0]}</span>
              </div>
              <div className="acc-field-row">
                <span className="acc-field-label">Miembro desde</span>
                <span className="acc-field-value">{formatDate(user?.createdAt)}</span>
              </div>
              <div className="acc-field-row">
                <span className="acc-field-label">Email verificado</span>
                <span className="acc-field-value">
                  {user?.isVerified
                    ? <span style={{ color: "#6ee7a0" }}>✓ Verificado</span>
                    : <span style={{ color: "#ff9090" }}>✗ Sin verificar</span>}
                </span>
              </div>
              {user?.isGoogleUser && (
                <div className="acc-field-row">
                  <span className="acc-field-label">Tipo de cuenta</span>
                  <span className="acc-field-value">🔵 Google</span>
                </div>
              )}
            </div>

            {/* Uso diario */}
            <div className="acc-card">
              <div className="acc-card-header">
                <span className="acc-card-icon">📊</span>
                <h2>Uso de hoy</h2>
                {user?.lastDailyReset && (
                  <span className="acc-muted" style={{ fontSize: "11px", marginLeft: "auto" }}>
                    Reinicio: {user.lastDailyReset}
                  </span>
                )}
              </div>

              <div className="acc-usage-row">
                <div className="acc-usage-label-row">
                  <span>Mensajes con IA</span>
                  <span className="acc-usage-count">
                    <strong>{user?.messagesUsed ?? 0}</strong> / {user?.messagesLimit ?? 0}
                  </span>
                </div>
                <div className="acc-progress-track">
                  <div
                    className={`acc-progress-bar ${msgPct >= 90 ? "danger" : msgPct >= 70 ? "warning" : ""}`}
                    style={{ width: `${msgPct}%` }}
                  />
                </div>
                <span className="acc-usage-hint">{msgPct}% utilizado hoy</span>
              </div>

              <div className="acc-usage-row" style={{ marginTop: "12px" }}>
                <div className="acc-usage-label-row">
                  <span>Imágenes procesadas</span>
                  <span className="acc-usage-count">
                    <strong>{user?.imagesUsed ?? 0}</strong> / {user?.imagesLimit ?? 0}
                  </span>
                </div>
                <div className="acc-progress-track">
                  <div
                    className={`acc-progress-bar ${imgPct >= 90 ? "danger" : imgPct >= 70 ? "warning" : ""}`}
                    style={{ width: `${imgPct}%` }}
                  />
                </div>
                <span className="acc-usage-hint">{imgPct}% utilizado hoy</span>
              </div>
            </div>

            {/* Plan summary */}
            <div className="acc-card acc-card--plan" style={{ "--plan-color": planMeta.color }}>
              <div className="acc-card-header">
                <span className="acc-card-icon">{planMeta.icon}</span>
                <h2>Plan actual</h2>
                <span
                  className="acc-plan-badge"
                  style={{
                    background: planMeta.color + "22",
                    color: planMeta.color,
                    border: `1px solid ${planMeta.color}44`,
                  }}
                >
                  {planMeta.badge}
                </span>
              </div>
              {plan === "free" ? (
                <div className="acc-upgrade-prompt">
                  <p>Estás en el plan gratuito. Desbloqueá más mensajes e imágenes con Premium.</p>
                  <button className="acc-btn acc-btn--primary" onClick={() => navigate("/plans")}>
                    Ver planes →
                  </button>
                </div>
              ) : (
                <>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Próximo cobro</span>
                    <span className="acc-field-value acc-field-value--highlight">{formatDate(user?.nextBillingDate)}</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Monto</span>
                    <span className="acc-field-value">${PLAN_PRICE[plan] ?? "—"}/mes</span>
                  </div>
                  <button className="acc-btn acc-btn--ghost" onClick={() => setSection("billing")}>
                    Gestionar suscripción →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ BILLING ═══════════ */}
        {section === "billing" && (
          <div className="account-section">
            <h1 className="account-section-title">Suscripción y facturación</h1>

            {plan === "free" ? (
              <div className="acc-card">
                <div className="acc-card-header">
                  <span className="acc-card-icon">🔓</span>
                  <h2>Plan gratuito</h2>
                </div>
                <p className="acc-muted">No tenés ninguna suscripción activa.</p>
                <button className="acc-btn acc-btn--primary" onClick={() => navigate("/plans")}>
                  Actualizar a Premium →
                </button>
              </div>
            ) : (
              <>
                <div className="acc-card">
                  <div className="acc-card-header">
                    <span className="acc-card-icon">{planMeta.icon}</span>
                    <h2>Plan {planMeta.label}</h2>
                    <span className="acc-status-chip acc-status-chip--active">Activo</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Precio</span>
                    <span className="acc-field-value">${PLAN_PRICE[plan] ?? "—"} / mes</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Último pago</span>
                    <span className="acc-field-value">{formatDate(user?.lastPaymentDate)}</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Próximo cobro</span>
                    <span className="acc-field-value acc-field-value--highlight">{formatDate(user?.nextBillingDate)}</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Mensajes diarios</span>
                    <span className="acc-field-value">{user?.messagesLimit} / día</span>
                  </div>
                  <div className="acc-field-row">
                    <span className="acc-field-label">Imágenes diarias</span>
                    <span className="acc-field-value">{user?.imagesLimit} / día</span>
                  </div>
                </div>

                <div className="acc-card acc-card--danger">
                  <div className="acc-card-header">
                    <span className="acc-card-icon">⚠️</span>
                    <h2>Cancelar suscripción</h2>
                  </div>
                  <p className="acc-muted">
                    Si cancelás, mantenés el acceso hasta el{" "}
                    <strong>{formatDate(user?.nextBillingDate)}</strong>.
                    Después volvés al plan gratuito.
                  </p>
                  <div className="acc-danger-perks">
                    <span>Perdés: {user?.messagesLimit} mensajes/día</span>
                    <span>Perdés: {user?.imagesLimit} imágenes/día</span>
                    <span>Perdés: modelos avanzados</span>
                  </div>
                  <button className="acc-btn acc-btn--danger" onClick={() => setShowCancel(true)}>
                    Cancelar suscripción
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════ SECURITY ═══════════ */}
        {section === "security" && (
          <div className="account-section">
            <h1 className="account-section-title">Seguridad</h1>

            {user?.isGoogleUser ? (
              <div className="acc-card">
                <div className="acc-card-header">
                  <span className="acc-card-icon">🔵</span>
                  <h2>Cuenta de Google</h2>
                </div>
                <p className="acc-muted">
                  Tu cuenta está vinculada a Google. No podés cambiar la contraseña desde acá.
                </p>
              </div>
            ) : (
              <div className="acc-card">
                <div className="acc-card-header">
                  <span className="acc-card-icon">🔑</span>
                  <h2>Cambiar contraseña</h2>
                </div>
                <form className="acc-form" onSubmit={handleChangePassword}>
                  <label className="acc-label">
                    Contraseña actual
                    <input
                      type="password"
                      className="acc-input"
                      value={pwForm.current}
                      onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                      placeholder="••••••••"
                      required
                    />
                  </label>
                  <label className="acc-label">
                    Nueva contraseña
                    <input
                      type="password"
                      className="acc-input"
                      value={pwForm.next}
                      onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </label>
                  <label className="acc-label">
                    Confirmar nueva contraseña
                    <input
                      type="password"
                      className="acc-input"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repetí la contraseña"
                      required
                    />
                  </label>
                  {pwError   && <div className="acc-alert acc-alert--error">{pwError}</div>}
                  {pwSuccess && <div className="acc-alert acc-alert--success">{pwSuccess}</div>}
                  <button type="submit" className="acc-btn acc-btn--primary" disabled={pwLoading}>
                    {pwLoading ? "Guardando..." : "Cambiar contraseña"}
                  </button>
                </form>
              </div>
            )}

            <div className="acc-card">
              <div className="acc-card-header">
                <span className="acc-card-icon">📱</span>
                <h2>Sesión activa</h2>
              </div>
              <div className="acc-session-item">
                <div className="acc-session-icon">🖥️</div>
                <div className="acc-session-info">
                  <span className="acc-session-device">Navegador web</span>
                  <span className="acc-muted" style={{ fontSize: "12px" }}>Sesión actual</span>
                </div>
                <span className="acc-status-chip acc-status-chip--active">Activa</span>
              </div>
            </div>

            <div className="acc-card acc-card--danger">
              <div className="acc-card-header">
                <span className="acc-card-icon">🗑️</span>
                <h2>Eliminar cuenta</h2>
              </div>
              <p className="acc-muted">
                Esta acción es <strong>irreversible</strong>. Se borrarán todos tus chats, carpetas, flashcards y datos.
              </p>
              <button className="acc-btn acc-btn--danger" onClick={() => setShowDelete(true)}>
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══════ MODAL: CANCELAR ══════ */}
      {showCancel && (
        <div className="acc-modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="acc-modal" onClick={e => e.stopPropagation()}>
            <button className="acc-modal-close" onClick={() => setShowCancel(false)}>✕</button>
            <div className="acc-modal-icon">😔</div>
            <h2 className="acc-modal-title">¿Cancelar suscripción?</h2>
            <p className="acc-modal-desc">
              Seguís teniendo acceso hasta el{" "}
              <strong>{formatDate(user?.nextBillingDate)}</strong>.
              Después volvés al plan Free.
            </p>
            <div className="acc-modal-perks">
              {[
                `${user?.messagesLimit} mensajes/día`,
                `${user?.imagesLimit} imágenes/día`,
                "Modelos avanzados",
                "Soporte prioritario",
              ].map(f => (
                <div key={f} className="acc-perk-lost">✗ {f}</div>
              ))}
            </div>
            <label className="acc-label" style={{ marginTop: "16px" }}>
              ¿Por qué cancelás? <span className="acc-muted">(opcional)</span>
              <select
                className="acc-input"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              >
                <option value="">Prefiero no decir</option>
                <option value="price">Es muy caro</option>
                <option value="features">No uso todas las funciones</option>
                <option value="bugs">Tuve problemas técnicos</option>
                <option value="other">Otro</option>
              </select>
            </label>
            <div className="acc-modal-actions">
              <button className="acc-btn acc-btn--ghost" onClick={() => setShowCancel(false)}>
                No, mantener plan
              </button>
              <button
                className="acc-btn acc-btn--danger"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Procesando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL: ELIMINAR ══════ */}
      {showDelete && (
        <div className="acc-modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="acc-modal" onClick={e => e.stopPropagation()}>
            <button className="acc-modal-close" onClick={() => setShowDelete(false)}>✕</button>
            <div className="acc-modal-icon">⚠️</div>
            <h2 className="acc-modal-title">Eliminar cuenta permanentemente</h2>
            <p className="acc-modal-desc">
              Se borrarán todos tus datos. Para confirmar, escribí tu email:
              <br /><strong>{user?.email}</strong>
            </p>
            <input
              type="email"
              className="acc-input"
              style={{ marginTop: "12px" }}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={user?.email}
            />
            <div className="acc-modal-actions">
              <button className="acc-btn acc-btn--ghost" onClick={() => setShowDelete(false)}>
                Cancelar
              </button>
              <button
                className="acc-btn acc-btn--danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user?.email || deleteLoading}
              >
                {deleteLoading ? "Eliminando..." : "Eliminar cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
