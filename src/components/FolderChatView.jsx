import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { getToken } from "../auth";
import { normalizeMath } from "../utils/mathUtils";
import { interpretPlot } from "../utils/plotInterpreter";

const API_URL = "https://api.mathaps.online/math/";
const API_BASE = "https://api.mathaps.online";

export default function FolderChatView() {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const [folderName, setFolderName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [problemText, setProblemText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (folderId) {
      loadFolderChats();
      loadFolderInfo();
    }
  }, [folderId]);

  async function loadFolderInfo() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar carpetas");
      const data = await res.json();
      const folder = Array.isArray(data)
        ? data.find((f) => (f.folderId || f.id) === folderId)
        : null;
      if (folder) setFolderName(folder.name || "Carpeta");
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFolderChats() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar chats de carpeta");
      const data = await res.json();
      const sortedChats = Array.isArray(data)
        ? data.sort(
            (a, b) =>
              new Date(b.createdAt || b.chatId) -
              new Date(a.createdAt || a.chatId)
          )
        : [];
      setChats(sortedChats);
    } catch (err) {
      console.error(err);
      setChats([]);
    }
  }

  async function loadChat(chatId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_URL}chat/${chatId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar chat");
      const data = await res.json();
      setCurrentChatId(chatId);
      const processedMessages = (data.messages || []).map((msg) => {
        if (msg.role === "assistant" && typeof msg.content === "string") {
          const graphMatch = msg.content.match(
            /<GRAPH_JSON>\s*(\{[\s\S]*?\})\s*<\/GRAPH_JSON>/
          );
          if (graphMatch) {
            try {
              const plotSpec = JSON.parse(graphMatch[1]);
              const cleanContent = msg.content
                .replace(/<GRAPH_JSON>[\s\S]*?<\/GRAPH_JSON>/, "")
                .trim();
              return { ...msg, content: cleanContent, plotSpec };
            } catch (e) {
              console.error("Error parseando GRAPH_JSON:", e);
            }
          }
        }
        return msg;
      });
      setMessages(processedMessages);
    } catch (err) {
      console.error(err);
    }
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    let imageFound = false;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          imageFound = true;
          setImageFile(file);
        }
      }
    }
    if (imageFound) e.preventDefault();
  }

  async function handleSolve() {
    if (!problemText.trim()) return;

    setIsLoading(false);
    setErrorMsg("");

    const userMsg = { role: "user", content: problemText };
    setMessages((prev) => [
      ...prev,
      userMsg,
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
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === "delta") {
            accumulatedText += event.text;
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: accumulatedText,
                streaming: true,
              };
              return updated;
            });
          } else if (event.type === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              updated[lastIdx] = {
                role: "assistant",
                content: accumulatedText,
                plotSpec: event.plotSpec || null,
                streaming: false,
              };
              return updated;
            });

            if (event.chat?.chatId && !currentChatId) {
              const newChatId = event.chat.chatId;
              setCurrentChatId(newChatId);

              // Auto-assign to current folder
              try {
                await fetch(
                  `${API_BASE}/folder/${folderId}/chats/${newChatId}`,
                  {
                    method: "POST",
                    headers: token
                      ? { Authorization: `Bearer ${token}` }
                      : {},
                  }
                );
              } catch (err) {
                console.error("Error asignando chat a carpeta:", err);
              }

              loadFolderChats();
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
  }

  return (
    <div className="folder-chat-view">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="chat-sidebar-header">
          <button
            className="btn-icon btn-back"
            onClick={() => navigate("/study")}
            title="Volver a Estudios"
          >
            ←
          </button>
          <button className="btn-new-chat" onClick={startNewChat}>
            + Nuevo Chat
          </button>
        </div>

        <div className="folder-sidebar-title">📁 {folderName}</div>

        <button
          className="folder-flashcards-btn"
          onClick={() => navigate(`/folder/${folderId}/flashcards`)}
        >
          🧠 Flashcards
        </button>

        <div className="chat-list">
          {chats.length === 0 && (
            <p className="chat-list-empty">No hay chats en esta carpeta</p>
          )}
          {chats.map((chat) => (
            <div
              key={chat.chatId || chat.id}
              className={`chat-item ${
                currentChatId === (chat.chatId || chat.id) ? "active" : ""
              }`}
              onClick={() => loadChat(chat.chatId || chat.id)}
            >
              <div className="chat-item-title">{chat.title || "Sin título"}</div>
              <div className="chat-item-date">
                {chat.createdAt
                  ? new Date(chat.createdAt).toLocaleDateString()
                  : ""}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-upgrade" onClick={() => navigate("/plans")}>
          <div className="sidebar-upgrade-glow" />
          <div className="sidebar-upgrade-icon">⚡</div>
          <div className="sidebar-upgrade-content">
            <span className="sidebar-upgrade-title">Subí tu plan</span>
            <span className="sidebar-upgrade-desc">
              Más mensajes y funciones avanzadas
            </span>
          </div>
          <span className="sidebar-upgrade-arrow">→</span>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <h2>¡Empezá una conversación!</h2>
              <p>
                Los chats que crees acá se guardan automáticamente en "
                {folderName}"
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (!msg || typeof msg !== "object") return null;
            const content =
              typeof msg.content === "string"
                ? msg.content
                : typeof msg.content === "object"
                ? JSON.stringify(msg.content)
                : String(msg.content || "");

            return (
              <div
                key={idx}
                className={`chat-message chat-message--${msg.role || "user"}`}
              >
                <div className="chat-message-content">
                  {msg.role === "user" ? (
                    <p>{content}</p>
                  ) : (
                    <div className="assistant-message-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {normalizeMath(content)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && msg.plotSpec && (
                  <MessagePlot plotSpec={msg.plotSpec} />
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="chat-message chat-message--assistant">
              <div className="chat-message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          {errorMsg && <p className="chat-error">{errorMsg}</p>}

          <div className="chat-input-wrap">
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSolve();
                }
              }}
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
              <button
                type="button"
                className="btn-attach"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                📎
              </button>

              {imageFile && (
                <span className="file-badge">
                  Imagen adjunta
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="file-badge-remove"
                  >
                    ✕
                  </button>
                </span>
              )}

              <button
                onClick={handleSolve}
                disabled={isLoading || !problemText.trim()}
                className="btn-send"
              >
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
    <div
      className={`message-plot-wrapper ${minimized ? "minimized" : "expanded"}`}
    >
      <div className="message-plot-header">
        <span className="message-plot-title">📊 Gráfico</span>
        <button
          className="message-plot-toggle"
          onClick={() => setMinimized((v) => !v)}
        >
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
