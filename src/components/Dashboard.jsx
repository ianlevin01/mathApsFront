import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getEmailFromToken } from "../auth";

const API_BASE = "https://api.mathaps.online";

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ chats: null, folders: null });
  const [lastChat, setLastChat] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = getEmailFromToken();
    if (email) {
      // Extraer nombre del email (antes del @)
      const name = email.split("@")[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const token = getToken?.() || "";
      const email = getEmailFromToken();

      const [chatsRes, foldersRes] = await Promise.all([
        fetch(`${API_BASE}/math/chats?email=${encodeURIComponent(email)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/folder`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      let chatsCount = 0;
      let foldersCount = 0;
      let last = null;

      if (chatsRes.ok) {
        const chats = await chatsRes.json();
        const arr = Array.isArray(chats) ? chats : [];
        chatsCount = arr.length;
        // Último chat: el más reciente
        const sorted = [...arr].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        last = sorted[0] || null;
      }

      if (foldersRes.ok) {
        const folders = await foldersRes.json();
        foldersCount = Array.isArray(folders) ? folders.length : 0;
      }

      setStats({ chats: chatsCount, folders: foldersCount });
      setLastChat(last);
    } catch (err) {
      console.error(err);
      setStats({ chats: 0, folders: 0 });
    } finally {
      setLoading(false);
    }
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }

  return (
    <div className="dashboard">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <div className="dashboard-greeting__text">
          <p className="dashboard-greeting__hello">{getGreeting()}{userName ? `, ${userName}` : ""} 👋</p>
          <h1 className="dashboard-title shine-platinum">¿Qué querés hacer hoy?</h1>
          <p className="dashboard-subtitle">
            Resolvé problemas matemáticos o gestioná tus materiales de estudio
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-item">
          <div className="stat-value">
            {loading ? <span className="stat-loading" /> : stats.chats ?? "—"}
          </div>
          <div className="stat-label">Chats totales</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-value">
            {loading ? <span className="stat-loading" /> : stats.folders ?? "—"}
          </div>
          <div className="stat-label">Carpetas</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-value">—</div>
          <div className="stat-label">Exámenes generados</div>
        </div>
      </div>

      {/* Last chat quick-resume */}
      {lastChat && (
        <div className="dashboard-last-chat" onClick={() => navigate(`/chat?id=${lastChat.chatId || lastChat.id}`)}>
          <div className="dashboard-last-chat__left">
            <div className="dashboard-last-chat__icon">💬</div>
            <div className="dashboard-last-chat__info">
              <span className="dashboard-last-chat__label">Retomar último chat</span>
              <span className="dashboard-last-chat__title">{lastChat.title || "Sin título"}</span>
              {lastChat.createdAt && (
                <span className="dashboard-last-chat__date">
                  {new Date(lastChat.createdAt).toLocaleDateString("es-AR", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          <span className="dashboard-last-chat__arrow">→</span>
        </div>
      )}

      {/* Main cards */}
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card--chat" onClick={() => navigate("/chat")}>
          <div className="dashboard-card__glow" />
          <div className="dashboard-card-icon">📐</div>
          <h2 className="dashboard-card-title">Chat Matemático</h2>
          <p className="dashboard-card-desc">
            Resolvé problemas paso a paso con IA. Gráficos, explicaciones detalladas y exportación a PDF.
          </p>
          <div className="dashboard-card-features">
            <span className="feature-tag">Paso a paso</span>
            <span className="feature-tag">Gráficos</span>
            <span className="feature-tag">Historial</span>
          </div>
          <div className="dashboard-card-arrow">→</div>
        </div>

        <div className="dashboard-card dashboard-card--study" onClick={() => navigate("/study")}>
          <div className="dashboard-card__glow" />
          <div className="dashboard-card-icon">📚</div>
          <h2 className="dashboard-card-title">Mis Estudios</h2>
          <p className="dashboard-card-desc">
            Organizá tus chats en carpetas, practicá con flashcards y seguí tu progreso de aprendizaje.
          </p>
          <div className="dashboard-card-features">
            <span className="feature-tag">Carpetas</span>
            <span className="feature-tag">Flashcards</span>
            <span className="feature-tag">Progreso</span>
          </div>
          <div className="dashboard-card-arrow">→</div>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="dashboard-upgrade-banner" onClick={() => navigate("/plans")}>
        <div className="upgrade-banner-glow" />
        <div className="upgrade-banner-left">
          <div className="upgrade-banner-icon">⚡</div>
          <div className="upgrade-banner-text">
            <span className="upgrade-banner-title">Desbloqueá el plan Premium</span>
            <span className="upgrade-banner-desc">Más mensajes, modelos avanzados, carpetas ilimitadas y exportación PDF</span>
          </div>
        </div>
        <div className="upgrade-banner-actions">
          <span className="upgrade-banner-price">Desde <strong>$4.99/mes</strong></span>
          <button
            className="upgrade-banner-btn"
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate("/plans"); }}
          >
            Ver planes →
          </button>
        </div>
      </div>
    </div>
  );
}
