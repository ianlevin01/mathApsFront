import { useState } from "react";
import { setToken } from "./auth";
import { GoogleLogin } from "@react-oauth/google";

const AUTH_BASE = "https://api.mathaps.online";

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

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

  async function handleForgotPassword(e) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${AUTH_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Error ${res.status}`);
      }

      setSuccessMsg(data?.message || "Si el email existe, recibirás un enlace para restablecer tu contraseña.");
      setForgotEmail("");
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
  }

  // ── Vista: Olvidé mi contraseña ──────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <section className="auth">
        <div className="auth-card float-soft">
          <header className="auth-head">
            <h2 className="auth-title">Restablecer contraseña</h2>
            <p className="auth-subtitle">
              Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
            </p>
          </header>

          <form className="auth-form" onSubmit={handleForgotPassword}>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="tuemail@gmail.com"
                required
                autoComplete="email"
              />
            </label>

            {errorMsg && <div className="auth-error">⚠️ {errorMsg}</div>}
            {successMsg && <div className="auth-success">✅ {successMsg}</div>}

            <button className="auth-button" type="submit" disabled={isLoading || !!successMsg}>
              {isLoading ? "Enviando..." : "Enviar enlace"}
            </button>

            <div className="auth-switch">
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("login")}
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  // ── Vista: Login / Register ──────────────────────────────────────────────
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

        {/* Botón de Google */}
        <div className="auth-google-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg("Error al iniciar sesión con Google")}
            width="100%"
            text="continue_with"
            locale="es"
          />
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

          {mode === "login" && (
            <div className="auth-forgot">
              <button
                type="button"
                className="auth-link"
                onClick={() => switchMode("forgot")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

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
                  onClick={() => switchMode("login")}
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
                  onClick={() => switchMode("register")}
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
