import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { getToken, getEmailFromToken } from "../auth";
import { normalizeMath } from "../utils/mathUtils";
import { interpretPlot } from "../utils/plotInterpreter";
import OnboardingTour from "./OnboardingTour";
import PlanLimitModal from "./PlanLimitModal";
import MathKeyboard from "./MathKeyboard";

const API_URL = "https://api.mathaps.online/math/";
const API_BASE = "https://api.mathaps.online";
const MAX_CHARS = 2000;
const FREE_FOLDERS_LIMIT = 3;

function ModelSelector({ models, selectedKey, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.key === selectedKey) || models.find((m) => m.available) || models[0];
  if (!selected || models.length <= 1) return null;
  return (
    <div data-tour="model-selector" className="model-selector">
      <button className="model-selector__trigger" onClick={() => setOpen((v) => !v)} title="Cambiar modelo">
        <span className="model-selector__name">{selected.displayName}</span>
        {selected.cost > 1 && <span className="model-selector__cost">×{selected.cost}</span>}
        <span className="model-selector__chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="model-selector__dropdown">
          {models.map((m) => (
            <button key={m.key}
              className={`model-selector__option ${m.key === selectedKey ? "active" : ""} ${!m.available ? "locked" : ""}`}
              onClick={() => { if (!m.available) return; onChange(m.key); setOpen(false); }}
              disabled={!m.available}
              title={!m.available ? "No disponible en tu plan actual" : undefined}
            >
              <div className="model-selector__option-left">
                <span className="model-selector__option-name">
                  {!m.available && <span className="model-selector__lock-icon">🔒</span>}
                  <span style={{ textDecoration: m.available ? "none" : "line-through", opacity: m.available ? 1 : 0.5 }}>{m.displayName}</span>
                </span>
                <span className="model-selector__option-desc" style={{ opacity: m.available ? 1 : 0.4 }}>
                  {m.available ? m.description : "Requiere un plan superior"}
                </span>
              </div>
              <div className="model-selector__option-right">
                {m.cost > 1 && <span className="model-selector__option-cost" style={{ opacity: m.available ? 1 : 0.4 }}>×{m.cost} msgs</span>}
                {!m.available && <span className="model-selector__upgrade-badge">⚡ Subir plan</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderNudge({ suggestion, folders, onAssignExisting, onCreateNew, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const matchedFolder = suggestion.isExisting ? folders.find((f) => f.name === suggestion.folderName) : null;
  if (suggestion.isExisting && matchedFolder) {
    return (
      <div className="folder-nudge folder-nudge--assign">
        <div className="folder-nudge__icon">📂</div>
        <div className="folder-nudge__body">
          <p className="folder-nudge__text">¿Guardamos esto en <strong>"{matchedFolder.name}"</strong>?</p>
          <p className="folder-nudge__sub">Parece que encaja con esa carpeta</p>
          <div className="folder-nudge__actions">
            <button className="folder-nudge__btn folder-nudge__btn--primary" disabled={busy}
              onClick={async () => { setBusy(true); await onAssignExisting(matchedFolder.id); setBusy(false); }}>
              {busy ? "Guardando…" : `Sí, guardar ahí`}
            </button>
            <button className="folder-nudge__btn folder-nudge__btn--ghost" onClick={onDismiss}>No por ahora</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="folder-nudge folder-nudge--create">
      <div className="folder-nudge__icon">📁</div>
      <div className="folder-nudge__body">
        <p className="folder-nudge__text">¿Guardamos esto en una carpeta?</p>
        <p className="folder-nudge__sub">Te sugerimos crear <strong>"{suggestion.folderName}"</strong></p>
        <div className="folder-nudge__actions">
          <button className="folder-nudge__btn folder-nudge__btn--primary" disabled={busy}
            onClick={async () => { setBusy(true); await onCreateNew(suggestion.folderName); setBusy(false); }}>
            {busy ? "Creando…" : `+ Crear "${suggestion.folderName}"`}
          </button>
          <button className="folder-nudge__btn folder-nudge__btn--ghost" onClick={onDismiss}>Ahora no</button>
        </div>
      </div>
    </div>
  );
}

export default function ChatView({ sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [folders, setFolders] = useState([]);
  const [assignedFolderId, setAssignedFolderId] = useState(null);
  const [chatFolderMap, setChatFolderMap] = useState({});
  const [foldersLimit, setFoldersLimit] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const lastUserMessageRef = useRef(null);
  const [sendCount, setSendCount] = useState(0);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("mth-mini");
  const [nudgeSuggestion, setNudgeSuggestion] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [planLimitType, setPlanLimitType] = useState(null);
  const [userPlan, setUserPlan] = useState("free");
  const firstMessageRef = useRef(null);
  const isFirstMessage = useRef(true);

  const charCount = problemText.length;
  const isOverLimit = charCount >= MAX_CHARS;
  const isNearLimit = charCount >= MAX_CHARS * 0.9;

  // ── Calcular carpetas bloqueadas (misma lógica que StudyHub) ──
  const lockedFolderIds = (() => {
    if (foldersLimit === null) return new Set();
    const sorted = [...folders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return new Set(sorted.slice(foldersLimit).map((f) => f.id));
  })();

  useEffect(() => { loadUserPlan(); loadChats(); loadFolders(); loadModels(); }, []);

  useEffect(() => {
    const chatId = searchParams.get("id");
    if (chatId) { loadChat(chatId); isFirstMessage.current = false; }
  }, [searchParams]);

  useEffect(() => {
    if (!imageFile) { setImagePreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (sendCount === 0) return;
    lastUserMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sendCount]);

  function handleRemoveImage() {
    setImageFile(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function loadModels() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_URL}models`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return;
      const data = await res.json();
      const models = Array.isArray(data) ? data : [];
      setAvailableModels(models);
      const firstAvailable = models.find((m) => m.available);
      if (firstAvailable) setSelectedModel(firstAvailable.key);
    } catch (err) { console.error("Error cargando modelos:", err); }
  }

  async function loadUserPlan() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/auth/user/profile`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return;
      const data = await res.json();
      const isVerified = data?.emailVerified ?? false;
      setUserPlan(isVerified ? (data?.plan || "free") : "free");
      setFoldersLimit(isVerified ? (data?.foldersLimit ?? null) : FREE_FOLDERS_LIMIT);
    } catch { /* silencioso */ }
  }

  async function loadChats() {
    try {
      const token = getToken?.() || "";
      const email = getEmailFromToken();
      const res = await fetch(`${API_URL}chats?email=${encodeURIComponent(email)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Error al cargar chats");
      const data = await res.json();
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.createdAt || b.chatId) - new Date(a.createdAt || a.chatId))
        : [];
      setChats(sorted);
    } catch (err) { console.error(err); }
  }

  async function loadFolders() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = Array.isArray(data)
        ? data.map((f) => ({
            id: f.folderId || f.id,
            name: f.name,
            chatCount: 0,
            createdAt: f.createdAt,
            color: f.color ?? null,
          }))
        : [];
      setFolders(processed);
      const folderChatsResults = await Promise.allSettled(
        processed.map((f) =>
          fetch(`${API_BASE}/folder/${f.id}/chats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((r) => (r.ok ? r.json() : []))
            .then((chats) => ({ folder: f, chats }))
        )
      );
      const map = {};
      const updatedCounts = {};
      folderChatsResults.forEach((r) => {
        if (r.status === "fulfilled") {
          const { folder, chats } = r.value;
          updatedCounts[folder.id] = Array.isArray(chats) ? chats.length : 0;
          if (Array.isArray(chats)) {
            chats.forEach((c) => {
              const id = c.chatId || c.id;
              if (id) map[id] = { name: folder.name, color: folder.color };
            });
          }
        }
      });
      setFolders((prev) => prev.map((f) => ({ ...f, chatCount: updatedCounts[f.id] ?? f.chatCount })));
      setChatFolderMap(map);
    } catch { setFolders([]); }
  }

  async function assignToFolder(folderId) {
    if (!currentChatId) return;
    setAssignedFolderId(folderId);
    const token = getToken?.() || "";
    await fetch(`${API_BASE}/folder/${folderId}/chats/${currentChatId}`, {
      method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, chatCount: f.chatCount + 1 } : f));
    const folder = folders.find((f) => f.id === folderId);
    if (folder && currentChatId) {
      setChatFolderMap((prev) => ({ ...prev, [currentChatId]: { name: folder.name, color: folder.color } }));
    }
    setTimeout(() => setAssignedFolderId(null), 1200);
    setShowFolderPopup(false); setNudgeSuggestion(null); setNudgeDismissed(true);
  }

  async function createFolderAndAssign(name) {
    const token = getToken?.() || "";
    const res = await fetch(`${API_BASE}/folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Error creando carpeta");
    const folder = await res.json();
    const folderId = folder.folderId || folder.id;
    if (currentChatId && folderId) {
      await fetch(`${API_BASE}/folder/${folderId}/chats/${currentChatId}`, {
        method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
    await loadFolders();
    if (window.fbq) window.fbq('trackCustom', 'StudyAction', { action_type: 'create_folder' });
    setNudgeSuggestion(null); setNudgeDismissed(true);
  }

  async function fetchFolderSuggestion(firstMessage) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ firstMessage }),
      });
      if (!res.ok) return;
      const suggestion = await res.json();
      // No sugerir carpetas bloqueadas
      if (suggestion.isExisting) {
        const matched = folders.find((f) => f.name === suggestion.folderName);
        if (matched && lockedFolderIds.has(matched.id)) return;
      }
      setNudgeSuggestion(suggestion);
    } catch (e) { console.error("Error obteniendo sugerencia de carpeta:", e); }
  }

  async function loadChat(chatId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_URL}chat/${chatId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCurrentChatId(chatId);
      navigate(`/chat?id=${chatId}`, { replace: true });
      const processed = (data.messages || []).map((msg) => {
        if (msg.role === "assistant" && typeof msg.content === "string") {
          const m = msg.content.match(/<GRAPH_JSON>\s*(\{[\s\S]*?\})\s*<\/GRAPH_JSON>/);
          if (m) {
            try { return { ...msg, content: msg.content.replace(/<GRAPH_JSON>[\s\S]*?<\/GRAPH_JSON>/, "").trim(), plotSpec: JSON.parse(m[1]) }; } catch {}
          }
        }
        if (msg.role === "user" && msg.imageUrl) return { ...msg, imagePreview: msg.imageUrl };
        return msg;
      });
      setMessages(processed);
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "instant" }); }, 50);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) { console.error(err); }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let found = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) { const file = item.getAsFile(); if (file) { found = true; setImageFile(file); } }
    }
    if (found) e.preventDefault();
  }

  async function handleSolve() {
    if (!problemText.trim() || isOverLimit) return;
    if (window.fbq) window.fbq('trackCustom', 'StudyAction', { action_type: 'chat_message' });
    const isFirst = isFirstMessage.current;
    if (isFirst) { isFirstMessage.current = false; firstMessageRef.current = problemText.trim(); }
    setIsLoading(true); setErrorMsg("");
    const sentPreview = imagePreview;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: problemText, imagePreview: sentPreview },
      { role: "assistant", content: "", plotSpec: null, streaming: true },
    ]);
    setSendCount((n) => n + 1);
    const currentProblem = problemText;
    const currentImage = imageFile;
    setProblemText(""); setImageFile(null); setImagePreview(null);
    try {
      const token = getToken?.() || "";
      const formData = new FormData();
      formData.append("problem", currentProblem);
      if (currentImage) formData.append("image", currentImage);
      if (currentChatId) formData.append("chatId", currentChatId);
      formData.append("modelKey", selectedModel);
      const response = await fetch(API_URL, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429 || errData.error === "MESSAGES_LIMIT_REACHED") {
          setPlanLimitType("messages");
          setMessages((prev) => { const u = [...prev]; if (u[u.length-1]?.streaming) u.pop(); return u; });
          setIsLoading(false); return;
        }
        if (errData.error === "IMAGES_LIMIT_REACHED") {
          setPlanLimitType("images");
          setMessages((prev) => { const u = [...prev]; if (u[u.length-1]?.streaming) u.pop(); return u; });
          setIsLoading(false); return;
        }
        throw new Error(`Error ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let accumulatedText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { continue; }
          if (event.type === "delta") {
            accumulatedText += event.text;
            setMessages((prev) => { const u = [...prev]; u[u.length-1] = { ...u[u.length-1], content: accumulatedText, streaming: true }; return u; });
          } else if (event.type === "done") {
            setMessages((prev) => { const u = [...prev]; u[u.length-1] = { role: "assistant", content: accumulatedText, plotSpec: event.plotSpec || null, streaming: false }; return u; });
            if (event.chat?.chatId && !currentChatId) {
              const newChatId = event.chat.chatId;
              setCurrentChatId(newChatId);
              navigate(`/chat?id=${newChatId}`, { replace: true });
              loadChats();
              if (isFirst && !nudgeDismissed) setTimeout(() => { fetchFolderSuggestion(firstMessageRef.current); }, 600);
            }
          } else if (event.type === "error") { throw new Error(event.message); }
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
      setMessages((prev) => { const u = [...prev]; if (u[u.length-1]?.streaming) u.pop(); return u; });
    } finally { setIsLoading(false); }
  }

  function startNewChat() {
    setCurrentChatId(null); setMessages([]); setProblemText(""); setImageFile(null); setImagePreview(null);
    setNudgeSuggestion(null); setNudgeDismissed(false);
    firstMessageRef.current = null; isFirstMessage.current = true;
    navigate("/chat", { replace: true });
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  return (
    <div className="chat-view">
      <OnboardingTour autoStart={true} />
      {planLimitType && <PlanLimitModal type={planLimitType} plan={userPlan} onClose={() => setPlanLimitType(null)} />}
      {sidebarOpen && window.innerWidth < 768 && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="chat-sidebar-header">
          <button className="btn-new-chat" onClick={startNewChat}>+ Nuevo Chat</button>
        </div>
        <div className="chat-list">
          {chats.length === 0 && <p className="chat-list-empty">No hay chats aún</p>}
          {chats.map((chat) => {
            const folderInfo = chatFolderMap[chat.chatId];
            return (
              <div key={chat.chatId} className={`chat-item ${currentChatId === chat.chatId ? "active" : ""}`} onClick={() => loadChat(chat.chatId)}>
                <div className="chat-item-title">{chat.title || "Sin título"}</div>
                <div className="chat-item-meta">
                  <span className="chat-item-folder" style={folderInfo?.color ? { color: folderInfo.color.replace("0.35", "0.9"), opacity: 1 } : {}}>
                    {folderInfo ? `📁 ${folderInfo.name}` : "Sin carpeta"}
                  </span>
                  <span className="chat-item-date">{new Date(chat.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sidebar-upgrade" onClick={() => navigate("/plans")}>
          <div className="sidebar-upgrade-glow" />
          <div className="sidebar-upgrade-icon">⚡</div>
          <div className="sidebar-upgrade-content">
            <span className="sidebar-upgrade-title">Subí tu plan</span>
            <span className="sidebar-upgrade-desc">Más mensajes y funciones avanzadas</span>
          </div>
          <span className="sidebar-upgrade-arrow">→</span>
        </div>
      </div>

      <div className={`chat-main ${messages.length === 0 ? "chat-main--empty" : ""}`}>
        {messages.length === 0 && (
          <div className="chat-empty-hero">
            <h2 className="chat-empty-hero__title">¿Cuál es el problema de hoy?</h2>
          </div>
        )}
        <div className={`chat-messages ${messages.length === 0 ? "chat-messages--hidden" : ""}`} ref={chatMessagesRef}>
          {messages.map((msg, idx) => {
            if (!msg || typeof msg !== "object") return null;
            const content = typeof msg.content === "string" ? msg.content : typeof msg.content === "object" ? JSON.stringify(msg.content) : String(msg.content || "");
            const isLastUserMsg = msg.role === "user" && idx === [...messages].map((m, i) => m.role === "user" ? i : -1).filter(i => i >= 0).at(-1);
            return (
              <div key={idx} ref={isLastUserMsg ? lastUserMessageRef : null} className={`chat-message chat-message--${msg.role || "user"}`}>
                {msg.role === "user" && msg.imagePreview && <div className="message-image-preview"><img src={msg.imagePreview} alt="Imagen adjunta" /></div>}
                <div className="chat-message-content">
                  {msg.role === "user" ? <p>{content}</p> : (
                    <div className="assistant-message-body">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(content)}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && msg.plotSpec && <MessagePlot plotSpec={msg.plotSpec} />}
              </div>
            );
          })}

          {nudgeSuggestion && currentChatId && !nudgeDismissed && (
            <FolderNudge
              suggestion={nudgeSuggestion}
              folders={folders.filter((f) => !lockedFolderIds.has(f.id))}
              onAssignExisting={assignToFolder} onCreateNew={createFolderAndAssign}
              onDismiss={() => { setNudgeSuggestion(null); setNudgeDismissed(true); }}
            />
          )}

          {isLoading && (() => {
            const streamingMsg = messages[messages.length - 1];
            const chars = (streamingMsg?.streaming && streamingMsg?.content?.length) || 0;
            const shrunk = Math.min(chars / 300 * 10, 60);
            return <div style={{ minHeight: `${Math.max(60 - shrunk, 0)}vh`, flexShrink: 0, transition: "min-height 0.3s ease" }} />;
          })()}
          <div ref={messagesEndRef} />
        </div>

        <div className={`chat-input-area ${messages.length === 0 ? "chat-input-area--centered" : ""}`}>
          {errorMsg && <p className="chat-error">{errorMsg}</p>}
          {imagePreview && (
            <div className="input-image-preview">
              <img src={imagePreview} alt="Imagen a enviar" />
              <button className="input-image-preview__remove" onClick={handleRemoveImage}>✕</button>
            </div>
          )}
          <div className="chat-input-row">
            <div className="chat-input-box">
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value.slice(0, MAX_CHARS))}
                onPaste={handlePaste}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSolve(); } }}
                rows={messages.length === 0 ? 2 : 3}
                placeholder="Escribí tu problema matemático..."
                disabled={isLoading}
                maxLength={MAX_CHARS}
              />
              <div className="chat-input-toolbar">
                <button data-tour="attach" type="button" className="btn-toolbar" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Adjuntar imagen">
                  📎 <span>Adjuntar</span>
                </button>
                <MathKeyboard onInsert={(sym) => setProblemText((prev) => (prev + sym).slice(0, MAX_CHARS))} />
                <div data-tour="model-selector">
                  <ModelSelector models={availableModels} selectedKey={selectedModel} onChange={setSelectedModel} />
                </div>
                <span className="char-counter-inline" style={{ color: isOverLimit ? "#e53935" : isNearLimit ? "#e57373" : "rgba(255,255,255,0.22)", fontWeight: isNearLimit ? "600" : "normal" }}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>

            <div className="chat-input-side">
              {currentChatId && messages.length > 0 && (
                <div className="folder-popup-inline">
                  <button type="button" className="btn-side-icon" onClick={() => setShowFolderPopup((v) => !v)} title="Agregar a carpeta">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                  {showFolderPopup && (
                    <div className="folder-popup-content folder-popup-content--inline">
                      <div className="folder-popup-header">
                        <span>Agregar a carpeta</span>
                        <button className="folder-popup-close" onClick={() => setShowFolderPopup(false)}>✕</button>
                      </div>
                      <div className="folder-popup-list">
                        {folders.length === 0 && <p className="folder-popup-empty">No hay carpetas aún.</p>}
                        {folders.map((folder) => {
                          const isSaved = assignedFolderId === folder.id;
                          const isLocked = lockedFolderIds.has(folder.id);
                          return (
                            <div
                              key={folder.id}
                              className={`folder-popup-item ${isSaved ? "folder-popup-item--saved" : ""} ${isLocked ? "folder-popup-item--locked" : ""}`}
                              style={folder.color && !isLocked ? { borderLeft: `3px solid ${folder.color.replace("0.35", "0.9")}` } : {}}
                              onClick={() => { if (!isSaved && !isLocked) assignToFolder(folder.id); }}
                            >
                              <span className="folder-popup-icon">{isLocked ? "🔒" : "📁"}</span>
                              <span className="folder-popup-name" style={isLocked ? { opacity: 0.45 } : {}}>{folder.name}</span>
                              {isSaved && <span className="folder-popup-saved">✓ Guardado</span>}
                              {!isSaved && isLocked && <span className="folder-popup-locked-label">Plan superior</span>}
                              {!isSaved && !isLocked && <span className="folder-popup-count">{folder.chatCount}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleSolve} disabled={isLoading || !problemText.trim() || isOverLimit} className="btn-send-icon" title="Enviar">
                {isLoading
                  ? <span className="btn-send-icon__spinner" />
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                }
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>
      </div>
    </div>
  );
}

function MessagePlot({ plotSpec }) {
  const [minimized, setMinimized] = useState(false);
  const plotResult = interpretPlot(plotSpec);
  if (plotResult.error) return <p className="plot-error">{plotResult.error}</p>;
  if (!plotResult.model) return null;
  return (
    <div className={`message-plot-wrapper ${minimized ? "minimized" : "expanded"}`}>
      <div className="message-plot-header">
        <span className="message-plot-title">📊 Gráfico</span>
        <button className="message-plot-toggle" onClick={() => setMinimized((v) => !v)}>{minimized ? "⤢ Expandir" : "⤡ Minimizar"}</button>
      </div>
      {!minimized && (
        <div className="message-plot-body">
          <Plot data={plotResult.model.data}
            layout={{ ...plotResult.model.layout, autosize: true, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(18,18,26,0.6)", font: { color: "#e0e0e0" } }}
            useResizeHandler style={{ width: "100%", height: "420px" }}
            config={{ responsive: true, displayModeBar: true }}
          />
        </div>
      )}
    </div>
  );
}
