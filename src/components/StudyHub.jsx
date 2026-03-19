import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getEmailFromToken } from "../auth";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import PlanLimitModal from "./PlanLimitModal";
import "katex/dist/katex.min.css";

const API_BASE = "http://localhost:3000";

const FOLDER_SUGGESTIONS = [
  "Cálculo diferencial","Cálculo integral","Álgebra lineal","Estadística",
  "Geometría analítica","Ecuaciones diferenciales","Trigonometría",
  "Probabilidad","Análisis numérico","Física matemática",
];

const FOLDER_COLORS = [
  { id: "violet", label: "Violeta", value: "rgba(124,92,255,0.35)" },
  { id: "blue",   label: "Azul",    value: "rgba(59,130,246,0.35)" },
  { id: "green",  label: "Verde",   value: "rgba(34,197,94,0.35)"  },
  { id: "orange", label: "Naranja", value: "rgba(249,115,22,0.35)" },
  { id: "pink",   label: "Rosa",    value: "rgba(236,72,153,0.35)" },
  { id: "teal",   label: "Teal",    value: "rgba(20,184,166,0.35)" },
  { id: "red",    label: "Rojo",    value: "rgba(239,68,68,0.35)"  },
  { id: "yellow", label: "Amarillo",value: "rgba(234,179,8,0.35)"  },
];

function trackStudyAction(actionType) {
  if (window.fbq) window.fbq("trackCustom", "StudyAction", { action_type: actionType });
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
        <circle className="progress-ring-circle" cx="25" cy="25" r={RADIUS}
          style={{ strokeDasharray: `${dash} ${CIRCUMFERENCE}`, transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </svg>
      <div className="progress-text">{target == null ? "…" : `${Math.round(displayed)}%`}</div>
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
    setFiltered(!name.trim() ? FOLDER_SUGGESTIONS : FOLDER_SUGGESTIONS.filter((s) => s.toLowerCase().includes(name.toLowerCase())));
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
          <input ref={inputRef} type="text" className="create-folder-input"
            placeholder="Nombre de la carpeta..." value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onClose(); }} />
          {filtered.length > 0 && (
            <div className="create-folder-suggestions">
              <p className="create-folder-suggestions__label">Sugerencias</p>
              <div className="create-folder-suggestions__chips">
                {filtered.slice(0, 6).map((s) => (
                  <button key={s} className="folder-suggestion-chip" onClick={() => handleCreate(s)} disabled={loading}>{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="create-folder-footer">
          <button className="create-folder-cancel" onClick={onClose}>Cancelar</button>
          <button className="create-folder-confirm" onClick={() => handleCreate()} disabled={!name.trim() || loading}>
            {loading ? "Creando…" : "Crear carpeta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Folder Modal ─────────────────────────────────────────────────────
function DeleteFolderModal({ folderName, loading, onConfirm, onClose }) {
  return (
    <div className="create-folder-overlay" onClick={!loading ? onClose : undefined}>
      <div className="create-folder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-folder-header">
          <h3 className="create-folder-title">⚠️ Eliminar carpeta</h3>
          <button className="create-folder-close" onClick={onClose} disabled={loading}>✕</button>
        </div>
        <div className="create-folder-body">
          <p style={{ color: "rgba(255,255,255,0.85)", marginBottom: "0.75rem" }}>
            Estás por eliminar <strong>"{folderName}"</strong>. Esta acción no se puede deshacer.
          </p>
          <ul style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", paddingLeft: "1.25rem", lineHeight: "1.8" }}>
            <li>Los chats asociados serán <strong>desvinculados</strong> (no eliminados)</li>
            <li>Los archivos subidos serán <strong>eliminados permanentemente</strong></li>
            <li>Las flashcards y preguntas de desarrollo serán <strong>eliminadas</strong></li>
          </ul>
        </div>
        <div className="create-folder-footer">
          <button className="create-folder-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ background: "rgba(239,68,68,0.85)", color: "#fff", border: "1px solid rgba(239,68,68,0.5)", borderRadius: "8px", padding: "0.5rem 1.25rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {loading ? "Eliminando…" : "Sí, eliminar"}
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
          {folders.length === 0 && <p className="pick-folder-empty">No tenés carpetas todavía. Creá una primero.</p>}
          {folders.map((folder) => (
            <button key={folder.id} className="pick-folder-btn" onClick={() => onPick(folder.id)}>
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
            <button key={folder.id} className="quick-assign-folder-btn" onClick={() => onAssign(folder.id)}>
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

// ── File Upload Modal (sin cambios, copiado tal cual) ───────────────────────
const MODAL_FILES_PAGE_SIZE = 4;
const MAX_FILES_PER_UPLOAD = 5;

function FileUploadModal({ folderId, folderName, onClose, onUploaded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [visibleCount, setVisibleCount] = useState(MODAL_FILES_PAGE_SIZE);
  const [deletingId, setDeletingId] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => { loadExistingFiles(); loadUsage(); }, [folderId]);

  async function loadUsage() {
    setLoadingUsage(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/files/usage`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      setUsage(await res.json());
    } catch { setUsage(null); } finally { setLoadingUsage(false); }
  }

  async function loadExistingFiles() {
    setLoadingFiles(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExistingFiles(Array.isArray(data) ? data : []);
    } catch { setExistingFiles([]); } finally { setLoadingFiles(false); }
  }

  async function deleteFile(fileId) {
    setDeletingId(fileId);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/file/${folderId}/${fileId}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      setExistingFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      setUsage((prev) => prev ? { ...prev, used: prev.used - 1, available: prev.available + 1 } : prev);
    } catch (err) { console.error(err); } finally { setDeletingId(null); }
  }

  const availableSlots = usage ? Math.min(usage.available, MAX_FILES_PER_UPLOAD) : MAX_FILES_PER_UPLOAD;
  const limitReached = usage ? usage.available <= 0 : false;

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e) { e.preventDefault(); setIsDragging(false); if (limitReached) return; validateAndSetFiles(Array.from(e.dataTransfer.files)); }
  function handleFileInput(e) { validateAndSetFiles(Array.from(e.target.files)); e.target.value = ""; }

  function validateAndSetFiles(selected) {
    if (limitReached) { setError(`Alcanzaste el límite de tu plan (${usage.limit} archivos por carpeta).`); return; }
    if (selected.length > availableSlots) { setError(`Solo podés subir ${availableSlots} archivo${availableSlots !== 1 ? "s" : ""} más.`); return; }
    if (selected.length > MAX_FILES_PER_UPLOAD) { setError(`Máximo ${MAX_FILES_PER_UPLOAD} archivos por vez.`); return; }
    const MAX_BYTES = 5 * 1024 * 1024;
    const oversized = selected.filter((f) => f.size > MAX_BYTES);
    if (oversized.length > 0) { setError(`${oversized.length === 1 ? `"${oversized[0].name}"` : `${oversized.length} archivos`} supera${oversized.length === 1 ? "" : "n"} el límite de 5MB.`); return; }
    setError(null);
    setFiles(selected);
  }

  function removeFile(index) { setFiles((prev) => prev.filter((_, i) => i !== index)); }

  function getFileIcon(name) {
    if (!name) return "📄";
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📕";
    if (["png","jpg","jpeg","gif","webp"].includes(ext)) return "🖼️";
    if (["doc","docx"].includes(ext)) return "📝";
    if (["xls","xlsx"].includes(ext)) return "📊";
    if (["ppt","pptx"].includes(ext)) return "📌";
    if (["zip","rar","7z"].includes(ext)) return "🗜️";
    return "📄";
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/(1024*1024)).toFixed(1)} MB`;
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true); setError(null);
    try {
      const token = getToken?.() || "";
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.usage) setUsage(errData.usage);
        if (errData.error === "FILES_LIMIT_REACHED") throw new Error(`Límite alcanzado. Tu plan permite ${errData.usage?.limit ?? "—"} archivos por carpeta.`);
        throw new Error(errData.error || "Error al subir los archivos");
      }
      const data = await res.json();
      setSuccess(true);
      const uploaded = Array.isArray(data.files) ? data.files : [data];
      setExistingFiles((prev) => [...uploaded.map((u, i) => ({ fileId: u.fileId, name: files[i]?.name || u.fileId, folderId })), ...prev]);
      setUsage((prev) => prev ? { ...prev, used: prev.used + uploaded.length, available: Math.max(0, prev.available - uploaded.length) } : prev);
      setTimeout(() => { uploaded.forEach((u) => onUploaded(u.fileId)); setFiles([]); setSuccess(false); setError(null); }, 1200);
    } catch (err) { setError(err.message || "Error al subir los archivos"); } finally { setUploading(false); }
  }

  const visibleFiles = existingFiles.slice(0, visibleCount);
  const hiddenCount = existingFiles.length - visibleCount;

  function usageBarColor() {
    if (!usage) return "rgba(255,255,255,0.15)";
    const pct = usage.used / usage.limit;
    if (pct >= 1) return "#ef4444";
    if (pct >= 0.8) return "#f97316";
    return "rgba(255,255,255,0.5)";
  }

  return (
    <div className="file-upload-overlay" onClick={onClose}>
      <div className="file-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-upload-header">
          <div className="file-upload-header__left">
            <div className="file-upload-header__icon-wrap"><span className="file-upload-header__icon">📎</span></div>
            <div>
              <p className="file-upload-header__title">Archivos</p>
              <p className="file-upload-header__sub">📁 {folderName}</p>
            </div>
          </div>
          <button className="file-upload-close" onClick={onClose}>✕</button>
        </div>
        <div className="file-upload-body">
          <div className="file-usage-bar-wrap">
            {loadingUsage ? <div className="file-usage-bar-skeleton" /> : usage ? (
              <>
                <div className="file-usage-bar-header">
                  <span className="file-usage-bar-label">Archivos en esta carpeta</span>
                  <span className="file-usage-bar-count">{usage.used} / {usage.limit}</span>
                </div>
                <div className="file-usage-bar-bg">
                  <div className="file-usage-bar-fill" style={{ width: `${Math.min(100,(usage.used/usage.limit)*100)}%`, background: usageBarColor(), transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
                {limitReached && <p className="file-usage-limit-warning">⚠️ Límite alcanzado. Eliminá archivos o mejorá tu plan.</p>}
              </>
            ) : null}
          </div>
          <div className="file-upload-section-label">Subir archivos{!loadingUsage && usage && !limitReached && <span className="file-upload-section-badge--hint"> · hasta {MAX_FILES_PER_UPLOAD} a la vez</span>}</div>
          {files.length === 0 ? (
            <div className={`file-drop-zone ${isDragging ? "file-drop-zone--active" : ""} ${limitReached ? "file-drop-zone--disabled" : ""}`}
              onDragOver={!limitReached ? handleDragOver : undefined} onDragLeave={!limitReached ? handleDragLeave : undefined}
              onDrop={!limitReached ? handleDrop : undefined} onClick={!limitReached ? () => inputRef.current?.click() : undefined}>
              <input ref={inputRef} type="file" style={{ display: "none" }} onChange={handleFileInput} accept=".pdf" multiple disabled={limitReached} />
              <div className="file-drop-zone__icon">{limitReached ? "🔒" : isDragging ? "✨" : "☁️"}</div>
              <p className="file-drop-zone__title">{limitReached ? "Límite de archivos alcanzado" : isDragging ? "Soltá los archivos acá" : "Arrastrá o hacé clic para subir"}</p>
              <p className="file-drop-zone__sub">{limitReached ? `Tu plan permite ${usage?.limit ?? "—"} archivos por carpeta` : `Solo PDFs · hasta ${availableSlots} archivo${availableSlots !== 1 ? "s" : ""} más`}</p>
              {!limitReached && <button className="file-drop-zone__btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} type="button">Seleccionar archivos</button>}
            </div>
          ) : (
            <div className="file-preview">
              {files.map((f, i) => (
                <div key={i} className="file-preview__card">
                  <div className="file-preview__icon">{getFileIcon(f.name)}</div>
                  <div className="file-preview__info"><p className="file-preview__name">{f.name}</p><p className="file-preview__size">{formatSize(f.size)}</p></div>
                  {!uploading && !success && <button className="file-preview__remove" onClick={() => removeFile(i)}>✕</button>}
                </div>
              ))}
              {success && <div className="file-upload-success"><span className="file-upload-success__icon">✅</span><span>¡Archivo{files.length > 1 ? "s subidos" : " subido"} con éxito!</span></div>}
              {uploading && <div className="file-upload-progress-bar"><div className="file-upload-progress-bar__fill" /></div>}
              {error && <p className="file-upload-error">{error}</p>}
            </div>
          )}
          {files.length === 0 && error && <p className="file-upload-error">{error}</p>}
          {files.length > 0 && (
            <button className="file-upload-confirm file-upload-confirm--inline" onClick={handleUpload} disabled={uploading || success}>
              {uploading ? <span className="file-upload-confirm__loading"><span className="file-upload-spinner" />Subiendo…</span> : success ? "¡Listo! 🎉" : `Subir ${files.length > 1 ? `${files.length} archivos` : "archivo"}`}
            </button>
          )}
          <div className="file-upload-divider" />
          <div className="file-upload-section-label">Archivos en esta carpeta{!loadingFiles && existingFiles.length > 0 && <span className="file-upload-section-badge">{existingFiles.length}</span>}</div>
          {loadingFiles ? (
            <div className="folder-files-loading"><div className="folder-files-skeleton" /><div className="folder-files-skeleton folder-files-skeleton--short" /></div>
          ) : existingFiles.length === 0 ? (
            <p className="file-upload-empty-files">No hay archivos subidos todavía.</p>
          ) : (
            <>
              <div className="folder-files-list">
                {visibleFiles.map((f) => (
                  <div key={f.fileId} className={`folder-file-item ${deletingId === f.fileId ? "folder-file-item--deleting" : ""}`}>
                    <div className="folder-file-item__icon">{getFileIcon(f.name)}</div>
                    <div className="folder-file-item__info"><p className="folder-file-item__name">{f.name}</p></div>
                    <button className="folder-file-item__delete" onClick={() => deleteFile(f.fileId)} disabled={deletingId === f.fileId} title="Eliminar archivo">
                      {deletingId === f.fileId ? <span className="folder-file-delete-spinner" /> : "✕"}
                    </button>
                  </div>
                ))}
              </div>
              {hiddenCount > 0 && <button className="folder-files-show-more" onClick={() => setVisibleCount((c) => c + MODAL_FILES_PAGE_SIZE)}>Ver {hiddenCount} más ▼</button>}
            </>
          )}
        </div>
        <div className="file-upload-footer">
          <button className="file-upload-cancel" onClick={onClose} disabled={uploading}>Cerrar</button>
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

  useEffect(() => { loadFiles(); }, [folderId]);

  async function loadFiles() {
    setLoading(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/files`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch { setFiles([]); } finally { setLoading(false); }
  }

  async function deleteFile(fileId) {
    setDeletingId(fileId);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/file/${folderId}/${fileId}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.fileId !== fileId));
    } catch (err) { console.error(err); } finally { setDeletingId(null); }
  }

  function getFileIcon(name) {
    if (!name) return "📄";
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "pdf") return "📕";
    if (["png","jpg","jpeg","gif","webp"].includes(ext)) return "🖼️";
    if (["doc","docx"].includes(ext)) return "📝";
    if (["xls","xlsx"].includes(ext)) return "📊";
    if (["ppt","pptx"].includes(ext)) return "📌";
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
          {!loading && <span className="folder-files-panel__badge">{files.length}</span>}
        </div>
        <button className="folder-files-panel__upload-btn" onClick={onUpload} type="button"><span>+</span> Subir archivos</button>
      </div>
      {loading ? (
        <div className="folder-files-loading"><div className="folder-files-skeleton" /><div className="folder-files-skeleton folder-files-skeleton--short" /></div>
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
              <div key={file.fileId} className={`folder-file-item ${deletingId === file.fileId ? "folder-file-item--deleting" : ""}`}>
                <div className="folder-file-item__icon">{getFileIcon(file.name)}</div>
                <div className="folder-file-item__info">
                  <p className="folder-file-item__name">{file.name}</p>
                  <p className="folder-file-item__id">ID: {file.fileId.slice(0, 8)}…</p>
                </div>
                <button className="folder-file-item__delete" onClick={() => deleteFile(file.fileId)} disabled={deletingId === file.fileId} title="Eliminar archivo">
                  {deletingId === file.fileId ? <span className="folder-file-delete-spinner" /> : "✕"}
                </button>
              </div>
            ))}
          </div>
          {hiddenCount > 0 && <button className="folder-files-show-more" onClick={() => setVisibleCount((c) => c + FILES_PAGE_SIZE)}>Ver {hiddenCount} más ▼</button>}
        </>
      )}
    </div>
  );
}

// ── (resto de componentes: DailyExamModal, StreakCard sin cambios) ───────────
// Copiados tal cual del original para no romper nada

function normalizeMathForExam(text) {
  if (!text) return "";
  let t = text;
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  t = t.replace(/((?<!\$)\s*)(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})/g, (match, pre, latex) => `${pre}$$${latex}$$`);
  return t;
}

function ExamMathText({ children, className, block = false }) {
  const processed = normalizeMathForExam(children ?? "");
  const Tag = block ? "div" : "span";
  return (
    <Tag className={className}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children: c }) => block ? <p>{c}</p> : <span>{c}</span> }}>
        {processed}
      </ReactMarkdown>
    </Tag>
  );
}

const DAILY_FC_COUNT = 3;

function DailyExamModal({ folders, onClose, onCompleted }) {
  const [step, setStep] = useState("pick_folder");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [progressBefore, setProgressBefore] = useState(null);
  const [progressAfter, setProgressAfter] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcSelected, setFcSelected] = useState(null);
  const [fcAnswered, setFcAnswered] = useState(false);
  const [fcResults, setFcResults] = useState([]);
  const [devQuestion, setDevQuestion] = useState(null);
  const [devAnswer, setDevAnswer] = useState("");
  const [devCorrection, setDevCorrection] = useState(null);
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [devError, setDevError] = useState("");
  const scoreColor = (s) => s >= 7 ? "#22c55e" : s >= 5 ? "#f97316" : "#ef4444";

  async function fetchProgress(folderId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/progress`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return null;
      const data = await res.json();
      return data.percentage ?? null;
    } catch { return null; }
  }

  async function pickFolder(folderId, name) {
    setSelectedFolder(folderId); setFolderName(name); setStep("flashcard_loading");
    const pBefore = await fetchProgress(folderId);
    setProgressBefore(pBefore);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/flashcards`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ isDaily: true }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cards = Array.isArray(data.flashcards) ? data.flashcards.slice(0, DAILY_FC_COUNT) : [];
      setFlashcards(cards); setFcIndex(0); setFcSelected(null); setFcAnswered(false); setFcResults([]); setStep("flashcards");
    } catch { setStep("pick_folder"); }
  }

  const currentCard = flashcards[fcIndex] ?? null;

  function handleFcSelect(optionId) {
    if (fcAnswered || !currentCard) return;
    const isCorrect = optionId === currentCard.correctId;
    setFcSelected(optionId); setFcAnswered(true);
    setFcResults((prev) => [...prev, { card: currentCard, isCorrect }]);
  }

  async function handleFcNext() {
    const lastResult = fcResults[fcResults.length - 1];
    if (lastResult?.isCorrect && currentCard) {
      const token = getToken?.() || "";
      fetch(`${API_BASE}/folder/${selectedFolder}/flashcards/correct`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ flashcards: [{ question: currentCard.question, correctId: currentCard.correctId }] }) }).catch(() => {});
    }
    const nextIndex = fcIndex + 1;
    if (nextIndex < flashcards.length) { setFcIndex(nextIndex); setFcSelected(null); setFcAnswered(false); }
    else {
      setStep("dev_loading");
      try {
        const token = getToken?.() || "";
        const res = await fetch(`${API_BASE}/folder/${selectedFolder}/dev-questions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ previousQuestions: [], isDaily: true }) });
        if (!res.ok) throw new Error();
        setDevQuestion(await res.json()); setStep("dev");
      } catch { setDevQuestion(null); setStep("dev"); }
    }
  }

  async function handleDevSubmit() {
    if (!devAnswer.trim()) return;
    setDevSubmitting(true); setDevError("");
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${selectedFolder}/dev-questions/correct`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ question: devQuestion.question, context: devQuestion.context, answer: devAnswer }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDevCorrection(data);
      fetchProgress(selectedFolder).then((pAfter) => setProgressAfter(pAfter));
    } catch { setDevError("No se pudo corregir. Intentá de nuevo."); } finally { setDevSubmitting(false); }
  }

  async function handleFinish() {
    try { const token = getToken?.() || ""; await fetch(`${API_BASE}/auth/racha`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} }); } catch { }
    onCompleted(); onClose();
  }

  const fcPhases = ["pick_folder","flashcard_loading","flashcards"];
  const devPhases = ["dev_loading","dev"];
  const fcDone = !fcPhases.includes(step);
  const devDone = step === "done";
  const fcActive = fcPhases.includes(step);
  const devActive = devPhases.includes(step);
  const progressDelta = progressAfter != null && progressBefore != null ? Math.round(progressAfter - progressBefore) : null;

  return (
    <div className="daily-exam-overlay" onClick={onClose}>
      <div className="daily-exam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="daily-exam-header">
          <div className="daily-exam-header__left">
            <div className="daily-exam-flame-icon">🔥</div>
            <div><p className="daily-exam-header__title">Examen Diario</p><p className="daily-exam-header__sub">3 flashcards + 1 pregunta a desarrollo</p></div>
          </div>
          <button className="daily-exam-close" onClick={onClose}>✕</button>
        </div>
        <div className="daily-exam-steps">
          <div className={`daily-exam-step ${fcActive ? "active" : ""} ${fcDone ? "done" : ""}`}>
            <span className="daily-exam-step__dot">{fcDone ? "✓" : "🧠"}</span>
            <span className="daily-exam-step__label">Flashcards{fcActive && step === "flashcards" && flashcards.length > 0 && <span className="daily-exam-step__sublabel"> {fcIndex+1}/{flashcards.length}</span>}</span>
          </div>
          <div className="daily-exam-step__line" />
          <div className={`daily-exam-step ${devActive ? "active" : ""} ${devDone ? "done" : ""}`}>
            <span className="daily-exam-step__dot">{devDone ? "✓" : "✍️"}</span>
            <span className="daily-exam-step__label">Desarrollo</span>
          </div>
          <div className="daily-exam-step__line" />
          <div className="daily-exam-step"><span className="daily-exam-step__dot">🔥</span><span className="daily-exam-step__label">¡Racha!</span></div>
        </div>
        <div className="daily-exam-body">
          {step === "pick_folder" && (
            <div className="daily-exam-pick">
              <p className="daily-exam-pick__title">¿De qué carpeta querés estudiar hoy?</p>
              {folders.length === 0 ? <p className="daily-exam-empty">No tenés carpetas. Creá una primero.</p> : (
                <div className="daily-exam-folder-list">
                  {folders.map((f) => (
                    <button key={f.id} className="daily-exam-folder-btn" onClick={() => pickFolder(f.id, f.name)}>
                      <span className="daily-exam-folder-btn__icon">📁</span>
                      <span className="daily-exam-folder-btn__name">{f.name}</span>
                      <span className="daily-exam-folder-btn__count">{f.chatCount} chats</span>
                      <span className="daily-exam-folder-btn__arrow">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {(step === "flashcard_loading" || step === "dev_loading") && (
            <div className="daily-exam-loading">
              <div className="daily-exam-spinner" />
              <p className="daily-exam-loading__text">{step === "flashcard_loading" ? "Generando flashcards…" : "Generando pregunta de desarrollo…"}</p>
            </div>
          )}
          {step === "flashcards" && currentCard && (
            <div className="daily-exam-fc">
              <div className="daily-exam-fc-progress">
                {flashcards.map((_, i) => (
                  <div key={i} className={`daily-exam-fc-pip ${i < fcIndex ? (fcResults[i]?.isCorrect ? "daily-exam-fc-pip--correct" : "daily-exam-fc-pip--wrong") : i === fcIndex ? "daily-exam-fc-pip--active" : ""}`} />
                ))}
              </div>
              <p className="daily-exam-section-label">🧠 Flashcard {fcIndex+1} de {flashcards.length}</p>
              <ExamMathText className="daily-exam-question" block>{currentCard.question}</ExamMathText>
              <div className="daily-exam-options">
                {currentCard.options.map((opt) => {
                  let cls = "daily-exam-option";
                  if (fcAnswered) { if (opt.id === currentCard.correctId) cls += " daily-exam-option--correct"; else if (opt.id === fcSelected) cls += " daily-exam-option--wrong"; else cls += " daily-exam-option--dim"; }
                  return (
                    <button key={opt.id} className={cls} onClick={() => handleFcSelect(opt.id)} disabled={fcAnswered}>
                      <span className="daily-exam-option__letter">{opt.id}</span>
                      <ExamMathText className="daily-exam-option__text">{opt.text}</ExamMathText>
                      {fcAnswered && opt.id === currentCard.correctId && <span className="daily-exam-option__check">✓</span>}
                      {fcAnswered && opt.id === fcSelected && opt.id !== currentCard.correctId && <span className="daily-exam-option__cross">✗</span>}
                    </button>
                  );
                })}
              </div>
              {fcAnswered && (
                <>
                  <div className={`daily-exam-feedback ${fcSelected === currentCard.correctId ? "daily-exam-feedback--correct" : "daily-exam-feedback--wrong"}`}>
                    <span>{fcSelected === currentCard.correctId ? "🎉 ¡Correcto!" : "❌ Incorrecto"}</span>
                    <ExamMathText className="daily-exam-feedback__exp" block>{currentCard.explanation}</ExamMathText>
                  </div>
                  <button className="daily-exam-next-btn" onClick={handleFcNext}>{fcIndex+1 < flashcards.length ? `Siguiente flashcard (${fcIndex+2}/${flashcards.length}) →` : "Continuar: Pregunta a desarrollo →"}</button>
                </>
              )}
            </div>
          )}
          {step === "dev" && (
            <div className="daily-exam-dev">
              <p className="daily-exam-section-label">✍️ Pregunta a desarrollo</p>
              {devQuestion ? (
                <>
                  <ExamMathText className="daily-exam-question" block>{devQuestion.question}</ExamMathText>
                  {!devCorrection ? (
                    <div className="daily-exam-answer-wrap">
                      <textarea className="daily-exam-textarea" value={devAnswer} onChange={(e) => setDevAnswer(e.target.value)} placeholder="Escribí tu respuesta acá..." rows={5} autoFocus />
                      {devError && <p className="daily-exam-error">{devError}</p>}
                      <button className="daily-exam-submit-btn" onClick={handleDevSubmit} disabled={!devAnswer.trim() || devSubmitting}>
                        {devSubmitting ? <span className="daily-exam-btn-loading"><span className="daily-exam-spinner daily-exam-spinner--sm" />Corrigiendo…</span> : "Enviar respuesta →"}
                      </button>
                    </div>
                  ) : (
                    <div className="daily-exam-correction">
                      <div className="daily-exam-score-row">
                        <span className="daily-exam-score" style={{ color: scoreColor(devCorrection.score) }}>{devCorrection.score}/10</span>
                        <span className={`daily-exam-verdict ${devCorrection.score >= 7 ? "daily-exam-verdict--great" : devCorrection.score >= 5 ? "daily-exam-verdict--ok" : "daily-exam-verdict--bad"}`}>
                          {devCorrection.score >= 7 ? "🎉 Excelente" : devCorrection.score >= 5 ? "👍 Bien" : "📖 Revisar"}
                        </span>
                      </div>
                      <div className="daily-exam-correction-section">
                        <span className="daily-exam-correction-label">Corrección de la IA</span>
                        <ExamMathText className="daily-exam-correction-text" block>{devCorrection.feedback}</ExamMathText>
                      </div>
                      {devCorrection.modelAnswer && (
                        <div className="daily-exam-correction-section">
                          <span className="daily-exam-correction-label">Respuesta modelo</span>
                          <ExamMathText className="daily-exam-correction-text" block>{devCorrection.modelAnswer}</ExamMathText>
                        </div>
                      )}
                      {progressBefore != null && (
                        <div className="daily-exam-progress-delta">
                          <div className="daily-exam-progress-delta__header">
                            <span className="daily-exam-progress-delta__label">📈 Progreso en {folderName}</span>
                            {progressAfter != null && progressDelta > 0 && <span className="daily-exam-progress-delta__badge">+{progressDelta}%</span>}
                            {progressAfter != null && progressDelta === 0 && <span className="daily-exam-progress-delta__badge daily-exam-progress-delta__badge--neutral">Sin cambio</span>}
                            {progressAfter == null && <span className="daily-exam-progress-delta__loading">calculando…</span>}
                          </div>
                          <div className="daily-exam-progress-delta__bars">
                            <div className="daily-exam-progress-delta__bar-row">
                              <span className="daily-exam-progress-delta__bar-label">Antes</span>
                              <div className="daily-exam-progress-delta__bar-bg"><div className="daily-exam-progress-delta__bar-fill daily-exam-progress-delta__bar-fill--before" style={{ width: `${progressBefore}%` }} /></div>
                              <span className="daily-exam-progress-delta__pct">{progressBefore}%</span>
                            </div>
                            {progressAfter != null && (
                              <div className="daily-exam-progress-delta__bar-row">
                                <span className="daily-exam-progress-delta__bar-label">Ahora</span>
                                <div className="daily-exam-progress-delta__bar-bg"><div className="daily-exam-progress-delta__bar-fill daily-exam-progress-delta__bar-fill--after" style={{ width: `${progressAfter}%`, transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} /></div>
                                <span className="daily-exam-progress-delta__pct">{progressAfter}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <button className="daily-exam-finish-btn" onClick={handleFinish}>🔥 ¡Completar examen y mantener racha!</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="daily-exam-no-question">
                  <p>No se pudo generar una pregunta para esta carpeta.</p>
                  <button className="daily-exam-finish-btn" onClick={handleFinish}>🔥 Completar de todas formas</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StreakCard({ racha, onStartExam, loading }) {
  const dias = racha?.dias ?? 0;
  const completadoHoy = racha?.completadoHoy ?? false;
  const horasSiguiente = racha?.horasParaPerder ?? null;
  const flameClass = dias === 0 ? "" : dias < 3 ? "streak-card__flame--warm" : dias < 7 ? "streak-card__flame--hot" : "streak-card__flame--inferno";

  function formatCountdown(hs) {
    if (hs == null) return null;
    if (hs <= 0) return "¡Se acaba ahora!";
    const h = Math.floor(hs); const m = Math.round((hs - h) * 60);
    if (h === 0) return `${m}min`; if (m === 0) return `${h}h`; return `${h}h ${m}min`;
  }

  const countdown = formatCountdown(horasSiguiente);
  const isUrgent = horasSiguiente != null && horasSiguiente <= 6 && !completadoHoy;

  return (
    <div className={`streak-card ${isUrgent ? "streak-card--urgent" : ""} ${completadoHoy ? "streak-card--done" : ""}`}>
      <div className="streak-card__glow" />
      <div className="streak-card__left">
        <div className={`streak-card__flame ${flameClass}`}>🔥</div>
        <div className="streak-card__days-wrap"><span className="streak-card__days">{dias}</span><span className="streak-card__days-label">días de racha</span></div>
      </div>
      <div className="streak-card__center">
        {completadoHoy ? (<><span className="streak-card__status streak-card__status--done">✅ ¡Completaste el examen de hoy!</span><span className="streak-card__sub">Volvé mañana para continuar tu racha</span></>) :
         dias === 0 ? (<><span className="streak-card__status">Empezá tu racha hoy 🚀</span><span className="streak-card__sub">Hacé tu primer examen diario para comenzar</span></>) :
         (<><span className="streak-card__status">{isUrgent ? "⚠️ ¡Tu racha está en peligro!" : "Mantené tu racha activa 💪"}</span><span className="streak-card__sub">{countdown ? isUrgent ? `Perdés la racha en ${countdown} — ¡hacé el examen ya!` : `Tenés ${countdown} para completar el examen de hoy` : "Hacé una flashcard y una pregunta a desarrollo para mantenerla"}</span></>)}
      </div>
      <div className="streak-card__right">
        {!completadoHoy && (
          <button className={`streak-card__btn ${isUrgent ? "streak-card__btn--urgent" : ""}`} onClick={onStartExam} disabled={loading}>
            {loading ? <span className="streak-card__btn-spinner" /> : null}
            {dias === 0 ? "Comenzar 🔥" : isUrgent ? "¡Hacerlo ahora! 🔥" : "Examen diario 🔥"}
          </button>
        )}
        {completadoHoy && <div className="streak-card__completed-badge"><span>🏆</span><span>Hoy ✓</span></div>}
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
  const [pickFolderMode, setPickFolderMode] = useState(null);
  const [folderProgress, setFolderProgress] = useState({});
  const [folderChatCounts, setFolderChatCounts] = useState({});
  const [organizedChatIds, setOrganizedChatIds] = useState(new Set());
  const [folderStats, setFolderStats] = useState({});
  const [selectedProgressFolder, setSelectedProgressFolder] = useState(null);
  const [loadingProgressFolder, setLoadingProgressFolder] = useState(false);
  const [uploadModalFolder, setUploadModalFolder] = useState(null);
  const [filesPanelRefresh, setFilesPanelRefresh] = useState({});
  const [racha, setRacha] = useState(null);
  const [rachaLoading, setRachaLoading] = useState(true);
  const [showDailyExam, setShowDailyExam] = useState(false);
  const [folderColors, setFolderColorsState] = useState({});
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false);

  // ── Plan info para carpetas bloqueadas ──
  const [foldersLimit, setFoldersLimit] = useState(null);
  const foldersLimitRef = useRef(null); // ref para acceso sincrónico en callbacks
  const [userPlan, setUserPlan] = useState("free");
  const [showFolderLimit, setShowFolderLimit] = useState(false);

  async function setFolderColor(folderId, color) {
    setFolderColorsState((prev) => ({ ...prev, [folderId]: color }));
    try {
      const token = getToken?.() || "";
      await fetch(`${API_BASE}/folder/${folderId}/color`, { method: "PATCH", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ color }) });
    } catch (err) { console.error("Error guardando color:", err); setFolderColorsState((prev) => { const r = { ...prev }; delete r[folderId]; return r; }); }
  }

  async function handleDeleteFolder(folderId) {
    setDeleteConfirmLoading(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderColorsState((prev) => { const n = { ...prev }; delete n[folderId]; return n; });
      if (selectedFolder === folderId) { setSelectedFolder(null); setFolderChats([]); }
      setDeletingFolder(null);
    } catch (err) { console.error(err); } finally { setDeleteConfirmLoading(false); }
  }

  useEffect(() => {
    async function initLoad() {
      await loadUserProfile(); // perfil primero para tener foldersLimit
      loadFolders();
      loadAllChats();
      loadRacha();
    }
    initLoad();
  }, []);


  async function loadUserProfile() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/auth/user/profile`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return null;
      const data = await res.json();
      setUserPlan(data?.plan || "free");
      const limit = data?.foldersLimit ?? null;
      setFoldersLimit(limit);
      foldersLimitRef.current = limit; // sincrónico
      return limit;
    } catch { return null; }
  }

  async function loadRacha() {
    setRachaLoading(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/auth/racha`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      setRacha(await res.json());
    } catch { setRacha({ dias: 0, completadoHoy: false, horasParaPerder: null }); } finally { setRachaLoading(false); }
  }

  function handleExamCompleted() {
    setRacha((prev) => ({ ...prev, completadoHoy: true, dias: (prev?.dias ?? 0) + (prev?.completadoHoy ? 0 : 1) }));
    loadRacha();
  }

  async function loadFolderProgressBatch(folderList) {
    if (!folderList.length) return;
    const token = getToken?.() || "";
    const results = await Promise.allSettled(folderList.map((folder) => fetch(`${API_BASE}/folder/${folder.id}/progress`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => (r.ok ? r.json() : { percentage: 0 }))));
    const progressMap = {};
    folderList.forEach((folder, i) => { progressMap[folder.id] = results[i].status === "fulfilled" ? (results[i].value.percentage ?? 0) : 0; });
    setFolderProgress(progressMap);
  }

  async function loadFolderChatCountsBatch(folderList) {
    if (!folderList.length) return;
    const token = getToken?.() || "";
    const results = await Promise.allSettled(folderList.map((folder) => fetch(`${API_BASE}/folder/${folder.id}/chats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => (r.ok ? r.json() : []))));
    const countMap = {}; const allOrganizedIds = new Set();
    folderList.forEach((folder, i) => {
      const chats = results[i].status === "fulfilled" && Array.isArray(results[i].value) ? results[i].value : [];
      countMap[folder.id] = chats.length;
      chats.forEach((chat) => { const id = chat.chatId || chat.id; if (id) allOrganizedIds.add(id); });
    });
    setFolderChatCounts(countMap); setOrganizedChatIds(allOrganizedIds);
  }

  async function loadFolders() {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = Array.isArray(data) ? data.map((folder) => ({ id: folder.folderId || folder.id, name: folder.name, chatCount: 0, createdAt: folder.createdAt, color: folder.color ?? null })) : [];
      setFolders(processed);
      const colorMap = {};
      processed.forEach((f) => { if (f.color) colorMap[f.id] = f.color; });
      setFolderColorsState(colorMap);
      loadFolderProgressBatch(processed); loadFolderChatCountsBatch(processed);
    } catch { setFolders([]); }
  }

  async function loadAllChats() {
    try {
      const token = getToken?.() || "";
      const email = getEmailFromToken();
      const res = await fetch(`${API_BASE}/math/chats?email=${encodeURIComponent(email)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllChats(Array.isArray(data) ? data : []);
    } catch { setAllChats([]); }
  }

  async function createFolder(name) {
    if (!name.trim()) return;
    // Verificar límite antes de crear
    if (foldersLimit !== null && folders.length >= foldersLimit) {
      setShowFolderLimit(true);
      return;
    }
    setIsCreatingFolder(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ name }) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 429 || errData.error === "FOLDERS_LIMIT_REACHED" || errData.error === "LIMIT_REACHED") {
          setShowFolderLimit(true);
          return;
        }
      }
      await loadFolders();
      await loadUserProfile();
    } catch (err) { console.error(err); } finally { setIsCreatingFolder(false); }
  }

  async function loadFolderChats(folderId) {
    setIsLoadingChats(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/chats`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const chats = Array.isArray(data) ? data : [];
      setFolderChats(chats); setSelectedFolder(folderId);
      setFolderChatCounts((prev) => ({ ...prev, [folderId]: chats.length }));
    } catch { setFolderChats([]); } finally { setIsLoadingChats(false); }
  }

  async function assignChatToFolder(chatId, folderId) {
    try {
      const token = getToken?.() || "";
      await fetch(`${API_BASE}/folder/${folderId}/chats/${chatId}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (selectedFolder) loadFolderChats(selectedFolder);
      loadFolderChatCountsBatch(folders);
      setOrganizedChatIds((prev) => new Set([...prev, chatId]));
      setQuickAssignChat(null);
    } catch (err) { console.error(err); }
  }

  async function generateExam(folderId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/exam`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "examen.pdf"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert("Error al generar el examen"); }
  }

  async function loadFolderStatsForProgress(folderId) {
    if (folderStats[folderId]) { setSelectedProgressFolder(folderId); return; }
    setLoadingProgressFolder(true); setSelectedProgressFolder(folderId);
    try {
      const token = getToken?.() || "";
      const [flashRes, devRes] = await Promise.allSettled([
        fetch(`${API_BASE}/folder/${folderId}/flashcards`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/folder/${folderId}/dev-questions`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setFolderStats((prev) => ({
        ...prev,
        [folderId]: {
          flashcards: flashRes.status === "fulfilled" && Array.isArray(flashRes.value) ? flashRes.value : [],
          devQuestions: devRes.status === "fulfilled" && Array.isArray(devRes.value) ? devRes.value : [],
        },
      }));
    } catch (err) { console.error(err); } finally { setLoadingProgressFolder(false); }
  }

  function handleFileUploaded(folderId) {
    setFilesPanelRefresh((prev) => ({ ...prev, [folderId]: (prev[folderId] || 0) + 1 }));
  }

  const totalOrganizedChats = Object.values(folderChatCounts).reduce((s, c) => s + c, 0);
  const unorganizedChats = allChats.filter((chat) => !organizedChatIds.has(chat.chatId || chat.id));
  const unorganizedCount = unorganizedChats.length;
  const foldersWithCounts = folders.map((f) => ({ ...f, chatCount: folderChatCounts[f.id] ?? 0 }));

  // ── Determinar carpetas bloqueadas por downgrade ──
  // Ordenar por createdAt, las más nuevas que excedan el límite están bloqueadas
  const sortedFolders = [...foldersWithCounts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const effectiveLimit = foldersLimit ?? foldersLimitRef.current;
  const lockedFolderIds = new Set(
    effectiveLimit !== null
      ? sortedFolders.slice(effectiveLimit).map((f) => f.id)
      : []
  );

  return (
    <div className="study-hub">
      {showFolderLimit && (
        <PlanLimitModal type="folders" plan={userPlan} onClose={() => setShowFolderLimit(false)} />
      )}
      {showCreatePopup && <CreateFolderPopup onClose={() => setShowCreatePopup(false)} onCreate={createFolder} />}
      {deletingFolder && (
        <DeleteFolderModal folderName={deletingFolder.name} loading={deleteConfirmLoading}
          onConfirm={() => handleDeleteFolder(deletingFolder.id)}
          onClose={() => !deleteConfirmLoading && setDeletingFolder(null)} />
      )}
      {quickAssignChat && (
        <QuickAssignModal chat={allChats.find((c) => (c.chatId || c.id) === quickAssignChat)} folders={foldersWithCounts}
          onAssign={(folderId) => assignChatToFolder(quickAssignChat, folderId)} onClose={() => setQuickAssignChat(null)} />
      )}
      {pickFolderMode && (
        <PickFolderModal mode={pickFolderMode} folders={foldersWithCounts.filter((f) => !lockedFolderIds.has(f.id))}
          onPick={(folderId) => { trackStudyAction(pickFolderMode === "flashcards" ? "flashcards" : "dev_questions"); navigate(`/folder/${folderId}/${pickFolderMode}`); setPickFolderMode(null); }}
          onClose={() => setPickFolderMode(null)} />
      )}
      {uploadModalFolder && (
        <FileUploadModal folderId={uploadModalFolder.id} folderName={uploadModalFolder.name}
          onClose={() => setUploadModalFolder(null)}
          onUploaded={(fileId) => { handleFileUploaded(uploadModalFolder.id); setUploadModalFolder(null); }} />
      )}
      {showDailyExam && <DailyExamModal folders={foldersWithCounts.filter((f) => !lockedFolderIds.has(f.id))} onClose={() => setShowDailyExam(false)} onCompleted={handleExamCompleted} />}

      <div className="study-header">
        <button className="btn-back" onClick={() => navigate("/chat")}>← Chat</button>
        <div className="study-header-text">
          <h1 className="study-title shine-platinum">Mis Estudios</h1>
          <p className="study-subtitle">Tu espacio de aprendizaje personalizado</p>
        </div>
      </div>

      {!rachaLoading && <StreakCard racha={racha} onStartExam={() => setShowDailyExam(true)} loading={rachaLoading} />}
      {rachaLoading && (
        <div className="streak-card streak-card--skeleton">
          <div className="streak-skeleton-flame" />
          <div className="streak-skeleton-text">
            <div className="streak-skeleton-line streak-skeleton-line--lg" />
            <div className="streak-skeleton-line streak-skeleton-line--sm" />
          </div>
        </div>
      )}

      <div className="study-tools-strip">
        <div className="study-tool-card study-tool-card--chat" onClick={() => navigate("/chat")}>
          <div className="study-tool-card__glow" /><div className="study-tool-card__icon-wrap"><span className="study-tool-card__icon">📐</span></div>
          <div className="study-tool-card__text"><span className="study-tool-card__title">Chat Matemático</span><span className="study-tool-card__sub">Resolvé problemas con IA paso a paso</span></div>
          <span className="study-tool-card__arrow">→</span>
        </div>
        <div className="study-tool-card study-tool-card--flash" onClick={() => { trackStudyAction("flashcards"); setPickFolderMode("flashcards"); }}>
          <div className="study-tool-card__glow" /><div className="study-tool-card__icon-wrap"><span className="study-tool-card__icon">🧠</span></div>
          <div className="study-tool-card__text"><span className="study-tool-card__title">Flashcards</span><span className="study-tool-card__sub">Practicá con preguntas de opción múltiple</span></div>
          <span className="study-tool-card__arrow">→</span>
        </div>
        <div className="study-tool-card study-tool-card--dev" onClick={() => { trackStudyAction("dev_questions"); setPickFolderMode("dev-questions"); }}>
          <div className="study-tool-card__glow" /><div className="study-tool-card__icon-wrap"><span className="study-tool-card__icon">✍️</span></div>
          <div className="study-tool-card__text"><span className="study-tool-card__title">Preguntas a desarrollo</span><span className="study-tool-card__sub">Escribí y recibí corrección con IA</span></div>
          <span className="study-tool-card__arrow">→</span>
        </div>
      </div>

      <div className="study-stats-row">
        <div className="study-stat"><span className="study-stat__value">{allChats.length}</span><span className="study-stat__label">Chats totales</span></div>
        <div className="study-stat-divider" />
        <div className="study-stat"><span className="study-stat__value">{folders.length}</span><span className="study-stat__label">Carpetas</span></div>
        <div className="study-stat-divider" />
        <div className="study-stat"><span className="study-stat__value">{totalOrganizedChats}</span><span className="study-stat__label">Chats organizados</span></div>
        <div className="study-stat-divider" />
        <div className="study-stat"><span className="study-stat__value">{unorganizedCount}</span><span className="study-stat__label">Sin organizar</span></div>
      </div>

      <div className="study-tabs">
        <button className={`study-tab ${view === "folders" ? "active" : ""}`} onClick={() => setView("folders")}>📁 Carpetas</button>
        <button className={`study-tab ${view === "progress" ? "active" : ""}`} onClick={() => setView("progress")}>📊 Progreso</button>
      </div>

      <div className="study-content">
        {view === "folders" && (
          <FoldersView
            navigate={navigate} folders={foldersWithCounts} folderProgress={folderProgress}
            selectedFolder={selectedFolder} folderChats={folderChats} allChats={allChats}
            unorganizedChats={unorganizedChats} isLoadingChats={isLoadingChats}
            onCreateFolder={() => setShowCreatePopup(true)}
            onSelectFolder={(id) => { setSelectedFolder(id); loadFolderChats(id); }}
            assignChatToFolder={assignChatToFolder}
            onQuickAssign={(chatId) => setQuickAssignChat(chatId)}
            generateExam={generateExam}
            onUploadFile={(folder) => setUploadModalFolder(folder)}
            filesPanelRefresh={filesPanelRefresh}
            folderColors={folderColors} setFolderColor={setFolderColor}
            onDeleteFolder={(folder) => setDeletingFolder(folder)}
            lockedFolderIds={lockedFolderIds}
            userPlan={userPlan}
            onShowFolderLimit={() => setShowFolderLimit(true)}
          />
        )}
        {view === "progress" && (
          <ProgressView folders={foldersWithCounts} allChats={allChats} totalOrganizedChats={totalOrganizedChats}
            folderProgress={folderProgress} folderStats={folderStats} selectedProgressFolder={selectedProgressFolder}
            loadingProgressFolder={loadingProgressFolder} onSelectFolder={loadFolderStatsForProgress} />
        )}
      </div>

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
          <button className="study-upgrade-banner__btn" type="button" onClick={(e) => { e.stopPropagation(); navigate("/plans"); }}>Ver planes →</button>
        </div>
      </div>
    </div>
  );
}

// ── Folders View ────────────────────────────────────────────────────────────
function FoldersView({
  navigate, folders, folderProgress, selectedFolder, folderChats,
  allChats, unorganizedChats, isLoadingChats, onCreateFolder, onSelectFolder,
  assignChatToFolder, onQuickAssign, generateExam, onUploadFile, filesPanelRefresh,
  folderColors, setFolderColor, onDeleteFolder, lockedFolderIds, userPlan, onShowFolderLimit,
}) {
  const [showAddChat, setShowAddChat] = useState(false);
  const isEmpty = !folders || folders.length === 0;

  return (
    <div className="folders-view">
      {isEmpty && allChats.length === 0 && (
        <div className="folders-onboarding">
          <div className="folders-onboarding__icon">🗂️</div>
          <h3 className="folders-onboarding__title">Organizá tus estudios</h3>
          <p className="folders-onboarding__desc">Creá carpetas por materia y guardá tus chats para estudiar mejor.</p>
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
            <span className="unorganized-nudge__text"><strong>{unorganizedChats.length}</strong> chat{unorganizedChats.length > 1 ? "s" : ""} sin organizar</span>
            <button className="unorganized-nudge__btn" onClick={() => onQuickAssign(unorganizedChats[0]?.chatId || unorganizedChats[0]?.id)}>Organizarlos →</button>
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
        {Array.isArray(folders) && folders.map((folder, i) => {
          if (!folder || !folder.id) return null;
          const progress = folderProgress[folder.id] ?? null;
          const color = folderColors[folder.id];
          const isLocked = lockedFolderIds.has(folder.id);

          if (isLocked) {
            return (
              <div
                key={folder.id}
                className="folder-card folder-card--locked"
                style={{ animationDelay: `${i * 60}ms`, ...(color ? { background: `linear-gradient(135deg, ${color}, rgba(18,18,26,0.95))`, borderColor: color } : {}) }}
              >
                {/* Contenido borroso */}
                <div className="folder-card__blur-content">
                  <div className="folder-card__bg" />
                  <ProgressRing target={progress} />
                  <div className="folder-icon">📁</div>
                  <div className="folder-name">{folder.name || "Sin nombre"}</div>
                  <div className="folder-count">{folder.chatCount} chats</div>
                </div>

                {/* Badge y botones — nítidos, encima del blur */}
                <div className="folder-lock-badge">
                  <span className="folder-lock-badge__icon">🔒</span>
                  Bloqueada
                </div>
                <div className="folder-locked-actions">
                  <button
                    className="folder-locked-btn folder-locked-btn--upgrade"
                    onClick={(e) => { e.stopPropagation(); onShowFolderLimit(); }}
                  >
                    ⚡ Mejorar plan
                  </button>
                  <button
                    className="folder-locked-btn folder-locked-btn--delete"
                    onClick={(e) => { e.stopPropagation(); onDeleteFolder({ id: folder.id, name: folder.name }); }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={folder.id}
              className={`folder-card ${selectedFolder === folder.id ? "active" : ""}`}
              style={{ animationDelay: `${i * 60}ms`, ...(color ? { background: `linear-gradient(135deg, ${color}, rgba(18,18,26,0.95))`, borderColor: color } : {}) }}
              onClick={() => navigate(`/folder/${folder.id}`)}
            >
              <div className="folder-card__bg" />
              <ProgressRing target={progress} />
              <div className="folder-icon">📁</div>
              <div className="folder-name">{folder.name || "Sin nombre"}</div>
              <div className="folder-count">{folder.chatCount} chats</div>
              <div className="folder-card-tools" onClick={(e) => e.stopPropagation()}>
                <button className="folder-tool-btn folder-tool-btn--flash" title="Flashcards" onClick={(e) => { e.stopPropagation(); trackStudyAction("flashcards"); navigate(`/folder/${folder.id}/flashcards`); }}>🧠</button>
                <button className="folder-tool-btn folder-tool-btn--dev" title="Preguntas a desarrollo" onClick={(e) => { e.stopPropagation(); trackStudyAction("dev_questions"); navigate(`/folder/${folder.id}/dev-questions`); }}>✍️</button>
                <button className="folder-tool-btn folder-tool-btn--files" title="Subir archivos" onClick={(e) => { e.stopPropagation(); onUploadFile({ id: folder.id, name: folder.name }); }}>📎</button>
                <button className="folder-tool-btn folder-tool-btn--delete" title="Eliminar carpeta" onClick={(e) => { e.stopPropagation(); onDeleteFolder({ id: folder.id, name: folder.name }); }}>🗑️</button>
              </div>
              <div className="folder-color-picker" onClick={(e) => e.stopPropagation()}>
                {FOLDER_COLORS.map((c) => (
                  <button key={c.id} className={`folder-color-dot ${folderColors[folder.id] === c.value ? "active" : ""}`}
                    style={{ background: c.value }} title={c.label}
                    onClick={(e) => { e.stopPropagation(); setFolderColor(folder.id, c.value); }} />
                ))}
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
              <button className="btn-add-chat" onClick={() => setShowAddChat(!showAddChat)}>+ Agregar chat</button>
              <button className="btn-upload-file" onClick={() => { const folder = folders.find((f) => f.id === selectedFolder); onUploadFile({ id: selectedFolder, name: folder?.name || "Carpeta" }); }}>📎 Subir archivos</button>
              <button className="btn-flashcards" onClick={() => { trackStudyAction("flashcards"); navigate(`/folder/${selectedFolder}/flashcards`); }}>🧠 Flashcards</button>
              <button className="btn-dev-questions" onClick={() => { trackStudyAction("dev_questions"); navigate(`/folder/${selectedFolder}/dev-questions`); }}>✍️ Desarrollo</button>
              <button className="btn-exam" onClick={() => generateExam(selectedFolder)}>📄 Examen</button>
            </div>
          </div>
          {showAddChat && (
            <div className="add-chat-modal">
              <h4>Seleccioná un chat para agregar</h4>
              <div className="chat-selector">
                {Array.isArray(allChats) && allChats.map((chat) => {
                  if (!chat || !(chat.chatId || chat.id)) return null;
                  return (
                    <div key={chat.chatId || chat.id} className="chat-selector-item"
                      onClick={() => { assignChatToFolder(chat.chatId || chat.id, selectedFolder); setShowAddChat(false); }}>
                      <div className="chat-selector-title">{chat.title || "Sin título"}</div>
                      <div className="chat-selector-date">{chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setShowAddChat(false)}>Cerrar</button>
            </div>
          )}
          <FolderFilesPanel
            key={`${selectedFolder}-${filesPanelRefresh[selectedFolder] || 0}`}
            folderId={selectedFolder}
            folderName={folders.find((f) => f.id === selectedFolder)?.name || "Carpeta"}
            onUpload={() => { const folder = folders.find((f) => f.id === selectedFolder); onUploadFile({ id: selectedFolder, name: folder?.name || "Carpeta" }); }}
          />
          {isLoadingChats ? <p>Cargando chats...</p> : (
            <div className="folder-chats">
              {(!folderChats || folderChats.length === 0) && <p className="empty-state">Esta carpeta está vacía</p>}
              {Array.isArray(folderChats) && folderChats.map((chat) => {
                if (!chat || !(chat.chatId || chat.id)) return null;
                return (
                  <div key={chat.chatId || chat.id} className="folder-chat-item folder-chat-item--clickable"
                    onClick={() => navigate(`/chat?id=${chat.chatId || chat.id}`)}>
                    <div className="folder-chat-title">{chat.title || "Sin título"}</div>
                    <div className="folder-chat-date">{chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}</div>
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

// ── Progress View (sin cambios) ─────────────────────────────────────────────
function ProgressView({ folders, allChats, totalOrganizedChats, folderProgress, folderStats, selectedProgressFolder, loadingProgressFolder, onSelectFolder }) {
  const stats = selectedProgressFolder ? folderStats[selectedProgressFolder] : null;
  function calcDevStats(devQuestions) {
    if (!devQuestions || devQuestions.length === 0) return { count: 0, avgScore: null };
    const avgScore = devQuestions.length > 0 ? Math.round((devQuestions.reduce((s, q) => s + (q.score || 0), 0) / devQuestions.length) * 10) / 10 : null;
    return { count: devQuestions.length, avgScore };
  }
  const devStats = stats ? calcDevStats(stats.devQuestions) : null;
  const flashCount = stats ? stats.flashcards.length : null;
  const lastFlashcards = stats ? [...stats.flashcards].reverse().slice(0, 5) : [];
  const lastDevQuestions = stats ? [...stats.devQuestions].reverse().slice(0, 5) : [];
  const devScorePercent = devStats?.avgScore != null ? (devStats.avgScore / 10) * 100 : 0;
  function scoreColor(score) { if (score == null) return "rgba(255,255,255,0.3)"; if (score >= 7) return "#22c55e"; if (score >= 5) return "#f97316"; return "#ef4444"; }

  return (
    <div className="progress-view">
      <div className="progress-global">
        <div className="progress-stat-card"><div className="progress-stat-value">{allChats.length}</div><div className="progress-stat-label">Chats totales</div></div>
        <div className="progress-stat-card"><div className="progress-stat-value">{folders.length}</div><div className="progress-stat-label">Carpetas</div></div>
        <div className="progress-stat-card"><div className="progress-stat-value">{totalOrganizedChats}</div><div className="progress-stat-label">Chats organizados</div></div>
      </div>
      <div className="progress-folders-section">
        <h3 className="progress-section-title">Progreso por carpeta</h3>
        {folders.length === 0 && <p className="empty-state">Todavía no tenés carpetas.</p>}
        <div className="progress-folder-list">
          {folders.map((folder) => {
            const pct = folderProgress[folder.id] ?? null;
            const isSelected = selectedProgressFolder === folder.id;
            return (
              <div key={folder.id} className={`progress-folder-row ${isSelected ? "progress-folder-row--active" : ""}`} onClick={() => onSelectFolder(folder.id)}>
                <div className="progress-folder-row__left">
                  <span className="progress-folder-row__icon">📁</span>
                  <div className="progress-folder-row__info"><span className="progress-folder-row__name">{folder.name}</span><span className="progress-folder-row__count">{folder.chatCount} chats</span></div>
                </div>
                <div className="progress-folder-row__right">
                  <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: pct != null ? `${pct}%` : "0%", transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} /></div>
                  <span className="progress-folder-row__pct">{pct != null ? `${pct}%` : "…"}</span>
                  <span className="progress-folder-row__arrow">{isSelected ? "▾" : "›"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedProgressFolder && (
        <div className="progress-folder-detail">
          {loadingProgressFolder ? <div className="progress-detail-loading">Cargando estadísticas…</div> : stats ? (
            <>
              <h3 className="progress-section-title">{folders.find((f) => f.id === selectedProgressFolder)?.name || "Carpeta"}</h3>
              <div className="progress-detail-grid">
                <div className="progress-detail-card progress-detail-card--flash">
                  <div className="progress-detail-card__header"><span className="progress-detail-card__icon">🧠</span><span className="progress-detail-card__title">Flashcards</span></div>
                  {flashCount === 0 ? <p className="progress-detail-card__empty">Todavía no respondiste flashcards en esta carpeta.</p> : (
                    <>
                      <div className="progress-detail-card__main"><span className="progress-detail-card__big">{flashCount}</span><span className="progress-detail-card__label">respondidas correctamente</span></div>
                      <div className="progress-dev-answers">
                        <p className="progress-dev-answers__title">Últimas correctas</p>
                        {lastFlashcards.map((q) => (
                          <div key={q.SK} className="progress-dev-answer-item">
                            <div className="progress-dev-answer-item__top"><span className="progress-dev-answer-item__score" style={{ color: "#f97316" }}>✓</span><span className="progress-dev-answer-item__date">{q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-AR") : ""}</span></div>
                            <p className="progress-dev-answer-item__question">{q.question?.replace(/\\[()\[\]]/g, "").slice(0, 90)}…</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="progress-detail-card progress-detail-card--dev">
                  <div className="progress-detail-card__header"><span className="progress-detail-card__icon">✍️</span><span className="progress-detail-card__title">Preguntas a desarrollo</span></div>
                  {devStats.count === 0 ? <p className="progress-detail-card__empty">Todavía no hiciste preguntas a desarrollo en esta carpeta.</p> : (
                    <>
                      <div className="progress-detail-card__main"><span className="progress-detail-card__big">{devStats.count}</span><span className="progress-detail-card__label">preguntas respondidas</span></div>
                      {devStats.avgScore != null && (
                        <div className="progress-detail-score">
                          <div className="progress-detail-score__row"><span className="progress-detail-score__label">Puntaje promedio</span><span className="progress-detail-score__value" style={{ color: scoreColor(devStats.avgScore) }}>{devStats.avgScore}/10</span></div>
                          <div className="progress-detail-score__bar-bg"><div className="progress-detail-score__bar-fill" style={{ width: `${devScorePercent}%`, background: scoreColor(devStats.avgScore), transition: "width 900ms cubic-bezier(0.22,1,0.36,1)" }} /></div>
                        </div>
                      )}
                      <div className="progress-dev-answers">
                        <p className="progress-dev-answers__title">Últimas respuestas</p>
                        {lastDevQuestions.map((q) => (
                          <div key={q.SK} className="progress-dev-answer-item">
                            <div className="progress-dev-answer-item__top"><span className="progress-dev-answer-item__score" style={{ color: scoreColor(q.score) }}>{q.score}/10</span><span className="progress-dev-answer-item__date">{q.createdAt ? new Date(q.createdAt).toLocaleDateString("es-AR") : ""}</span></div>
                            <p className="progress-dev-answer-item__question">{q.question?.replace(/\\[()\[\]]/g, "").slice(0, 90)}…</p>
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
