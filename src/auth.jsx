import { useState, useRef } from "react";
import { setToken } from "./auth";
import { GoogleLogin } from "@react-oauth/google";

const AUTH_BASE = "https://api.mathaps.online";

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleGoogleSuccess(credentialResponse) {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${AUTH_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);

      setToken(data.token);
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err?.message || "Error con Google");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";

      const res = await fetch(`${AUTH_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Error ${res.status}`);
      }

      if (mode === "register") {
        setSuccessMsg("Cuenta creada ✅ Ahora iniciá sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      const token =
        data?.token ||
        data?.access_token ||
        data?.data?.token ||
        data?.data?.access_token;

      if (!token) {
        console.log("LOGIN response:", data);
        throw new Error("No llegó token del backend (login). Revisá console.log.");
      }

      setToken(token);
      onSuccess?.();
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
          <h2 className="auth-title">
            {mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
          </h2>
          <p className="auth-subtitle">
            {mode === "register"
              ? "Registrate para guardar historial y desbloquear funciones."
              : "Entrá para seguir usando MathAPS."}
          </p>
        </header>

        {/* GoogleLogin oculto + botón custom encima */}
        <div style={{ position: "relative" }}>
          <div style={{ opacity: 0, position: "absolute", inset: 0, zIndex: 1, overflow: "hidden" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg("Error al iniciar sesión con Google")}
              width="400"
              type="standard"
            />
          </div>
          <button
            type="button"
            className="auth-google-btn"
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.4z" fill="#4285F4"/>
              <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.8 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.6v6.1C6.6 42.7 14.7 48 24 48z" fill="#34A853"/>
              <path d="M10.8 28.8A14.5 14.5 0 0 1 10 24c0-1.7.3-3.3.8-4.8v-6.1H2.6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.9l8.2-6.1z" fill="#FBBC04"/>
              <path d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.2 30.5 0 24 0 14.7 0 6.6 5.3 2.6 13.1l8.2 6.1C12.7 13.6 17.9 9.5 24 9.5z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <div className="auth-divider">
          <span>o</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@gmail.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={3}
            />
          </label>

          {errorMsg && <div className="auth-error">⚠️ {errorMsg}</div>}
          {successMsg && <div className="auth-success">✅ {successMsg}</div>}

          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading
              ? "Procesando..."
              : mode === "register"
              ? "Crear cuenta"
              : "Entrar"}
          </button>

          <div className="auth-switch">
            {mode === "register" ? (
              <>
                ¿Ya tenés cuenta?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("login")}>
                  Iniciá sesión
                </button>
              </>
            ) : (
              <>
                ¿No tenés cuenta?{" "}
                <button type="button" className="auth-link" onClick={() => setMode("register")}>
                  Registrate
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}