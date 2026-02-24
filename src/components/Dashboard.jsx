import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title shine-platinum">
          ¿Qué querés hacer hoy?
        </h1>
        <p className="dashboard-subtitle">
          Elegí entre resolver problemas matemáticos o gestionar tus materiales de estudio
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Card: Chat Matemático */}
        <div
          className="dashboard-card dashboard-card--chat"
          onClick={() => navigate("/chat")}
        >
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

        {/* Card: Mis Estudios */}
        <div
          className="dashboard-card dashboard-card--study"
          onClick={() => navigate("/study")}
        >
          <div className="dashboard-card-icon">📚</div>
          <h2 className="dashboard-card-title">Mis Estudios</h2>
          <p className="dashboard-card-desc">
            Organizá tus chats en carpetas, generá exámenes y seguí tu progreso de aprendizaje.
          </p>
          <div className="dashboard-card-features">
            <span className="feature-tag">Carpetas</span>
            <span className="feature-tag">Exámenes</span>
            <span className="feature-tag">Progreso</span>
          </div>
          <div className="dashboard-card-arrow">→</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-stats">
        <div className="stat-item">
          <div className="stat-value">—</div>
          <div className="stat-label">Chats totales</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">—</div>
          <div className="stat-label">Carpetas</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">—</div>
          <div className="stat-label">Exámenes generados</div>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="dashboard-upgrade-banner" onClick={() => navigate("/plans")}>
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
