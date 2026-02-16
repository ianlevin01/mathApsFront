import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getEmailFromToken } from "../auth";

const API_BASE = "https://mathapsapi.duckdns.org";

export default function StudyHub() {
  const navigate = useNavigate();
  const [view, setView] = useState("folders"); // "folders" | "exams" | "progress"
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderChats, setFolderChats] = useState([]);
  const [allChats, setAllChats] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

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
      if (!res.ok) throw new Error("Error al cargar carpetas");
      const data = await res.json();
      console.log("Carpetas recibidas:", data);
      
      // Procesar carpetas - pueden venir con estructura anidada
      const processedFolders = Array.isArray(data) 
        ? data.map(folder => {
            // Si la carpeta tiene un array interno de chats, contarlos
            const chatsArray = Object.values(folder).find(val => Array.isArray(val));
            return {
              id: folder.folderId || folder.id,
              name: folder.name,
              chatCount: chatsArray ? chatsArray.length : 0,
              createdAt: folder.createdAt
            };
          })
        : [];
      
      console.log("Carpetas procesadas:", processedFolders);
      setFolders(processedFolders);
    } catch (err) {
      console.error("Error cargando carpetas:", err);
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
      if (!res.ok) throw new Error("Error al cargar chats");
      const data = await res.json();
      console.log("Chats recibidos:", data);
      setAllChats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando chats:", err);
      setAllChats([]);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newFolderName }),
      });
      if (!res.ok) throw new Error("Error al crear carpeta");
      setNewFolderName("");
      loadFolders();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function loadFolderChats(folderId) {
    // Si ya está seleccionada, no hacer nada
    if (selectedFolder === folderId && folderChats.length > 0) {
      return;
    }
    
    setIsLoadingChats(true);
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al cargar chats de carpeta");
      const data = await res.json();
      setFolderChats(Array.isArray(data) ? data : []);
      setSelectedFolder(folderId);
    } catch (err) {
      console.error(err);
      setFolderChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }

  async function assignChatToFolder(chatId, folderId) {
    try {
      const token = getToken?.() || "";
      const res = await fetch(`${API_BASE}/folder/${folderId}/chats/${chatId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Error al asignar chat");
      loadFolderChats(folderId);
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
      if (!res.ok) throw new Error("Error al generar examen");
      
      // Descargar el PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "examen.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error al generar el examen");
    }
  }

  return (
    <div className="study-hub">
      {/* Header */}
      <div className="study-header">
        <button
          className="btn-back"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
        <h1 className="study-title shine-platinum">Mis Estudios</h1>
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

      {/* Content */}
      <div className="study-content">
        {view === "folders" && (
          <FoldersView
            navigate={navigate}
            folders={folders}
            selectedFolder={selectedFolder}
            folderChats={folderChats}
            allChats={allChats}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            isCreatingFolder={isCreatingFolder}
            isLoadingChats={isLoadingChats}
            createFolder={createFolder}
            loadFolderChats={loadFolderChats}
            assignChatToFolder={assignChatToFolder}
            generateExam={generateExam}
          />
        )}

        {view === "progress" && (
          <ProgressView folders={folders} allChats={allChats} />
        )}
      </div>
    </div>
  );
}

function FoldersView({
  navigate,
  folders,
  selectedFolder,
  folderChats,
  allChats,
  newFolderName,
  setNewFolderName,
  isCreatingFolder,
  isLoadingChats,
  createFolder,
  loadFolderChats,
  assignChatToFolder,
  generateExam,
}) {
  const [showAddChat, setShowAddChat] = useState(false);

  return (
    <div className="folders-view">
      {/* Create folder */}
      <div className="folder-create">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
          placeholder="Nombre de la carpeta..."
          disabled={isCreatingFolder}
        />
        <button onClick={createFolder} disabled={isCreatingFolder}>
          {isCreatingFolder ? "..." : "+ Crear"}
        </button>
      </div>

      {/* Folders grid */}
      <div className="folders-grid">
        {(!folders || folders.length === 0) && (
          <p className="empty-state">No hay carpetas. ¡Creá la primera!</p>
        )}

        {Array.isArray(folders) && folders.map((folder) => {
          if (!folder || !folder.id) return null;
          const progress = 45; // Hardcodeado por ahora
          return (
            <div
              key={folder.id}
              className="folder-card"
              onClick={() => navigate(`/folder/${folder.id}`)}
            >
              <div className="folder-icon">📁</div>
              <div className="folder-name">{folder.name || "Sin nombre"}</div>
              <div className="folder-count">
                {folder.chatCount || 0} chats
              </div>
              <div className="folder-progress">
                <svg className="progress-ring" width="50" height="50">
                  <circle
                    className="progress-ring-circle-bg"
                    cx="25"
                    cy="25"
                    r="20"
                  />
                  <circle
                    className="progress-ring-circle"
                    cx="25"
                    cy="25"
                    r="20"
                    style={{
                      strokeDasharray: `${(progress / 100) * 125.6} 125.6`
                    }}
                  />
                </svg>
                <div className="progress-text">{progress}%</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Folder detail */}
      {selectedFolder && (
        <div className="folder-detail">
          <div className="folder-detail-header">
            <h3>
              {folders.find((f) => f.id === selectedFolder)?.name || "Carpeta"}
            </h3>
            <div className="folder-actions">
              <button
                className="btn-add-chat"
                onClick={() => setShowAddChat(!showAddChat)}
              >
                + Agregar chat
              </button>
              <button
                className="btn-flashcards"
                onClick={() => alert("Flashcards próximamente")}
              >
                🎴 Flashcards
              </button>
              <button
                className="btn-exam"
                onClick={() => generateExam(selectedFolder)}
              >
                📄 Generar examen
              </button>
            </div>
          </div>

          {showAddChat && (
            <div className="add-chat-modal">
              <h4>Seleccioná un chat para agregar</h4>
              <div className="chat-selector">
                {Array.isArray(allChats) && allChats.map((chat) => {
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
                      <div className="chat-selector-title">
                        {chat.title || "Sin título"}
                      </div>
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
              {Array.isArray(folderChats) && folderChats.map((chat) => {
                if (!chat || !(chat.chatId || chat.id)) return null;
                return (
                  <div 
                    key={chat.chatId || chat.id} 
                    className="folder-chat-item folder-chat-item--clickable"
                    onClick={() => {
                      // Navegar al chat con el ID específico
                      navigate(`/chat?id=${chat.chatId || chat.id}`);
                    }}
                  >
                    <div className="folder-chat-title">
                      {chat.title || "Sin título"}
                    </div>
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
          <div className="progress-stat-value">
            {folders.reduce((sum, f) => sum + (f.chatCount || 0), 0)}
          </div>
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
