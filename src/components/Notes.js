// Notes.js
import React, { useState, useEffect } from 'react';
import NotesForm from './NotesForm';
import '../styles/Notes.css';
import { db, auth } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';

const Notes = ({ toggleContainer, studentName }) => {
  const currentUser = studentName || 'Unknown';
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [subjects, setSubjects] = useState(['human_resource', 'it', 'agriculture']);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userNames, setUserNames] = useState({});

  useEffect(() => {
    // Fetch students from Firebase
    const unsubscribeStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        try {
          const studentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown'
          }));
          setStudents(studentsData);
        } catch (error) {
          console.error("Error fetching students:", error);
          setError('Failed to load students. Please try again.');
        }
      },
      (error) => {
        console.error("Error in students snapshot listener:", error);
        setError('Failed to load students. Please try again.');
      }
    );

    const unsubscribeNotes = onSnapshot(
      collection(db, 'notes'),
      (snapshot) => {
        try {
          const notesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          // Filter notes based on sharedWith (all or includes current user's ID)
          const filtered = notesData.filter(note => 
            note.sharedWith.includes('all') || 
            note.sharedWith.includes(auth.currentUser?.uid)
          );
          setNotes(filtered);
          setFilteredNotes(filtered);
          setLoading(false);

          const uniqueSubjects = [...new Set(filtered.map(note => note.subject))];
          setSubjects(uniqueSubjects.length > 0 ? uniqueSubjects : ['human_resource', 'it', 'agriculture']);
        } catch (error) {
          console.error("Error fetching notes:", error);
          setError('Failed to load notes. Please try again.');
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error in notes snapshot listener:", error);
        setError('Failed to load notes. Please try again.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeNotes();
    };
  }, []);

  useEffect(() => {
    const fetchUserNames = async () => {
      const uniqueUserIds = [...new Set(notes.map(note => note.userId).filter(Boolean))];
      const namesMap = {};
      for (const userId of uniqueUserIds) {
        try {
          const userDoc = await getDoc(doc(db, 'students', userId));
          if (userDoc.exists()) {
            namesMap[userId] = userDoc.data().name || 'Unknown';
          }
        } catch (e) {
          namesMap[userId] = 'Unknown';
        }
      }
      setUserNames(namesMap);
    };
    if (notes.length > 0) fetchUserNames();
  }, [notes]);

  useEffect(() => {
    let filtered = [...notes];
    if (selectedSubject) {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedType) {
      filtered = filtered.filter(note => note.type === selectedType);
    }
    setFilteredNotes(filtered);
  }, [notes, selectedSubject, selectedType, searchQuery]);

  const getYouTubeEmbedUrl = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : '';
  };

  const handleNoteSubmit = async (newNotes) => {
    try {
      for (const note of newNotes) {
        await addDoc(collection(db, 'notes'), {
          ...note,
          name: note.name || currentUser,
          userId: auth.currentUser?.uid || 'unknown',
          timestamp: new Date().toISOString(),
        });
      }
      setShowForm(false);
      setError('');
    } catch (error) {
      console.error("Error adding note:", error);
      setError('Failed to add note. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      setError('');
    } catch (error) {
      console.error("Error deleting note:", error);
      setError('Failed to delete note. Please try again.');
    }
  };

  return (
    <div id="notes-container" className="notes-container">
      <div className="container-header">📚 Study Notes</div>
      <div className="container-body">
        {error && <p className="error-message text-red-500">{error}</p>}
        {loading ? (
          <p>Loading notes...</p>
        ) : showForm ? (
          <NotesForm
            onSubmit={handleNoteSubmit}
            onCancel={() => setShowForm(false)}
            subjects={subjects}
            studentName={currentUser}
            students={students}
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
                  const postedDate = new Date(note.timestamp).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });

                  return (
                    <div key={note.id} className="note-card" style={{ position: 'relative' }}>
                      <h3>{note.title}</h3>

                      {note.description && (
                        <p className="note-description">
                          {note.description}
                        </p>
                      )}

                      {note.type === 'youtube' && note.url && (
                        <div className="video-wrapper">
                          <iframe
                            src={getYouTubeEmbedUrl(note.url)}
                            title={note.title}
                            className="video-iframe"
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
                          <iframe src={note.url} title={note.title} className="pdf-iframe" />
                        </div>
                      )}

                      {/* Sender and date at bottom right */}
                      <div className="note-meta-bottom-right">
                        <p className="note-sender" style={{ margin: 0 }}>
                          by: <span className="note-sender-highlight">
                            {userNames[note.userId] || note.name || 'Unknown'}
                          </span>
                        </p>
                        <p className="note-timestamp" style={{ margin: 0, fontSize: '0.95em', color: '#666' }}>
                          on {new Date(note.timestamp).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {note.userId === auth.currentUser?.uid && (
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