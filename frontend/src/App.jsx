import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Plus, Trash2, FileText, Menu } from 'lucide-react'

function App() {
  const [notes, setNotes] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await axios.get('/api/notes')
      setNotes(response.data)
      if (response.data.length > 0 && !activeNote) {
        setActiveNote(response.data[0])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const createNote = async () => {
    try {
      const response = await axios.post('/api/notes', { title: 'Untitled Note', content: '' })
      setNotes([response.data, ...notes])
      setActiveNote(response.data)
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  const deleteNote = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await axios.delete(`/api/notes/${id}`)
      const updatedNotes = notes.filter(n => n.id !== id)
      setNotes(updatedNotes)
      if (activeNote?.id === id) {
        setActiveNote(updatedNotes.length > 0 ? updatedNotes[0] : null)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const updateNote = async (updatedNote) => {
    try {
      await axios.put(`/api/notes/${updatedNote.id}`, {
        title: updatedNote.title,
        content: updatedNote.content
      })
      // Update local state
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n))
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  // Debouncing logic for auto-save
  useEffect(() => {
    if (!activeNote) return

    const timeoutId = setTimeout(() => {
      updateNote(activeNote)
    }, 1000) // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId)
  }, [activeNote?.content, activeNote?.title])

  const onEdit = (field, value) => {
    setActiveNote({
      ...activeNote,
      [field]: value
    })
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>My Notes</h2>
          <button className="new-note-btn" onClick={createNote}>
            <Plus size={18} /> New
          </button>
        </div>
        <div className="notes-list">
          {notes.map(note => (
            <div 
              key={note.id} 
              className={`note-item ${activeNote?.id === note.id ? 'active' : ''}`}
              onClick={() => setActiveNote(note)}
            >
              <div className="note-title-text">{note.title}</div>
              <button className="delete-btn" onClick={(e) => deleteNote(note.id, e)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              No notes yet. Create one!
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeNote ? (
          <>
            <div className="editor-header">
              <input
                type="text"
                className="title-input"
                value={activeNote.title}
                onChange={(e) => onEdit('title', e.target.value)}
                placeholder="Note Title"
              />
            </div>
            <div className="workspace">
              <div className="editor-panel">
                <textarea
                  className="markdown-textarea"
                  value={activeNote.content}
                  onChange={(e) => onEdit('content', e.target.value)}
                  placeholder="Type your markdown here..."
                />
              </div>
              <div className="preview-panel">
                <div className="prose">
                  <ReactMarkdown>{activeNote.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div style={{ textAlign: 'center' }}>
              <FileText size={64} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <p>Select a note or create a new one to start writing.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
