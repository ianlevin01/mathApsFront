import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Plot from "react-plotly.js";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { getToken, getEmailFromToken } from "../auth";
import { normalizeMath } from "../utils/mathUtils";
import { interpretPlot } from "../utils/plotInterpreter";

const API_URL = "https://mathapsapi.duckdns.org/math/";

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

  // Cargar lista de chats al montar
  useEffect(() => {
    loadChats();
    loadFolders();
  }, []);

  // Cargar chat específico si viene en URL (?id=...)
  useEffect(() => {
    const chatId = searchParams.get('id');
    if (chatId) {
      loadChat(chatId);
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
      
      // Ordenar chats por fecha descendente (más reciente primero)
      const sortedChats = Array.isArray(data) 
        ? data.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.chatId);
            const dateB = new Date(b.createdAt || b.chatId);
            return dateB - dateA; // Descendente
          })
        : [];
      
      setChats(sortedChats);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadFolders() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`https://mathapsapi.duckdns.org/folder`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar carpetas");
      const data = await res.json();
      
      // Procesar carpetas igual que en StudyHub
      const processedFolders = Array.isArray(data) 
        ? data.map(folder => {
            const chatsArray = Object.values(folder).find(val => Array.isArray(val));
            return {
              id: folder.folderId || folder.id,
              name: folder.name,
              chatCount: chatsArray ? chatsArray.length : 0,
              createdAt: folder.createdAt
            };
          })
        : [];
      
      setFolders(processedFolders);
    } catch (err) {
      console.error(err);
      setFolders([]);
    }
  }

  async function assignToFolder(folderId) {
    if (!currentChatId) return;
    
    try {
      const token = getToken?.() || "";
      const res = await fetch(`https://mathapsapi.duckdns.org/folder/${folderId}/chats/${currentChatId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) throw new Error("Error al asignar chat");
      
      // Éxito
      setShowFolderPopup(false);
      alert("¡Chat agregado a la carpeta!");
    } catch (err) {
      console.error(err);
      alert("Error al agregar el chat a la carpeta");
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
      
      // Procesar mensajes para extraer plotSpec si está embebido
      const processedMessages = (data.messages || []).map(msg => {
        if (msg.role === "assistant" && typeof msg.content === "string") {
          // Buscar <GRAPH_JSON>...</GRAPH_JSON>
          const graphMatch = msg.content.match(/<GRAPH_JSON>\s*(\{[\s\S]*?\})\s*<\/GRAPH_JSON>/);
          if (graphMatch) {
            try {
              const plotSpec = JSON.parse(graphMatch[1]);
              // Remover el tag del content
              const cleanContent = msg.content.replace(/<GRAPH_JSON>[\s\S]*?<\/GRAPH_JSON>/, '').trim();
              return {
                ...msg,
                content: cleanContent,
                plotSpec: plotSpec
              };
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
    
    setIsLoading(true);
    setErrorMsg("");

    // Agregar mensaje del usuario a la UI
    const userMsg = { role: "user", content: problemText };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const token = getToken?.() || "";

      const formData = new FormData();
      formData.append("problem", problemText);
      if (imageFile) formData.append("image", imageFile);
      
      // ✅ IMPORTANTE: Si hay un chat activo, enviar el chatId
      if (currentChatId) {
        formData.append("chatId", currentChatId);
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      // Agregar respuesta de la IA
      const aiMsg = {
        role: "assistant",
        content: data.answerText || "",
        plotSpec: data.plotSpec || null,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Si es un chat nuevo, actualizar el currentChatId
      if (data.chat?.chatId && !currentChatId) {
        setCurrentChatId(data.chat.chatId);
        loadChats(); // refrescar lista
      }

      // Limpiar input
      setProblemText("");
      setImageFile(null);
    } catch (err) {
      setErrorMsg(err?.message || "Error desconocido");
      // Remover el mensaje del usuario si hubo error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  function startNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setProblemText("");
    setImageFile(null);
  }

  return (
    <div className="chat-view">
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="chat-sidebar-header">
          <button
            className="btn-icon btn-back"
            onClick={() => navigate("/dashboard")}
            title="Volver al Dashboard"
          >
            ←
          </button>
          <button
            className="btn-new-chat"
            onClick={startNewChat}
          >
            + Nuevo Chat
          </button>
        </div>

        <div className="chat-list">
          {chats.length === 0 && (
            <p className="chat-list-empty">No hay chats aún</p>
          )}
          {chats.map((chat) => (
            <div
              key={chat.chatId}
              className={`chat-item ${
                currentChatId === chat.chatId ? "active" : ""
              }`}
              onClick={() => loadChat(chat.chatId)}
            >
              <div className="chat-item-title">{chat.title}</div>
              <div className="chat-item-date">
                {new Date(chat.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
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
              <p>Escribí un problema matemático o pegá una imagen</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            // Validar que el mensaje tenga estructura correcta
            if (!msg || typeof msg !== 'object') return null;
            
            // Asegurar que content sea string
            const content = typeof msg.content === 'string' 
              ? msg.content 
              : typeof msg.content === 'object'
                ? JSON.stringify(msg.content)
                : String(msg.content || '');

            return (
              <div key={idx} className={`chat-message chat-message--${msg.role || 'user'}`}>
                <div className="chat-message-content">
                  {msg.role === "user" ? (
                    <p>{content}</p>
                  ) : (
                    <>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {normalizeMath(content)}
                      </ReactMarkdown>
                      {msg.plotSpec && (
                        <MessagePlot plotSpec={msg.plotSpec} />
                      )}
                    </>
                  )}
                </div>
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

        {/* Mini popup para agregar a carpeta */}
        {currentChatId && messages.length > 0 && (
          <div className={`folder-popup ${showFolderPopup ? 'open' : ''}`}>
            {!showFolderPopup ? (
              <button 
                className="folder-popup-trigger"
                onClick={() => setShowFolderPopup(true)}
                title="Agregar a carpeta"
              >
                📁+
              </button>
            ) : (
              <div className="folder-popup-content">
                <div className="folder-popup-header">
                  <span>Agregar a carpeta</span>
                  <button 
                    className="folder-popup-close"
                    onClick={() => setShowFolderPopup(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="folder-popup-list">
                  {folders.length === 0 && (
                    <p className="folder-popup-empty">No hay carpetas. Creá una desde Estudios.</p>
                  )}
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className="folder-popup-item"
                      onClick={() => assignToFolder(folder.id)}
                    >
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
  const plotResult = interpretPlot(plotSpec);
  
  if (plotResult.error) {
    return <p className="plot-error">{plotResult.error}</p>;
  }

  if (!plotResult.model) return null;

  return (
    <div className="message-plot">
      <Plot
        data={plotResult.model.data}
        layout={plotResult.model.layout}
        useResizeHandler
        style={{ width: "100%" }}
      />
    </div>
  );
}
