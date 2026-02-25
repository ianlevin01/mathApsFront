import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      setStatus("error");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `https://api.mathaps.online/auth/verify-email?token=${token}&email=${email}`
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Error");
        }

        setStatus("success");

        // 🔥 Redirige después de 3 segundos
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 3000);

      } catch (err) {
        setStatus("error");

        // opcional: también redirigir si hay error
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 4000);
      }
    }

    verify();
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {status === "loading" && (
        <>
          <h2>Verificando email...</h2>
          <p>Un momento por favor.</p>
        </>
      )}

      {status === "success" && (
        <>
          <h2 style={{ color: "green" }}>
            ✅ Cuenta verificada correctamente
          </h2>
          <p>Redirigiendo al inicio...</p>
        </>
      )}

      {status === "error" && (
        <>
          <h2 style={{ color: "red" }}>
            ❌ Error al verificar el email
          </h2>
          <p>Redirigiendo al inicio...</p>
        </>
      )}
    </div>
  );
}