import './index.css'
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="143316842077-6eeg928nn4t27cfa3lft63cca4pkmn22.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);