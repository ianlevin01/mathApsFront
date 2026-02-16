// Funciones para manejo de autenticación con localStorage

/**
 * Obtener el token guardado
 */
export function getToken() {
  return localStorage.getItem("authToken");
}

/**
 * Guardar token en localStorage
 */
export function setToken(token) {
  localStorage.setItem("authToken", token);
}

/**
 * Eliminar token del localStorage (logout)
 */
export function removeToken() {
  localStorage.removeItem("authToken");
}

/**
 * Verificar si hay un token válido
 */
export function isAuthenticated() {
  const token = getToken();
  return !!token;
}

/**
 * Extraer email del token JWT (sin validar firma)
 */
export function getEmailFromToken() {
  const token = getToken();
  if (!token) return "";
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || "";
  } catch (e) {
    console.error("Error decodificando token:", e);
    return "";
  }
}
