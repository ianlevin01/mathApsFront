import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getEmailFromToken } from "../auth";

const API_BASE = "https://api.mathaps.online";

const FOLDER_SUGGESTIONS = [
  "Cálculo diferencial",
  "Cálculo integral",
  "Álgebra lineal",
  "Estadística",
  "Geometría analítica",
  "Ecuaciones diferenciales",
  "Trigonometría",
  "Probabilidad",
  "Análisis numérico",
  "Física matemática",
];

// ── Create Folder Popup ─────────────────────────────────────────────────────
function CreateFolderPopup({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [filtered, setFiltered] = useState(FOLDER_SUGGESTIONS);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    setFiltered(
      !name.trim()
        ? FOLDER_SUGGESTIONS
        : FOLDER_SUGGESTIONS.filter((s) =>
            s.toLowerCase().includes(name.toLowerCase())
          )
    );
  }, [name]);

  async function handleCreate(folderName) {
    const n = folderName || name;
    if (!n.trim()) return;
    setLoading(true);
    await onCreate(n.trim());
    setLoading(false);
    onClose();
  }

  return (
    <div className="create-folder-overlay" onClick={onClose}>
      <div className="create-folder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-folder-header">
          <h3 className="create-folder-title">Nueva carpeta</h3>
          <button className="create-folder-close" onClick={onClose}>✕</button>
        </div>
        <div className="create-folder-body">
          <input
            ref={inputRef}
            type="text"
            className="create-folder-input"
            placeholder="Nombre de la carpeta..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") onClose();
            }}
          />
          {filtered.length > 0 && (
            <div className="create-folder-suggestions">
              <p className="create-folder-suggestions__label">Sugerencias</p>
              <div className="create-folder-suggestions__chips">
                {filtered.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    className="folder-suggestion-chip"
                    onClick={() => handleCreate(s)}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="create-folder-footer">
          <button className="create-folder-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="create-folder-confirm"
            onClick={() => handleCreate()}
            disabled={!name.trim() || loading}
          >
            {loading ? "Creando…" : "Crear carpeta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pick Folder Modal (flashcards / desarrollo desde el strip) ──────────────
function PickFolderModal({ mode, folders, onPick, onClose }) {
  const modeLabel = mode === "flashcards" ? "Flashcards" : "Preguntas a desarrollo";
  const modeIcon  = mode === "flashcards" ? "🧠" : "✍️";

  return (
    <div className="pick-folder-overlay" onClick={onClose}>
      <div className="pick-folder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pick-folder-header">
          <span className="pick-folder-icon">{modeIcon}</span>
          <div className="pick-folder-header-text">
            <p className="pick-folder-title">{modeLabel}</p>
            <p className="pick-folder-sub">¿De qué carpeta querés tomar las preguntas?</p>
          </div>
          <button className="pick-folder-close" onClick={onClose}>✕</button>
        </div>
        <div className="pick-folder-list">
          {folders.length === 0 && (
            <p className="pick-folder-empty">No tenés carpetas todavía. Creá una primero.</p>
          )}
          {folders.map((folder) => (
            <button
              key={folder.id}
              className="pick-folder-btn"
              onClick={() => onPick(folder.id)}
            >
              <span className="pick-folder-btn__icon">📁</span>
              <span className="pick-folder-btn__name">{folder.name}</span>
              <span className="pick-folder-btn__count">{folder.chatCount} chats</span>
              <span className="pick-folder-btn__arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Assign Modal ──────────────────────────────────────────────────────
function QuickAssignModal({ chat, folders, onAssign, onClose }) {
  if (!chat) return null;
  return (
    <div className="quick-assign-overlay" onClick={onClose}>
      <div className="quick-assign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-assign-header">
          <p className="quick-assign-title">¿Dónde guardamos este chat?</p>
          <p className="quick-assign-sub">"{chat.title || "Sin título"}"</p>
          <button className="quick-assign-close" onClick={onClose}>✕</button>
        </div>
        <div className="quick-assign-folders">
          {folders.map((folder) => (
            <button
              key={folder.id}
              className="quick-assign-folder-btn"
              onClick={() => onAssign(folder.id)}
            >
              <span className="quick-assign-folder-icon">📁</span>
              <span className="quick-assign-folder-name">{folder.name}</span>
              <span className="quick-assign-folder-count">{folder.chatCount} chats</span>
            </button>
          ))}
        </div>
        <button className="quick-assign-skip" onClick={onClose}>Ahora no</button>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function StudyHub() {
  const navigate = useNavigate();
  const [view, setView] = useState("folders");
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderChats, setFolderChats] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [quickAssignChat, setQuickAssignChat] = useState(null);
  const [pickFolderMode, setPickFolderMode] = useState(null); // "flashcards" | "dev-questions" | null

  useEffect(() => {
    loadFolders();
    loadAllChats();
  }, []);

  async function loadFolders() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = Array.isArray(data)
        ? data.map((folder) => {
            const chatsArr = Object.values(folder).find((v) => Array.isArray(v));
            return {
              id: folder.folderId || folder.id,
              name: folder.name,
              chatCount: chatsArr ? chatsArr.length : 0,
              createdAt: folder.createdAt,
            };
          })
        : [];
      setFolders(processed);
    } catch {
      setFolders([]);
    }
  }

  async function loadAllChats() {
    try {
      const token = getToken?.() || "";
      const email = getEmailFromToken();
      const res = await fetch(`${API_BASE}/math/chats?email=${encodeURIComponent(email)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllChats(Array.isArray(data) ? data : []);
    } catch {
      setAllChats([]);
    }
  }

  async function createFolder(name) {
    if (!name.trim()) return;
    setIsCreatingFolder(true);
    try {
      const token = getToken?.() || "";
      await fetch(`${API_BASE}/folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      });
      await loadFolders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function loadFolderChats(folderId) {
    setIsLoadingChats(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFolderChats(Array.isArray(data) ? data : []);
      setSelectedFolder(folderId);
    } catch {
      setFolderChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }

  async function assignChatToFolder(chatId, folderId) {
    try {
      const token = getToken?.() || "";
      await fetch(`${API_BASE}/folder/${folderId}/chats/${chatId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (selectedFolder) loadFolderChats(selectedFolder);
      loadFolders();
      setQuickAssignChat(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function generateExam(folderId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/exam`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "examen.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Error al generar el examen");
    }
  }

  const unorganizedChats = allChats.filter(
    (chat) => !folderChats.some((fc) => (fc.chatId || fc.id) === (chat.chatId || chat.id))
  );

  return (
    <div className="study-hub">
      {showCreatePopup && (
        <CreateFolderPopup
          onClose={() => setShowCreatePopup(false)}
          onCreate={createFolder}
        />
      )}

      {quickAssignChat && (
        <QuickAssignModal
          chat={allChats.find((c) => (c.chatId || c.id) === quickAssignChat)}
          folders={folders}
          onAssign={(folderId) => assignChatToFolder(quickAssignChat, folderId)}
          onClose={() => setQuickAssignChat(null)}
        />
      )}

      {pickFolderMode && (
        <PickFolderModal
          mode={pickFolderMode}
          folders={folders}
          onPick={(folderId) => {
            navigate(`/folder/${folderId}/${pickFolderMode}`);
            setPickFolderMode(null);
          }}
          onClose={() => setPickFolderMode(null)}
        />
      )}

      {/* Header */}
      <div className="study-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <h1 className="study-title shine-platinum">Mis Estudios</h1>
      </div>

      {/* Quick-action tools strip */}
      <div className="study-tools-strip">
        <div className="study-tool-card study-tool-card--chat" onClick={() => navigate("/chat")}>
          <span className="study-tool-card__icon">📐</span>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Chat Matemático</span>
            <span className="study-tool-card__sub">Resolvé problemas con IA</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>

        <div
          className="study-tool-card study-tool-card--flash"
          onClick={() => setPickFolderMode("flashcards")}
        >
          <span className="study-tool-card__icon">🧠</span>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Flashcards</span>
            <span className="study-tool-card__sub">Múltiple opción con IA</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>

        <div
          className="study-tool-card study-tool-card--dev"
          onClick={() => setPickFolderMode("dev-questions")}
        >
          <span className="study-tool-card__icon">✍️</span>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Preguntas a desarrollo</span>
            <span className="study-tool-card__sub">Escribí y recibí corrección</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="study-tabs">
        <button
          className={`study-tab ${view === "folders" ? "active" : ""}`}
          onClick={() => setView("folders")}
        >
          📁 Carpetas
        </button>
        <button
          className={`study-tab ${view === "progress" ? "active" : ""}`}
          onClick={() => setView("progress")}
        >
          📊 Progreso
        </button>
      </div>

      <div className="study-content">
        {view === "folders" && (
          <FoldersView
            navigate={navigate}
            folders={folders}
            selectedFolder={selectedFolder}
            folderChats={folderChats}
            allChats={allChats}
            unorganizedChats={unorganizedChats}
            isLoadingChats={isLoadingChats}
            onCreateFolder={() => setShowCreatePopup(true)}
            onSelectFolder={(id) => {
              setSelectedFolder(id);
              loadFolderChats(id);
            }}
            assignChatToFolder={assignChatToFolder}
            onQuickAssign={(chatId) => setQuickAssignChat(chatId)}
            generateExam={generateExam}
          />
        )}
        {view === "progress" && <ProgressView folders={folders} allChats={allChats} />}
      </div>
    </div>
  );
}

// ── Folders View ────────────────────────────────────────────────────────────
function FoldersView({
  navigate,
  folders,
  selectedFolder,
  folderChats,
  allChats,
  unorganizedChats,
  isLoadingChats,
  onCreateFolder,
  onSelectFolder,
  assignChatToFolder,
  onQuickAssign,
  generateExam,
}) {
  const [showAddChat, setShowAddChat] = useState(false);
  const isEmpty = !folders || folders.length === 0;

  return (
    <div className="folders-view">
      {isEmpty && allChats.length === 0 && (
        <div className="folders-onboarding">
          <div className="folders-onboarding__icon">🗂️</div>
          <h3 className="folders-onboarding__title">Organizá tus estudios</h3>
          <p className="folders-onboarding__desc">
            Creá carpetas por materia y guardá tus chats para estudiar mejor.
          </p>
        </div>
      )}

      <div className="folder-create-row">
        <button className="folder-create-btn" onClick={onCreateFolder}>
          <span className="folder-create-btn__icon">+</span>
          Nueva carpeta
        </button>
        {unorganizedChats.length > 0 && folders.length > 0 && (
          <div className="unorganized-nudge">
            <span className="unorganized-nudge__icon">💡</span>
            <span className="unorganized-nudge__text">
              <strong>{unorganizedChats.length}</strong> chat{unorganizedChats.length > 1 ? "s" : ""} sin organizar
            </span>
            <button
              className="unorganized-nudge__btn"
              onClick={() => onQuickAssign(unorganizedChats[0]?.chatId || unorganizedChats[0]?.id)}
            >
              Organizarlos →
            </button>
          </div>
        )}
      </div>

      <div className="folders-grid">
        {isEmpty && (
          <div className="folders-empty-cta" onClick={onCreateFolder}>
            <span className="folders-empty-cta__icon">📁</span>
            <span className="folders-empty-cta__text">Creá tu primera carpeta</span>
          </div>
        )}

        {Array.isArray(folders) &&
          folders.map((folder) => {
            if (!folder || !folder.id) return null;
            const progress = 45;
            return (
              <div
                key={folder.id}
                className={`folder-card ${selectedFolder === folder.id ? "active" : ""}`}
                onClick={() => navigate(`/folder/${folder.id}`)}
              >
                <div className="folder-icon">📁</div>
                <div className="folder-name">{folder.name || "Sin nombre"}</div>
                <div className="folder-count">{folder.chatCount || 0} chats</div>

                {/* Tool buttons inside card */}
                <div className="folder-card-tools" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="folder-tool-btn folder-tool-btn--flash"
                    title="Flashcards"
                    onClick={(e) => { e.stopPropagation(); navigate(`/folder/${folder.id}/flashcards`); }}
                  >
                    🧠
                  </button>
                  <button
                    className="folder-tool-btn folder-tool-btn--dev"
                    title="Preguntas a desarrollo"
                    onClick={(e) => { e.stopPropagation(); navigate(`/folder/${folder.id}/dev-questions`); }}
                  >
                    ✍️
                  </button>
                </div>

                <div className="folder-progress">
                  <svg className="progress-ring" width="50" height="50">
                    <circle className="progress-ring-circle-bg" cx="25" cy="25" r="20" />
                    <circle
                      className="progress-ring-circle"
                      cx="25" cy="25" r="20"
                      style={{ strokeDasharray: `${(progress / 100) * 125.6} 125.6` }}
                    />
                  </svg>
                  <div className="progress-text">{progress}%</div>
                </div>
              </div>
            );
          })}
      </div>

      {selectedFolder && (
        <div className="folder-detail">
          <div className="folder-detail-header">
            <h3>{folders.find((f) => f.id === selectedFolder)?.name || "Carpeta"}</h3>
            <div className="folder-actions">
              <button className="btn-add-chat" onClick={() => setShowAddChat(!showAddChat)}>
                + Agregar chat
              </button>
              <button
                className="btn-flashcards"
                onClick={() => navigate(`/folder/${selectedFolder}/flashcards`)}
              >
                🧠 Flashcards
              </button>
              <button
                className="btn-dev-questions"
                onClick={() => navigate(`/folder/${selectedFolder}/dev-questions`)}
              >
                ✍️ Desarrollo
              </button>
              <button className="btn-exam" onClick={() => generateExam(selectedFolder)}>
                📄 Examen
              </button>
            </div>
          </div>

          {showAddChat && (
            <div className="add-chat-modal">
              <h4>Seleccioná un chat para agregar</h4>
              <div className="chat-selector">
                {Array.isArray(allChats) &&
                  allChats.map((chat) => {
                    if (!chat || !(chat.chatId || chat.id)) return null;
                    return (
                      <div
                        key={chat.chatId || chat.id}
                        className="chat-selector-item"
                        onClick={() => {
                          assignChatToFolder(chat.chatId || chat.id, selectedFolder);
                          setShowAddChat(false);
                        }}
                      >
                        <div className="chat-selector-title">{chat.title || "Sin título"}</div>
                        <div className="chat-selector-date">
                          {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <button onClick={() => setShowAddChat(false)}>Cerrar</button>
            </div>
          )}

          {isLoadingChats ? (
            <p>Cargando chats...</p>
          ) : (
            <div className="folder-chats">
              {(!folderChats || folderChats.length === 0) && (
                <p className="empty-state">Esta carpeta está vacía</p>
              )}
              {Array.isArray(folderChats) &&
                folderChats.map((chat) => {
                  if (!chat || !(chat.chatId || chat.id)) return null;
                  return (
                    <div
                      key={chat.chatId || chat.id}
                      className="folder-chat-item folder-chat-item--clickable"
                      onClick={() => navigate(`/chat?id=${chat.chatId || chat.id}`)}
                    >
                      <div className="folder-chat-title">{chat.title || "Sin título"}</div>
                      <div className="folder-chat-date">
                        {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}
                      </div>
                      <div className="folder-chat-arrow">→</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressView({ folders, allChats }) {
  return (
    <div className="progress-view">
      <h2>Tu Progreso</h2>
      <div className="progress-stats">
        <div className="progress-stat-card">
          <div className="progress-stat-value">{allChats.length}</div>
          <div className="progress-stat-label">Chats totales</div>
        </div>
        <div className="progress-stat-card">
          <div className="progress-stat-value">{folders.length}</div>
          <div className="progress-stat-label">Carpetas</div>
        </div>
        <div className="progress-stat-card">
          <div className="progress-stat-value">{folders.reduce((s, f) => s + (f.chatCount || 0), 0)}</div>
          <div className="progress-stat-label">Chats organizados</div>
        </div>
      </div>
      <div className="progress-chart">
        <h3>Actividad reciente</h3>
        <p className="empty-state">Próximamente: gráficos de progreso</p>
      </div>
    </div>
  );
}
