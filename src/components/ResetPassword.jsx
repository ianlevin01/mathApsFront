import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const AUTH_BASE = "https://api.mathaps.online";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Si no hay token en la URL, mostramos error directamente
  if (!token) {
    return (
      <section className="auth">
        <div className="auth-card float-soft">
          <header className="auth-head">
            <h2 className="auth-title">Enlace inválido</h2>
            <p className="auth-subtitle">
              Este enlace no es válido o ya expiró. Solicitá uno nuevo desde la pantalla de inicio de sesión.
            </p>
          </header>
          <div className="auth-form">
            <button className="auth-button" onClick={() => navigate("/")}>
              Volver al inicio
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${AUTH_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
      }

      setSuccessMsg("¡Contraseña actualizada! Ya podés iniciar sesión con tu nueva contraseña.");
      setNewPassword("");
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth">
      <div className="auth-card float-soft">
        <header className="auth-head">
          <h2 className="auth-title">Nueva contraseña</h2>
          <p className="auth-subtitle">
            Elegí una contraseña segura de al menos 8 caracteres.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Nueva contraseña
            <div style={{ position: "relative" }}>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "rgba(255,255,255,0.5)",
                  padding: "0",
                  lineHeight: 1,
                }}
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? (
                  // Ojo tachado (ocultar)
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  // Ojo abierto (mostrar)
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </label>

          {errorMsg && <div className="auth-error">⚠️ {errorMsg}</div>}
          {successMsg && <div className="auth-success">✅ {successMsg}</div>}

          {!successMsg ? (
            <button
              className="auth-button"
              type="submit"
              disabled={isLoading || newPassword.length < 8}
            >
              {isLoading ? "Guardando..." : "Cambiar contraseña"}
            </button>
          ) : (
            <button
              className="auth-button"
              type="button"
              onClick={() => navigate("/")}
            >
              Ir a iniciar sesión →
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
