import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/Notes.css';

const Notes = ({ toggleContainer }) => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]); // Store syllabus data
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSyllabusSubject, setSelectedSyllabusSubject] = useState(''); // For syllabus view
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const fetchSubjectsNotesAndSyllabus = async () => {
      try {
        // Fetch all subjects (collections) for notes
        const subjectsSnapshot = await getDocs(collection(db, '/'));
        const subjectList = subjectsSnapshot.docs
          .map(doc => doc.id)
          .filter(id => id !== 'students' && id !== 'staff' && id !== 'messages' && id !== 'tasks' && id !== 'circulars' && id !== 'leaderboard');
        setSubjects(subjectList);

        // Fetch all notes from all subjects
        const allNotes = [];
        for (const subject of subjectList) {
          const notesQuery = query(collection(db, subject), orderBy('timestamp', 'desc'));
          const notesSnapshot = await getDocs(notesQuery);
          notesSnapshot.forEach(doc => {
            allNotes.push({ id: doc.id, subject, ...doc.data() });
          });
        }
        setNotes(allNotes);
        setFilteredNotes(allNotes);

        // Fetch syllabus data
        const syllabusSnapshot = await getDocs(collection(db, 'syllabus'));
        const syllabusList = syllabusSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSyllabusData(syllabusList);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchSubjectsNotesAndSyllabus();
  }, []);

  useEffect(() => {
    // Filter notes based on subject, search query, and type
    let filtered = notes;
    if (selectedSubject) {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }
    if (searchQuery) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedType && selectedType !== 'syllabus') {
      filtered = filtered.filter(note => note.type === selectedType);
    }
    setFilteredNotes(filtered);
  }, [selectedSubject, searchQuery, selectedType, notes]);

  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  const getDriveEmbedUrl = (url) => {
    const fileId = url.match(/[-\w]{25,}/)?.[0];
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
  };

  // Handle subject selection for syllabus
  const handleSyllabusSubjectSelect = (subject) => {
    setSelectedSyllabusSubject(subject);
    setSelectedType('syllabus'); // Automatically set type to syllabus
  };

  // Get syllabus for the selected subject
  const getSyllabusForSubject = (subject) => {
    return syllabusData.find(syllabus => syllabus.subject === subject);
  };

  return (
    <div id="notes-container" className="toggle-container active">
      <div className="container-header">
        Study Notes & Syllabus
        <button onClick={() => toggleContainer(null)} className="close-btn">
          Back to Dashboard
        </button>
      </div>
      <div className="container-body">
        <div className="notes-controls">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="notes-filter"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>
                {subject.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="notes-filter"
          >
            <option value="">All Types</option>
            <option value="youtube">Video</option>
            <option value="article">Article</option>
            <option value="file">File</option>
            <option value="syllabus">Syllabus</option>
          </select>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="notes-search"
          />
          <a
            href="https://forms.gle/your-google-form-link"
            target="_blank"
            rel="noopener noreferrer"
            className="add-notes-btn"
          >
            Submit New Note
          </a>
        </div>

        {/* Display subjects grid when no syllabus is selected and type is not syllabus */}
        {selectedType !== 'syllabus' && !selectedSyllabusSubject && (
          <div className="subjects-grid">
            <h3>Subjects</h3>
            {subjects.map(subject => (
              <div
                key={subject}
                className="subject-card"
                onClick={() => handleSyllabusSubjectSelect(subject)}
              >
                <h3>{subject.replace(/_/g, ' ').toUpperCase()}</h3>
              </div>
            ))}
          </div>
        )}

        {/* Display syllabus if type is 'syllabus' or a subject is selected */}
        {(selectedType === 'syllabus' || selectedSyllabusSubject) && (
          <div className="syllabus-view">
            {selectedSyllabusSubject ? (
              <>
                <h3>Syllabus for {selectedSyllabusSubject.replace(/_/g, ' ').toUpperCase()}</h3>
                <button
                  className="back-btn"
                  onClick={() => setSelectedSyllabusSubject('')}
                >
                  Back to Subjects
                </button>
                {(() => {
                  const syllabus = getSyllabusForSubject(selectedSyllabusSubject);
                  return syllabus ? (
                    <div className="syllabus-content">
                      {syllabus.units.map((unit, index) => (
                        <div key={index} className="syllabus-unit">
                          <h4>{unit.unitName}</h4>
                          <p>{unit.topics}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-message">No syllabus found for this subject.</p>
                  );
                })()}
              </>
            ) : (
              <p className="empty-message">Select a subject to view its syllabus.</p>
            )}
          </div>
        )}

        {/* Display notes if type is not 'syllabus' and no syllabus subject is selected */}
        {selectedType !== 'syllabus' && !selectedSyllabusSubject && (
          <div className="notes-grid">
            {filteredNotes.length === 0 ? (
              <p className="empty-message">No notes found.</p>
            ) : (
              filteredNotes.map(note => (
                <div key={`${note.subject}-${note.id}`} className="note-card">
                  <h3>{note.title}</h3>
                  <p className="note-subject">{note.subject.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="note-description">{note.description}</p>
                  {note.type === 'youtube' && (
                    <iframe
                      width="100%"
                      height="200"
                      src={getYouTubeEmbedUrl(note.url)}
                      title={note.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  )}
                  {note.type === 'article' && (
                    <a href={note.url} target="_blank" rel="noopener noreferrer" className="note-link">
                      View Article
                    </a>
                  )}
                  {note.type === 'file' && (
                    <iframe
                      src={getDriveEmbedUrl(note.url)}
                      width="100%"
                      height="200"
                      frameBorder="0"
                      title={note.title}
                    ></iframe>
                  )}
                  <p className="note-timestamp">
                    Posted on {new Date(note.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;