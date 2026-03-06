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

function trackStudyAction(actionType) {
  if (window.fbq) {
    window.fbq("trackCustom", "StudyAction", { action_type: actionType });
  }
}

// ── Animated Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ target }) {
  const RADIUS = 20;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (target == null) return;
    const t = setTimeout(() => setDisplayed(target), 120);
    return () => clearTimeout(t);
  }, [target]);

  const dash = (displayed / 100) * CIRCUMFERENCE;

  return (
    <div className="folder-progress">
      <svg className="progress-ring" width="50" height="50">
        <circle className="progress-ring-circle-bg" cx="25" cy="25" r={RADIUS} />
        <circle
          className="progress-ring-circle"
          cx="25"
          cy="25"
          r={RADIUS}
          style={{
            strokeDasharray: `${dash} ${CIRCUMFERENCE}`,
            transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </svg>
      <div className="progress-text">
        {target == null ? "…" : `${Math.round(displayed)}%`}
      </div>
    </div>
  );
}

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

// ── Pick Folder Modal ───────────────────────────────────────────────────────
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

// ── File Upload Modal ───────────────────────────────────────────────────────
const MODAL_FILES_PAGE_SIZE = 4;

function FileUploadModal({ folderId, folderName, onClose, onUploaded }) {
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  // Existing files state
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [visibleCount, setVisibleCount] = useState(MODAL_FILES_PAGE_SIZE);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadExistingFiles(); }, [folderId]);

  async function loadExistingFiles() {
    setLoadingFiles(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExistingFiles(Array.isArray(data) ? data : []);
    } catch {
      setExistingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function deleteFile(fileId) {
    setDeletingId(fileId);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/file/${folderId}/${fileId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      setExistingFiles((prev) => prev.filter((f) => f.fileId !== fileId));
    } catch (err) {
      console.error("Error al eliminar archivo", err);
    } finally {
      setDeletingId(null);
    }
  }

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e) {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }
  function handleFileInput(e) { if (e.target.files[0]) setFile(e.target.files[0]); }

  function getFileIcon(name) {
    if (!name) return "📄";
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📕";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📌";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    return "📄";
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const token = getToken?.() || "";
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Error al subir el archivo");
      const data = await res.json();
      setSuccess(true);
      // Add to existing list immediately
      setExistingFiles((prev) => [{ fileId: data.fileId, name: file.name, folderId }, ...prev]);
      setTimeout(() => {
        onUploaded(data.fileId);
        setFile(null);
        setSuccess(false);
        setError(null);
      }, 1200);
    } catch (err) {
      setError(err.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  const visibleFiles = existingFiles.slice(0, visibleCount);
  const hiddenCount = existingFiles.length - visibleCount;

  return (
    <div className="file-upload-overlay" onClick={onClose}>
      <div className="file-upload-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="file-upload-header">
          <div className="file-upload-header__left">
            <div className="file-upload-header__icon-wrap">
              <span className="file-upload-header__icon">📎</span>
            </div>
            <div>
              <p className="file-upload-header__title">Archivos</p>
              <p className="file-upload-header__sub">📁 {folderName}</p>
            </div>
          </div>
          <button className="file-upload-close" onClick={onClose}>✕</button>
        </div>

        <div className="file-upload-body">

          {/* ── Upload section ── */}
          <div className="file-upload-section-label">Subir nuevo archivo</div>
          {!file ? (
            <div
              className={`file-drop-zone ${isDragging ? "file-drop-zone--active" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileInput}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
              />
              <div className="file-drop-zone__icon">{isDragging ? "✨" : "☁️"}</div>
              <p className="file-drop-zone__title">
                {isDragging ? "Soltá el archivo acá" : "Arrastrá o hacé clic para subir"}
              </p>
              <p className="file-drop-zone__sub">PDF, Word, Excel, imágenes y más</p>
              <button
                className="file-drop-zone__btn"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                type="button"
              >
                Seleccionar archivo
              </button>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-preview__card">
                <div className="file-preview__icon">{getFileIcon(file.name)}</div>
                <div className="file-preview__info">
                  <p className="file-preview__name">{file.name}</p>
                  <p className="file-preview__size">{formatSize(file.size)}</p>
                </div>
                {!uploading && !success && (
                  <button className="file-preview__remove" onClick={() => setFile(null)}>✕</button>
                )}
              </div>
              {success && (
                <div className="file-upload-success">
                  <span className="file-upload-success__icon">✅</span>
                  <span>¡Archivo subido con éxito!</span>
                </div>
              )}
              {uploading && (
                <div className="file-upload-progress-bar">
                  <div className="file-upload-progress-bar__fill" />
                </div>
              )}
              {error && <p className="file-upload-error">{error}</p>}
            </div>
          )}

          {/* Upload button (inline, compact) */}
          {file && (
            <button
              className="file-upload-confirm file-upload-confirm--inline"
              onClick={handleUpload}
              disabled={uploading || success}
            >
              {uploading ? (
                <span className="file-upload-confirm__loading">
                  <span className="file-upload-spinner" />
                  Subiendo…
                </span>
              ) : success ? "¡Listo! 🎉" : "Subir archivo"}
            </button>
          )}

          {/* ── Existing files section ── */}
          <div className="file-upload-divider" />
          <div className="file-upload-section-label">
            Archivos en esta carpeta
            {!loadingFiles && existingFiles.length > 0 && (
              <span className="file-upload-section-badge">{existingFiles.length}</span>
            )}
          </div>

          {loadingFiles ? (
            <div className="folder-files-loading">
              <div className="folder-files-skeleton" />
              <div className="folder-files-skeleton folder-files-skeleton--short" />
            </div>
          ) : existingFiles.length === 0 ? (
            <p className="file-upload-empty-files">No hay archivos subidos todavía.</p>
          ) : (
            <>
              <div className="folder-files-list">
                {visibleFiles.map((f) => (
                  <div
                    key={f.fileId}
                    className={`folder-file-item ${deletingId === f.fileId ? "folder-file-item--deleting" : ""}`}
                  >
                    <div className="folder-file-item__icon">{getFileIcon(f.name)}</div>
                    <div className="folder-file-item__info">
                      <p className="folder-file-item__name">{f.name}</p>
                    </div>
                    <button
                      className="folder-file-item__delete"
                      onClick={() => deleteFile(f.fileId)}
                      disabled={deletingId === f.fileId}
                      title="Eliminar archivo"
                    >
                      {deletingId === f.fileId
                        ? <span className="folder-file-delete-spinner" />
                        : "✕"}
                    </button>
                  </div>
                ))}
              </div>
              {hiddenCount > 0 && (
                <button
                  className="folder-files-show-more"
                  onClick={() => setVisibleCount((c) => c + MODAL_FILES_PAGE_SIZE)}
                >
                  Ver {hiddenCount} más ▼
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="file-upload-footer">
          <button className="file-upload-cancel" onClick={onClose} disabled={uploading}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folder Files Panel ──────────────────────────────────────────────────────
const FILES_PAGE_SIZE = 4;

function FolderFilesPanel({ folderId, folderName, onUpload }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(FILES_PAGE_SIZE);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadFiles();
  }, [folderId]);

  async function loadFiles() {
    setLoading(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(fileId) {
    setDeletingId(fileId);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/file/${folderId}/${fileId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      setFiles((prev) => {
        const next = prev.filter((f) => f.fileId !== fileId);
        // Si al borrar el último visible hay más, mantenemos el visibleCount
        // para que el siguiente aparezca automáticamente
        return next;
      });
    } catch (err) {
      console.error("Error al eliminar archivo", err);
    } finally {
      setDeletingId(null);
    }
  }

  function getFileIcon(name) {
    if (!name) return "📄";
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📕";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📌";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    return "📄";
  }

  const visibleFiles = files.slice(0, visibleCount);
  const hiddenCount = files.length - visibleCount;

  return (
    <div className="folder-files-panel">
      <div className="folder-files-panel__header">
        <div className="folder-files-panel__header-left">
          <span className="folder-files-panel__header-icon">📎</span>
          <span className="folder-files-panel__title">Archivos</span>
          {!loading && (
            <span className="folder-files-panel__badge">{files.length}</span>
          )}
        </div>
        <button
          className="folder-files-panel__upload-btn"
          onClick={onUpload}
          type="button"
        >
          <span>+</span> Subir archivo
        </button>
      </div>

      {loading ? (
        <div className="folder-files-loading">
          <div className="folder-files-skeleton" />
          <div className="folder-files-skeleton folder-files-skeleton--short" />
        </div>
      ) : files.length === 0 ? (
        <div className="folder-files-empty" onClick={onUpload}>
          <span className="folder-files-empty__icon">📂</span>
          <p className="folder-files-empty__text">No hay archivos todavía</p>
          <span className="folder-files-empty__cta">Subí el primero →</span>
        </div>
      ) : (
        <>
          <div className="folder-files-list">
            {visibleFiles.map((file) => (
              <div
                key={file.fileId}
                className={`folder-file-item ${deletingId === file.fileId ? "folder-file-item--deleting" : ""}`}
              >
                <div className="folder-file-item__icon">{getFileIcon(file.name)}</div>
                <div className="folder-file-item__info">
                  <p className="folder-file-item__name">{file.name}</p>
                  <p className="folder-file-item__id">ID: {file.fileId.slice(0, 8)}…</p>
                </div>
                <button
                  className="folder-file-item__delete"
                  onClick={() => deleteFile(file.fileId)}
                  disabled={deletingId === file.fileId}
                  title="Eliminar archivo"
                >
                  {deletingId === file.fileId ? (
                    <span className="folder-file-delete-spinner" />
                  ) : "✕"}
                </button>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              className="folder-files-show-more"
              onClick={() => setVisibleCount((c) => c + FILES_PAGE_SIZE)}
            >
              Ver {hiddenCount} más ▼
            </button>
          )}
        </>
      )}
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
  const [pickFolderMode, setPickFolderMode] = useState(null);
  const [folderProgress, setFolderProgress] = useState({});
  const [folderChatCounts, setFolderChatCounts] = useState({});
  const [organizedChatIds, setOrganizedChatIds] = useState(new Set());
  const [folderStats, setFolderStats] = useState({});
  const [selectedProgressFolder, setSelectedProgressFolder] = useState(null);
  const [loadingProgressFolder, setLoadingProgressFolder] = useState(false);
  // File upload state
  const [uploadModalFolder, setUploadModalFolder] = useState(null); // { id, name }
  const [filesPanelRefresh, setFilesPanelRefresh] = useState({});   // folderId → counter

  useEffect(() => {
    loadFolders();
    loadAllChats();
  }, []);

  async function loadFolderProgressBatch(folderList) {
    if (!folderList.length) return;
    const token = getToken?.() || "";

    const results = await Promise.allSettled(
      folderList.map((folder) =>
        fetch(`${API_BASE}/folder/${folder.id}/progress`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : { percentage: 0 }))
      )
    );

    const progressMap = {};
    folderList.forEach((folder, i) => {
      const result = results[i];
      progressMap[folder.id] =
        result.status === "fulfilled" ? (result.value.percentage ?? 0) : 0;
    });

    setFolderProgress(progressMap);
  }

  async function loadFolderChatCountsBatch(folderList) {
    if (!folderList.length) return;
    const token = getToken?.() || "";

    const results = await Promise.allSettled(
      folderList.map((folder) =>
        fetch(`${API_BASE}/folder/${folder.id}/chats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : []))
      )
    );

    const countMap = {};
    const allOrganizedIds = new Set();

    folderList.forEach((folder, i) => {
      const result = results[i];
      const chats =
        result.status === "fulfilled" && Array.isArray(result.value)
          ? result.value
          : [];
      countMap[folder.id] = chats.length;
      chats.forEach((chat) => {
        const id = chat.chatId || chat.id;
        if (id) allOrganizedIds.add(id);
      });
    });

    setFolderChatCounts(countMap);
    setOrganizedChatIds(allOrganizedIds);
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
        ? data.map((folder) => ({
            id: folder.folderId || folder.id,
            name: folder.name,
            chatCount: 0,
            createdAt: folder.createdAt,
          }))
        : [];
      setFolders(processed);
      loadFolderProgressBatch(processed);
      loadFolderChatCountsBatch(processed);
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
      const chats = Array.isArray(data) ? data : [];
      setFolderChats(chats);
      setSelectedFolder(folderId);
      setFolderChatCounts((prev) => ({ ...prev, [folderId]: chats.length }));
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
      loadFolderChatCountsBatch(folders);
      setOrganizedChatIds((prev) => new Set([...prev, chatId]));
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

  async function loadFolderStatsForProgress(folderId) {
    if (folderStats[folderId]) {
      setSelectedProgressFolder(folderId);
      return;
    }
    setLoadingProgressFolder(true);
    setSelectedProgressFolder(folderId);
    try {
      const token = getToken?.() || "";
      const [flashRes, devRes] = await Promise.allSettled([
        fetch(`${API_BASE}/folder/${folderId}/flashcards`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/folder/${folderId}/dev-questions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => (r.ok ? r.json() : [])),
      ]);

      setFolderStats((prev) => ({
        ...prev,
        [folderId]: {
          flashcards: flashRes.status === "fulfilled" && Array.isArray(flashRes.value) ? flashRes.value : [],
          devQuestions: devRes.status === "fulfilled" && Array.isArray(devRes.value) ? devRes.value : [],
        },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProgressFolder(false);
    }
  }

  // Trigger refresh in FolderFilesPanel after upload
  function handleFileUploaded(folderId) {
    setFilesPanelRefresh((prev) => ({ ...prev, [folderId]: (prev[folderId] || 0) + 1 }));
  }

  const totalOrganizedChats = Object.values(folderChatCounts).reduce((s, c) => s + c, 0);

  const unorganizedChats = allChats.filter(
    (chat) => !organizedChatIds.has(chat.chatId || chat.id)
  );
  const unorganizedCount = unorganizedChats.length;

  const foldersWithCounts = folders.map((f) => ({
    ...f,
    chatCount: folderChatCounts[f.id] ?? 0,
  }));

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
          folders={foldersWithCounts}
          onAssign={(folderId) => assignChatToFolder(quickAssignChat, folderId)}
          onClose={() => setQuickAssignChat(null)}
        />
      )}

      {pickFolderMode && (
        <PickFolderModal
          mode={pickFolderMode}
          folders={foldersWithCounts}
          onPick={(folderId) => {
            trackStudyAction(pickFolderMode === "flashcards" ? "flashcards" : "dev_questions");
            navigate(`/folder/${folderId}/${pickFolderMode}`);
            setPickFolderMode(null);
          }}
          onClose={() => setPickFolderMode(null)}
        />
      )}

      {uploadModalFolder && (
        <FileUploadModal
          folderId={uploadModalFolder.id}
          folderName={uploadModalFolder.name}
          onClose={() => setUploadModalFolder(null)}
          onUploaded={(fileId) => {
            handleFileUploaded(uploadModalFolder.id);
            setUploadModalFolder(null);
          }}
        />
      )}

      {/* Header */}
      <div className="study-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <div className="study-header-text">
          <h1 className="study-title shine-platinum">Mis Estudios</h1>
          <p className="study-subtitle">Tu espacio de aprendizaje personalizado</p>
        </div>
      </div>

      {/* Tools strip */}
      <div className="study-tools-strip">
        <div className="study-tool-card study-tool-card--chat" onClick={() => navigate("/chat")}>
          <div className="study-tool-card__glow" />
          <div className="study-tool-card__icon-wrap">
            <span className="study-tool-card__icon">📐</span>
          </div>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Chat Matemático</span>
            <span className="study-tool-card__sub">Resolvé problemas con IA paso a paso</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>

        <div className="study-tool-card study-tool-card--flash" onClick={() => { trackStudyAction("flashcards"); setPickFolderMode("flashcards"); }}>
          <div className="study-tool-card__glow" />
          <div className="study-tool-card__icon-wrap">
            <span className="study-tool-card__icon">🧠</span>
          </div>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Flashcards</span>
            <span className="study-tool-card__sub">Practicá con preguntas de opción múltiple</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>

        <div className="study-tool-card study-tool-card--dev" onClick={() => { trackStudyAction("dev_questions"); setPickFolderMode("dev-questions"); }}>
          <div className="study-tool-card__glow" />
          <div className="study-tool-card__icon-wrap">
            <span className="study-tool-card__icon">✍️</span>
          </div>
          <div className="study-tool-card__text">
            <span className="study-tool-card__title">Preguntas a desarrollo</span>
            <span className="study-tool-card__sub">Escribí y recibí corrección con IA</span>
          </div>
          <span className="study-tool-card__arrow">→</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="study-stats-row">
        <div className="study-stat">
          <span className="study-stat__value">{allChats.length}</span>
          <span className="study-stat__label">Chats totales</span>
        </div>
        <div className="study-stat-divider" />
        <div className="study-stat">
          <span className="study-stat__value">{folders.length}</span>
          <span className="study-stat__label">Carpetas</span>
        </div>
        <div className="study-stat-divider" />
        <div className="study-stat">
          <span className="study-stat__value">{totalOrganizedChats}</span>
          <span className="study-stat__label">Chats organizados</span>
        </div>
        <div className="study-stat-divider" />
        <div className="study-stat">
          <span className="study-stat__value">{unorganizedCount}</span>
          <span className="study-stat__label">Sin organizar</span>
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
            folders={foldersWithCounts}
            folderProgress={folderProgress}
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
            onUploadFile={(folder) => setUploadModalFolder(folder)}
            filesPanelRefresh={filesPanelRefresh}
          />
        )}
        {view === "progress" && (
          <ProgressView
            folders={foldersWithCounts}
            allChats={allChats}
            totalOrganizedChats={totalOrganizedChats}
            folderProgress={folderProgress}
            folderStats={folderStats}
            selectedProgressFolder={selectedProgressFolder}
            loadingProgressFolder={loadingProgressFolder}
            onSelectFolder={loadFolderStatsForProgress}
          />
        )}
      </div>

      {/* Upgrade Banner */}
      <div className="study-upgrade-banner" onClick={() => navigate("/plans")}>
        <div className="study-upgrade-banner__glow" />
        <div className="study-upgrade-banner__left">
          <div className="study-upgrade-banner__icon">⚡</div>
          <div className="study-upgrade-banner__text">
            <span className="study-upgrade-banner__title">Desbloqueá el plan Premium</span>
            <span className="study-upgrade-banner__desc">Carpetas ilimitadas, flashcards avanzadas y exportación de exámenes en PDF</span>
          </div>
        </div>
        <div className="study-upgrade-banner__actions">
          <span className="study-upgrade-banner__price">Desde <strong>$4.99/mes</strong></span>
          <button
            className="study-upgrade-banner__btn"
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate("/plans"); }}
          >
            Ver planes →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folders View ────────────────────────────────────────────────────────────
function FoldersView({
  navigate,
  folders,
  folderProgress,
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
  onUploadFile,
  filesPanelRefresh,
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
          folders.map((folder, i) => {
            if (!folder || !folder.id) return null;
            const progress = folderProgress[folder.id] ?? null;

            return (
              <div
                key={folder.id}
                className={`folder-card ${selectedFolder === folder.id ? "active" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate(`/folder/${folder.id}`)}
              >
                <div className="folder-card__bg" />
                <ProgressRing target={progress} />
                <div className="folder-icon">📁</div>
                <div className="folder-name">{folder.name || "Sin nombre"}</div>
                <div className="folder-count">{folder.chatCount} chats</div>

                <div className="folder-card-tools" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="folder-tool-btn folder-tool-btn--flash"
                    title="Flashcards"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackStudyAction("flashcards");
                      navigate(`/folder/${folder.id}/flashcards`);
                    }}
                  >
                    🧠
                  </button>
                  <button
                    className="folder-tool-btn folder-tool-btn--dev"
                    title="Preguntas a desarrollo"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackStudyAction("dev_questions");
                      navigate(`/folder/${folder.id}/dev-questions`);
                    }}
                  >
                    ✍️
                  </button>
                  <button
                    className="folder-tool-btn folder-tool-btn--files"
                    title="Subir archivo"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadFile({ id: folder.id, name: folder.name });
                    }}
                  >
                    📎
                  </button>
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
                className="btn-upload-file"
                onClick={() => {
                  const folder = folders.find((f) => f.id === selectedFolder);
                  onUploadFile({ id: selectedFolder, name: folder?.name || "Carpeta" });
                }}
              >
                📎 Subir archivo
              </button>
              <button className="btn-flashcards" onClick={() => { trackStudyAction("flashcards"); navigate(`/folder/${selectedFolder}/flashcards`); }}>
                🧠 Flashcards
              </button>
              <button className="btn-dev-questions" onClick={() => { trackStudyAction("dev_questions"); navigate(`/folder/${selectedFolder}/dev-questions`); }}>
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

          {/* Files Panel */}
          <FolderFilesPanel
            key={`${selectedFolder}-${filesPanelRefresh[selectedFolder] || 0}`}
            folderId={selectedFolder}
            folderName={folders.find((f) => f.id === selectedFolder)?.name || "Carpeta"}
            onUpload={() => {
              const folder = folders.find((f) => f.id === selectedFolder);
              onUploadFile({ id: selectedFolder, name: folder?.name || "Carpeta" });
            }}
          />

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

// ── Progress View ───────────────────────────────────────────────────────────
function ProgressView({
  folders,
  allChats,
  totalOrganizedChats,
  folderProgress,
  folderStats,
  selectedProgressFolder,
  loadingProgressFolder,
  onSelectFolder,
}) {
  const stats = selectedProgressFolder ? folderStats[selectedProgressFolder] : null;

  function calcDevStats(devQuestions) {
    if (!devQuestions || devQuestions.length === 0) return { count: 0, avgScore: null };
    const avgScore =
      devQuestions.length > 0
        ? Math.round((devQuestions.reduce((s, q) => s + (q.score || 0), 0) / devQuestions.length) * 10) / 10
        : null;
    return { count: devQuestions.length, avgScore };
  }

  const devStats = stats ? calcDevStats(stats.devQuestions) : null;
  const flashCount = stats ? stats.flashcards.length : null;
  const lastFlashcards = stats ? [...stats.flashcards].reverse().slice(0, 5) : [];
  const lastDevQuestions = stats ? [...stats.devQuestions].reverse().slice(0, 5) : [];

  const devScorePercent = devStats?.avgScore != null ? (devStats.avgScore / 10) * 100 : 0;

  function scoreColor(score) {
    if (score == null) return "rgba(255,255,255,0.3)";
    if (score >= 7) return "#22c55e";
    if (score >= 5) return "#f97316";
    return "#ef4444";
  }

  return (
    <div className="progress-view">
      <div className="progress-global">
        <div className="progress-stat-card">
          <div className="progress-stat-value">{allChats.length}</div>
          <div className="progress-stat-label">Chats totales</div>
        </div>
        <div className="progress-stat-card">
          <div className="progress-stat-value">{folders.length}</div>
          <div className="progress-stat-label">Carpetas</div>
        </div>
        <div className="progress-stat-card">
          <div className="progress-stat-value">{totalOrganizedChats}</div>
          <div className="progress-stat-label">Chats organizados</div>
        </div>
      </div>

      <div className="progress-folders-section">
        <h3 className="progress-section-title">Progreso por carpeta</h3>
        {folders.length === 0 && (
          <p className="empty-state">Todavía no tenés carpetas.</p>
        )}
        <div className="progress-folder-list">
          {folders.map((folder) => {
            const pct = folderProgress[folder.id] ?? null;
            const isSelected = selectedProgressFolder === folder.id;
            return (
              <div
                key={folder.id}
                className={`progress-folder-row ${isSelected ? "progress-folder-row--active" : ""}`}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="progress-folder-row__left">
                  <span className="progress-folder-row__icon">📁</span>
                  <div className="progress-folder-row__info">
                    <span className="progress-folder-row__name">{folder.name}</span>
                    <span className="progress-folder-row__count">{folder.chatCount} chats</span>
                  </div>
                </div>
                <div className="progress-folder-row__right">
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: pct != null ? `${pct}%` : "0%",
                        transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />
                  </div>
                  <span className="progress-folder-row__pct">
                    {pct != null ? `${pct}%` : "…"}
                  </span>
                  <span className="progress-folder-row__arrow">{isSelected ? "▾" : "›"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedProgressFolder && (
        <div className="progress-folder-detail">
          {loadingProgressFolder ? (
            <div className="progress-detail-loading">Cargando estadísticas…</div>
          ) : stats ? (
            <>
              <h3 className="progress-section-title">
                {folders.find((f) => f.id === selectedProgressFolder)?.name || "Carpeta"}
              </h3>

              <div className="progress-detail-grid">
                <div className="progress-detail-card progress-detail-card--flash">
                  <div className="progress-detail-card__header">
                    <span className="progress-detail-card__icon">🧠</span>
                    <span className="progress-detail-card__title">Flashcards</span>
                  </div>
                  {flashCount === 0 ? (
                    <p className="progress-detail-card__empty">Todavía no respondiste flashcards en esta carpeta.</p>
                  ) : (
                    <>
                      <div className="progress-detail-card__main">
                        <span className="progress-detail-card__big">{flashCount}</span>
                        <span className="progress-detail-card__label">respondidas correctamente</span>
                      </div>
                      <div className="progress-dev-answers">
                        <p className="progress-dev-answers__title">Últimas correctas</p>
                        {lastFlashcards.map((q) => (
                          <div key={q.SK} className="progress-dev-answer-item">
                            <div className="progress-dev-answer-item__top">
                              <span className="progress-dev-answer-item__score" style={{ color: "#f97316" }}>✓</span>
                              <span className="progress-dev-answer-item__date">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-AR") : ""}
                              </span>
                            </div>
                            <p className="progress-dev-answer-item__question">
                              {q.question?.replace(/\\[()\[\]]/g, "").slice(0, 90)}…
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="progress-detail-card progress-detail-card--dev">
                  <div className="progress-detail-card__header">
                    <span className="progress-detail-card__icon">✍️</span>
                    <span className="progress-detail-card__title">Preguntas a desarrollo</span>
                  </div>
                  {devStats.count === 0 ? (
                    <p className="progress-detail-card__empty">Todavía no hiciste preguntas a desarrollo en esta carpeta.</p>
                  ) : (
                    <>
                      <div className="progress-detail-card__main">
                        <span className="progress-detail-card__big">{devStats.count}</span>
                        <span className="progress-detail-card__label">preguntas respondidas</span>
                      </div>
                      {devStats.avgScore != null && (
                        <div className="progress-detail-score">
                          <div className="progress-detail-score__row">
                            <span className="progress-detail-score__label">Puntaje promedio</span>
                            <span
                              className="progress-detail-score__value"
                              style={{ color: scoreColor(devStats.avgScore) }}
                            >
                              {devStats.avgScore}/10
                            </span>
                          </div>
                          <div className="progress-detail-score__bar-bg">
                            <div
                              className="progress-detail-score__bar-fill"
                              style={{
                                width: `${devScorePercent}%`,
                                background: scoreColor(devStats.avgScore),
                                transition: "width 900ms cubic-bezier(0.22,1,0.36,1)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="progress-dev-answers">
                        <p className="progress-dev-answers__title">Últimas respuestas</p>
                        {lastDevQuestions.map((q) => (
                          <div key={q.SK} className="progress-dev-answer-item">
                            <div className="progress-dev-answer-item__top">
                              <span
                                className="progress-dev-answer-item__score"
                                style={{ color: scoreColor(q.score) }}
                              >
                                {q.score}/10
                              </span>
                              <span className="progress-dev-answer-item__date">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-AR") : ""}
                              </span>
                            </div>
                            <p className="progress-dev-answer-item__question">
                              {q.question?.replace(/\\[()\[\]]/g, "").slice(0, 90)}…
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
