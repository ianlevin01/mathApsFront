import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { getToken, getEmailFromToken } from "../auth";
import { normalizeMath } from "../utils/mathUtils";
import { interpretPlot } from "../utils/plotInterpreter";

const API_URL = "https://api.mathaps.online/math/";
const API_BASE = "https://api.mathaps.online";

// ── Smart Folder Nudge ──────────────────────────────────────────────────────
function FolderNudge({ suggestion, folders, onAssignExisting, onCreateNew, onDismiss }) {
  const [busy, setBusy] = useState(false);

  // isExisting true → la IA dice que ya hay una carpeta que encaja
  const matchedFolder = suggestion.isExisting
    ? folders.find((f) => f.name === suggestion.folderName)
    : null;

  if (suggestion.isExisting && matchedFolder) {
    return (
      <div className="folder-nudge folder-nudge--assign">
        <div className="folder-nudge__icon">📂</div>
        <div className="folder-nudge__body">
          <p className="folder-nudge__text">
            ¿Guardamos esto en <strong>"{matchedFolder.name}"</strong>?
          </p>
          <p className="folder-nudge__sub">Parece que encaja con esa carpeta</p>
          <div className="folder-nudge__actions">
            <button
              className="folder-nudge__btn folder-nudge__btn--primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onAssignExisting(matchedFolder.id);
                setBusy(false);
              }}
            >
              {busy ? "Guardando…" : `Sí, guardar ahí`}
            </button>
            <button className="folder-nudge__btn folder-nudge__btn--ghost" onClick={onDismiss}>
              No por ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No existe → sugerir crear
  return (
    <div className="folder-nudge folder-nudge--create">
      <div className="folder-nudge__icon">📁</div>
      <div className="folder-nudge__body">
        <p className="folder-nudge__text">¿Guardamos esto en una carpeta?</p>
        <p className="folder-nudge__sub">
          Te sugerimos crear <strong>"{suggestion.folderName}"</strong>
        </p>
        <div className="folder-nudge__actions">
          <button
            className="folder-nudge__btn folder-nudge__btn--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onCreateNew(suggestion.folderName);
              setBusy(false);
            }}
          >
            {busy ? "Creando…" : `+ Crear "${suggestion.folderName}"`}
          </button>
          <button className="folder-nudge__btn folder-nudge__btn--ghost" onClick={onDismiss}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ChatView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [folders, setFolders] = useState([]);

  const fileInputRef = useRef(null);

  // Nudge state
  const [nudgeSuggestion, setNudgeSuggestion] = useState(null); // { folderName, isExisting }
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const firstMessageRef = useRef(null); // guardamos el texto del primer mensaje
  const isFirstMessage = useRef(true);

  useEffect(() => {
    loadChats();
    loadFolders();
  }, []);

  useEffect(() => {
    const chatId = searchParams.get("id");
    if (chatId) {
      loadChat(chatId);
      isFirstMessage.current = false;
    }
  }, [searchParams]);

  async function loadChats() {
    try {
      const token = getToken?.() || "";
      const email = getEmailFromToken();
      const res = await fetch(`${API_URL}chats?email=${encodeURIComponent(email)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar chats");
      const data = await res.json();
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.createdAt || b.chatId) - new Date(a.createdAt || a.chatId))
        : [];
      setChats(sorted);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFolders() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = Array.isArray(data)
        ? data.map((f) => {
            const chatsArr = Object.values(f).find((v) => Array.isArray(v));
            return { id: f.folderId || f.id, name: f.name, chatCount: chatsArr ? chatsArr.length : 0 };
          })
        : [];
      setFolders(processed);
    } catch {
      setFolders([]);
    }
  }

  async function assignToFolder(folderId) {
    if (!currentChatId) return;
    const token = getToken?.() || "";
    await fetch(`${API_BASE}/folder/${folderId}/chats/${currentChatId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setShowFolderPopup(false);
    setNudgeSuggestion(null);
    setNudgeDismissed(true);
  }

  async function createFolderAndAssign(name) {
    const token = getToken?.() || "";
    const res = await fetch(`${API_BASE}/folder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Error creando carpeta");
    const folder = await res.json();
    const folderId = folder.folderId || folder.id;
    if (currentChatId && folderId) {
      await fetch(`${API_BASE}/folder/${folderId}/chats/${currentChatId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
    await loadFolders();
    setNudgeSuggestion(null);
    setNudgeDismissed(true);
  }

  async function fetchFolderSuggestion(firstMessage) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstMessage }),
      });
      if (!res.ok) return;
      const suggestion = await res.json(); // { folderName, isExisting }
      setNudgeSuggestion(suggestion);
    } catch (e) {
      console.error("Error obteniendo sugerencia de carpeta:", e);
    }
  }

  async function loadChat(chatId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_URL}chat/${chatId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCurrentChatId(chatId);
      const processed = (data.messages || []).map((msg) => {
        if (msg.role === "assistant" && typeof msg.content === "string") {
          const m = msg.content.match(/<GRAPH_JSON>\s*(\{[\s\S]*?\})\s*<\/GRAPH_JSON>/);
          if (m) {
            try {
              return {
                ...msg,
                content: msg.content.replace(/<GRAPH_JSON>[\s\S]*?<\/GRAPH_JSON>/, "").trim(),
                plotSpec: JSON.parse(m[1]),
              };
            } catch {}
          }
        }
        return msg;
      });
      setMessages(processed);
    } catch (err) {
      console.error(err);
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let found = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) { found = true; setImageFile(file); }
      }
    }
    if (found) e.preventDefault();
  }

  async function handleSolve() {
    if (!problemText.trim()) return;

    const isFirst = isFirstMessage.current;
    if (isFirst) {
      isFirstMessage.current = false;
      firstMessageRef.current = problemText.trim();
    }

    setIsLoading(false);
    setErrorMsg("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: problemText },
      { role: "assistant", content: "", plotSpec: null, streaming: true },
    ]);

    const currentProblem = problemText;
    const currentImage = imageFile;
    setProblemText("");
    setImageFile(null);

    try {
      const token = getToken?.() || "";
      const formData = new FormData();
      formData.append("problem", currentProblem);
      if (currentImage) formData.append("image", currentImage);
      if (currentChatId) formData.append("chatId", currentChatId);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

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
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulatedText, streaming: true };
              return updated;
            });
          } else if (event.type === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: accumulatedText,
                plotSpec: event.plotSpec || null,
                streaming: false,
              };
              return updated;
            });

            if (event.chat?.chatId && !currentChatId) {
              setCurrentChatId(event.chat.chatId);
              loadChats();

              // Pedir sugerencia de carpeta después de la primera respuesta
              if (isFirst && !nudgeDismissed) {
                setTimeout(() => {
                  fetchFolderSuggestion(firstMessageRef.current);
                }, 600);
              }
            }
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.streaming) updated.pop();
        return updated;
      });
    }
  }

  function startNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setProblemText("");
    setImageFile(null);
    setNudgeSuggestion(null);
    setNudgeDismissed(false);
    firstMessageRef.current = null;
    isFirstMessage.current = true;
  }

  return (
    <div className="chat-view">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="chat-sidebar-header">
          <button className="btn-icon btn-back" onClick={() => navigate("/dashboard")} title="Volver al Dashboard">
            ←
          </button>
          <button className="btn-new-chat" onClick={startNewChat}>+ Nuevo Chat</button>
        </div>

        <div className="chat-list">
          {chats.length === 0 && <p className="chat-list-empty">No hay chats aún</p>}
          {chats.map((chat) => (
            <div
              key={chat.chatId}
              className={`chat-item ${currentChatId === chat.chatId ? "active" : ""}`}
              onClick={() => loadChat(chat.chatId)}
            >
              <div className="chat-item-title">{chat.title || "Sin título"}</div>
              <div className="chat-item-date">{new Date(chat.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
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

        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* Main */}
      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <h2>¡Empezá una conversación!</h2>
              <p>Escribí un problema matemático o pegá una imagen</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (!msg || typeof msg !== "object") return null;
            const content =
              typeof msg.content === "string" ? msg.content
              : typeof msg.content === "object" ? JSON.stringify(msg.content)
              : String(msg.content || "");

            return (
              <div key={idx} className={`chat-message chat-message--${msg.role || "user"}`}>
                <div className="chat-message-content">
                  {msg.role === "user" ? (
                    <p>{content}</p>
                  ) : (
                    <div className="assistant-message-body">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {normalizeMath(content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && msg.plotSpec && <MessagePlot plotSpec={msg.plotSpec} />}
              </div>
            );
          })}

          {isLoading && (
            <div className="chat-message chat-message--assistant">
              <div className="chat-message-content">
                <div className="typing-indicator"><span /><span /><span /></div>
              </div>
            </div>
          )}

          {/* ── Smart Folder Nudge ── */}
          {nudgeSuggestion && currentChatId && !nudgeDismissed && (
            <FolderNudge
              suggestion={nudgeSuggestion}
              folders={folders}
              onAssignExisting={assignToFolder}
              onCreateNew={createFolderAndAssign}
              onDismiss={() => { setNudgeSuggestion(null); setNudgeDismissed(true); }}
            />
          )}
        </div>

        {/* Folder popup manual */}
        {currentChatId && messages.length > 0 && (
          <div className={`folder-popup ${showFolderPopup ? "open" : ""}`}>
            {!showFolderPopup ? (
              <button className="folder-popup-trigger" onClick={() => setShowFolderPopup(true)} title="Agregar a carpeta">
                📁+
              </button>
            ) : (
              <div className="folder-popup-content">
                <div className="folder-popup-header">
                  <span>Agregar a carpeta</span>
                  <button className="folder-popup-close" onClick={() => setShowFolderPopup(false)}>✕</button>
                </div>
                <div className="folder-popup-list">
                  {folders.length === 0 && <p className="folder-popup-empty">No hay carpetas aún.</p>}
                  {folders.map((folder) => (
                    <div key={folder.id} className="folder-popup-item" onClick={() => assignToFolder(folder.id)}>
                      <span className="folder-popup-icon">📁</span>
                      <span className="folder-popup-name">{folder.name}</span>
                      <span className="folder-popup-count">{folder.chatCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="chat-input-area">
          {errorMsg && <p className="chat-error">{errorMsg}</p>}
          <div className="chat-input-wrap">
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSolve(); } }}
              rows={3}
              placeholder="Escribí tu problema matemático... (Enter para enviar)"
              disabled={isLoading}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <div className="chat-input-actions">
              <button type="button" className="btn-attach" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                📎
              </button>
              {imageFile && (
                <span className="file-badge">
                  Imagen adjunta
                  <button type="button" onClick={() => setImageFile(null)} className="file-badge-remove">✕</button>
                </span>
              )}
              <button onClick={handleSolve} disabled={isLoading || !problemText.trim()} className="btn-send">
                {isLoading ? "..." : "Enviar"}
              </button>
            </div>
          </div>
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
        <button className="message-plot-toggle" onClick={() => setMinimized((v) => !v)}>
          {minimized ? "⤢ Expandir" : "⤡ Minimizar"}
        </button>
      </div>
      {!minimized && (
        <div className="message-plot-body">
          <Plot
            data={plotResult.model.data}
            layout={{
              ...plotResult.model.layout,
              autosize: true,
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(18,18,26,0.6)",
              font: { color: "#e0e0e0" },
            }}
            useResizeHandler
            style={{ width: "100%", height: "420px" }}
            config={{ responsive: true, displayModeBar: true }}
          />
        </div>
      )}
    </div>
  );
}
