# MathAPS Frontend - Implementación completa

## 📦 Archivos nuevos creados

### Componentes principales:
- `components/Dashboard.jsx` → Vista principal post-login
- `components/ChatView.jsx` → Interfaz de chat con sidebar de historial
- `components/StudyHub.jsx` → Hub de estudios (carpetas, exámenes, progreso)
- `components/Header.jsx` → Header actualizado con navegación

### Utilidades:
- `utils/mathUtils.js` → Normalización de expresiones matemáticas
- `utils/plotInterpreter.js` → Interpretador de gráficos (código de Calculator.jsx)

### Estilos:
- `styles/dashboard.css` → Estilos del Dashboard
- `styles/chat.css` → Estilos del ChatView
- `styles/study.css` → Estilos del StudyHub

### App principal:
- `App.jsx` → Router principal con rutas protegidas

---

## 🚀 Instalación

### 1. Instalar dependencias adicionales:

```bash
npm install react-router-dom
```

### 2. Estructura de carpetas recomendada:

```
src/
├── components/
│   ├── Header.jsx          ← NUEVO
│   ├── Login.jsx           ← YA EXISTE
│   ├── Dashboard.jsx       ← NUEVO
│   ├── ChatView.jsx        ← NUEVO
│   └── StudyHub.jsx        ← NUEVO
├── utils/
│   ├── mathUtils.js        ← NUEVO
│   └── plotInterpreter.js  ← NUEVO
├── styles/
│   ├── dashboard.css       ← NUEVO
│   ├── chat.css            ← NUEVO
│   └── study.css           ← NUEVO
├── App.jsx                 ← REEMPLAZAR
├── App.css                 ← YA EXISTE
├── index.css               ← YA EXISTE
├── auth.js                 ← YA EXISTE
└── main.jsx                ← YA EXISTE
```

### 3. Mover archivos:

Copia los archivos que generé a sus respectivas ubicaciones:

```bash
# Desde /home/claude/ mover a src/
mv Dashboard.jsx src/components/
mv ChatView.jsx src/components/
mv StudyHub.jsx src/components/
mv App.jsx src/

# Crear carpetas si no existen
mkdir -p src/utils src/styles

# Mover utilidades
mv utils/mathUtils.js src/utils/
mv utils/plotInterpreter.js src/utils/

# Mover estilos
mv styles/dashboard.css src/styles/
mv styles/chat.css src/styles/
mv styles/study.css src/styles/

# Header
mv components/Header.jsx src/components/
```

---

## 🔧 Configuración del auth.js

Asegúrate de que tu `auth.js` tenga estas funciones:

```javascript
export function getToken() {
  return localStorage.getItem("authToken");
}

export function setToken(token) {
  localStorage.setItem("authToken", token);
}

export function removeToken() {
  localStorage.removeItem("authToken");
}
```

---

## 📱 Rutas de la aplicación

- `/` → Landing page (pública)
- `/dashboard` → Dashboard principal (protegida)
- `/chat` → Vista de chat matemático (protegida)
- `/study` → Hub de estudios (protegida)

---

## 🎨 Flujo de usuario

1. **Sin login**: Usuario ve landing page con botón "Iniciar sesión"
2. **Login exitoso**: Redirección automática a `/dashboard`
3. **Dashboard**: 2 cards grandes → "Chat Matemático" y "Mis Estudios"
4. **Chat**: 
   - Sidebar izquierdo con historial
   - Área de chat central
   - Input abajo con soporte para imágenes
5. **Estudios**:
   - Tab "Carpetas" → Crear carpetas, asignar chats, generar exámenes
   - Tab "Progreso" → Estadísticas visuales

---

## 🔒 Middleware de autenticación

El backend debe agregar este middleware a las rutas protegidas:

```javascript
// Ejemplo de authMiddleware.js
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return res.status(401).json({ error: "NO_TOKEN" });
  }
  
  try {
    // Verificar token (JWT decode, etc)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { email: "..." }
    next();
  } catch (err) {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
};
```

Aplicar a rutas:
```javascript
router.get("/chats", authMiddleware, async (req, res) => { ... });
router.post("/", authMiddleware, async (req, res) => { ... });
// etc.
```

---

## 📝 Notas importantes

### Corrección en math-routes.js:

La ruta `POST /math` debe recibir el email desde `req.user.email` (del middleware), NO del body:

```javascript
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  const email = req.user.email; // ← Desde el token
  const problem = req.body.problem;
  // ...
});
```

### Endpoint GET /math/chats:

Cambiar de query param a header:

```javascript
router.get("/chats", authMiddleware, async (req, res) => {
  const email = req.user.email; // ← Desde el token, no query
  // ...
});
```

---

## 🐛 Debugging

### Si no se ven los chats:
1. Verificar que el token se esté enviando en headers: `Authorization: Bearer TOKEN`
2. Revisar que el backend esté devolviendo `chatId`, `title`, `createdAt` en cada chat
3. Console log en `loadChats()` de ChatView.jsx

### Si los gráficos no se muestran:
1. Verificar que `plotSpec` llegue correctamente desde el backend
2. Console log en `interpretPlot()` para ver errores de compilación

### Si las carpetas no se crean:
1. Verificar que el backend devuelva el objeto de carpeta con `id` y `name`
2. Revisar que el token sea válido

---

## ✅ Checklist de implementación

- [ ] Instalar `react-router-dom`
- [ ] Mover todos los archivos a sus carpetas
- [ ] Actualizar imports en `main.jsx` (debe importar el nuevo `App.jsx`)
- [ ] Verificar que el backend tenga `authMiddleware` en todas las rutas protegidas
- [ ] Corregir `POST /math` para usar `req.user.email`
- [ ] Corregir `GET /math/chats` para usar `req.user.email`
- [ ] Probar flujo completo: login → dashboard → chat → study

---

## 🎯 Mejoras futuras sugeridas

1. **Flashcards**: Agregar sistema de tarjetas de estudio
2. **Progress tracking**: Gráficos de actividad con Chart.js o Recharts
3. **Chat sharing**: Compartir chats por link
4. **Export markdown**: Descargar conversaciones como .md
5. **Dark/Light mode**: Toggle de tema
6. **Mobile optimization**: Mejorar experiencia móvil

---

¿Alguna duda? ¡Arrancá con la implementación y avisame si necesitás ayuda! 🚀
