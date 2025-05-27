import React, { useState, useEffect } from 'react';
import NotesForm from './NotesForm';
import '../styles/Notes.css';

const Notes = ({ toggleContainer, studentName }) => {
  const currentUser = studentName || 'Unknown';
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [subjects, setSubjects] = useState(['human_resource', 'it', 'agriculture']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // Example API, replace with real URL
        const res = await fetch('https://your-api-url.com');
        const data = await res.json();
        setNotes(data.notes || []);
        setFilteredNotes(data.notes || []);
        setSubjects(data.subjects || ['human_resource', 'it', 'agriculture']);
      } catch {
        setNotes([]);
        setFilteredNotes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    let filtered = [...notes];
    if (selectedSubject) {
      filtered = filtered.filter((note) => note.subject === selectedSubject);
    }
    if (searchQuery) {
      filtered = filtered.filter((note) =>
        note.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedType) {
      filtered = filtered.filter((note) => note.type === selectedType);
    }
    setFilteredNotes(filtered);
  }, [notes, selectedSubject, selectedType, searchQuery]);

  const getYouTubeEmbedUrl = (url) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : '';
  };

  const handleNoteSubmit = (newNotes) => {
    // The notes from the form already have 'name' set by NotesForm,
    // but just in case, we ensure the current user is attached:
    const notesWithName = newNotes.map((note) => ({
      ...note,
      name: note.name || currentUser,
    }));
    setNotes((prev) => [...prev, ...notesWithName]);
    setFilteredNotes((prev) => [...prev, ...notesWithName]);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    setFilteredNotes(updatedNotes);
  };

  return (
    <div id="notes-container" className="notes-container">
      <div className="container-header">📚 Study Notes</div>
      <div className="container-body">
        {loading ? (
          <p>Loading notes...</p>
        ) : showForm ? (
          <NotesForm
            onSubmit={handleNoteSubmit}
            onCancel={() => setShowForm(false)}
            subjects={subjects}
            studentName={currentUser}
          />
        ) : (
          <>
            <div className="notes-controls">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="notes-filter"
              >
                <option value="">All Subjects</option>
                {subjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="notes-filter"
              >
                <option value="">All Types</option>
                <option value="youtube">YouTube</option>
                <option value="article">Article</option>
                <option value="file">PDF</option>
              </select>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="notes-search"
              />
              <button onClick={() => setShowForm(true)} className="add-notes-btn">
                Add Notes
              </button>
            </div>

            <div className="notes-grid">
              {filteredNotes.length === 0 ? (
                <p>No notes found.</p>
              ) : (
                filteredNotes.map((note) => {
                  const postedDate = new Date(note.timestamp).toLocaleDateString(
                    undefined,
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  );

                  return (
                    <div key={note.id} className="note-card">
                      <h3>{note.title}</h3>
                      <p className="note-subject">
                        {note.subject.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      {note.description && (
                        <p className="note-description">{note.description}</p>
                      )}

                      {note.type === 'youtube' && (
                        <div className="video-wrapper">
                          <iframe
                            src={getYouTubeEmbedUrl(note.url)}
                            title="YouTube Video"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {note.type === 'article' && (
                        <a
                          className="note-link"
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Read Article
                        </a>
                      )}

                      {note.type === 'file' && (
                        <div className="pdf-wrapper">
                          <iframe src={note.url} title="PDF Preview" />
                        </div>
                      )}

                      <p className="note-timestamp">
                        Submitted by: <strong>{note.name || 'Unknown'}</strong>
                        <br />
                        on {postedDate}
                      </p>

                      {note.name === currentUser && (
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="close-btn"
                          style={{ marginTop: '10px' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Notes;
