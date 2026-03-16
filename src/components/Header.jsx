import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getEmailFromToken } from "../auth";

export default function Header({ isAuthenticated, onLogin, onLogout, sidebarOpen, setSidebarOpen }) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [open, setOpen] = useState(false);
  const dropRef     = useRef(null);
  const email       = isAuthenticated ? getEmailFromToken() : null;
  const initials    = email ? email[0].toUpperCase() : "?";
  const username    = email ? email.split("@")[0] : "";

  const isChat = location.pathname === "/chat" || location.pathname.startsWith("/folder/");

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogoutClick() {
    setOpen(false);
    onLogout();
  }

  function handleAccountClick() {
    setOpen(false);
    navigate("/account");
  }

  return (
    <header className="header">
      <div className="header-inner">

        {/* Hamburguesa — solo visible en /chat y /folder */}
        {isAuthenticated && isChat && setSidebarOpen && (
          <button
            data-tour="hamburger"
            className="hamburger-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle chat history"
            aria-expanded={sidebarOpen}
          >
            <span className={`hamburger-icon ${sidebarOpen ? "open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        )}

        {/* Brand — oculto en mobile cuando estás en chat */}
        <div className={`brand ${isChat ? "brand--hide-mobile" : ""}`}>
          <div className="logo">
            <img
              src="/logo.svg"
              alt="MathAPS"
              className="logo-img"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
          <div className="brand-text">
            <div className="brand-name">MathAPS</div>
            <div className="brand-tagline">AI Math Assistant</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/chat">Chat</Link>
              <Link data-tour="studies" to="/study">Estudios</Link>

              {/* ── User dropdown ── */}
              <div className="nav-auth" ref={dropRef}>
                <button
                  className="nav-user-btn"
                  onClick={() => setOpen(o => !o)}
                  aria-expanded={open}
                >
                  <div className="nav-user-avatar">{initials}</div>
                  <span className="nav-user-name">{username}</span>
                  <svg
                    className={`nav-user-chevron ${open ? "rotated" : ""}`}
                    width="12" height="12" viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {open && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-header">
                      <div className="nav-dropdown-avatar">{initials}</div>
                      <div>
                        <div className="nav-dropdown-name">{username}</div>
                        <div className="nav-dropdown-email">{email}</div>
                      </div>
                    </div>

                    <div className="nav-dropdown-divider" />

                    <button className="nav-dropdown-item" onClick={handleAccountClick}>
                      <span className="nav-dropdown-icon">⚙️</span>
                      Mi cuenta
                    </button>

                    <button className="nav-dropdown-item" onClick={() => { setOpen(false); navigate("/plans"); }}>
                      <span className="nav-dropdown-icon">⚡</span>
                      Ver planes
                    </button>

                    <div className="nav-dropdown-divider" />

                    <button className="nav-dropdown-item nav-dropdown-item--danger" onClick={handleLogoutClick}>
                      <span className="nav-dropdown-icon">🚪</span>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a href="#features">Funciones</a>
              <a href="#plans">Planes</a>
              <div className="nav-auth">
                <button className="nav-btn nav-btn--login" onClick={onLogin}>
                  Iniciar sesión
                </button>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
