import { useState } from "react";
import { setToken } from "./auth";

const AUTH_BASE = "https://mathapsapi.duckdns.org";

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

      // ✅ CASO REGISTER: normalmente NO devuelve token 
      if (mode === "register") {
        setSuccessMsg("Cuenta creada ✅ Ahora iniciá sesión.");
        setMode("login");
        setPassword(""); // opcional
        return;
      }

      // ✅ CASO LOGIN: acá sí esperamos token
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
              : "Entrá para seguir usando MathAI."}
          </p>
        </header>

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
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setMode("login")}
                >
                  Iniciá sesión
                </button>
              </>
            ) : (
              <>
                ¿No tenés cuenta?{" "}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setMode("register")}
                >
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
