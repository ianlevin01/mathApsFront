  import { Link, useNavigate } from "react-router-dom";

  export default function Header({ isAuthenticated, onLogin, onLogout }) {
    const navigate = useNavigate();

    return (
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="logo">
              <img
                src="/logo.svg"
                alt="MathAPS"
                className="logo-img"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div className="brand-text">
              <div className="brand-name">MathAPS</div>
              <div className="brand-tagline">AI Math Assistant</div>
            </div>
          </div>

          <nav className="nav">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/chat">Chat</Link>
                <Link to="/study">Estudios</Link>
                <div className="nav-auth">
                  <button className="nav-btn nav-btn--logout" onClick={onLogout}>
                    Cerrar sesión
                  </button>
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
