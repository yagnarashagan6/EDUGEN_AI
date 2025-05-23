import React, { useState, useEffect } from 'react';
import '../styles/Notes.css';

const Notes = ({ toggleContainer }) => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [syllabusData, setSyllabusData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSyllabusSubject, setSelectedSyllabusSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace with your Google Apps Script web app URL
  const API_URL = 'https://script.google.com/macros/s/AKfycbzPaOGYmXQQCjQ7n61wHGRS6-KYYVbfzSmlIyKRGrrEaUTq1LioGLzwlFW_ZYqHLvbPug/exec';

  // Fallback data if API fails
  const fallbackNotes = [
    {
      id: '1',
      timestamp: '2025-05-23T10:32:00Z',
      title: 'HRM Lecture',
      description: 'Lecture on HRM',
      type: 'youtube',
      url: 'https://youtu.be/uiZI6qt7Pyc?si=9wRpbOr_688Ml8O4',
      subject: 'human_resource_management'
    },
    {
      id: '2',
      timestamp: '2025-05-23T10:33:00Z',
      title: 'HRM Notes',
      description: 'Online lecture notes',
      type: 'article',
      url: 'https://www.enggtree.com/ge3754-human-resource-management-lecture-notes-2021-regulation/',
      subject: 'human_resource_management'
    },
    {
      id: '3',
      timestamp: '2025-05-23T10:34:00Z',
      title: 'HRM PDF Notes',
      description: 'PDF notes for HRM',
      type: 'file',
      url: 'https://drive.google.com/file/d/<SAMPLE-PDF-FILE-ID>/view?usp=sharing.pdf',
      subject: 'human_resource_management'
    }
  ];

  useEffect(() => {
    const fetchNotesAndSubjects = async (retries = 3, delay = 1000) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setNotes(data.notes || fallbackNotes);
        setFilteredNotes(data.notes || fallbackNotes);
        setSubjects(data.subjects || ['human_resource_management']);
        setSyllabusData(data.syllabusData.length > 0 ? data.syllabusData : [
          {
            subject: 'human_resource_management',
            units: [
              { unitName: 'Unit 1: Introduction', topics: 'HRM basics, roles, and responsibilities' },
              { unitName: 'Unit 2: Recruitment', topics: 'Hiring processes, strategies' }
            ]
          }
        ]);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (retries > 0) {
          console.log(`Retrying... ${retries} attempts left`);
          setTimeout(() => fetchNotesAndSubjects(retries - 1, delay * 2), delay);
          return;
        }
        setNotes(fallbackNotes);
        setFilteredNotes(fallbackNotes);
        setSubjects(['human_resource_management']);
        setSyllabusData([
          {
            subject: 'human_resource_management',
            units: [
              { unitName: 'Unit 1: Introduction', topics: 'HRM basics, roles, and responsibilities' },
              { unitName: 'Unit 2: Recruitment', topics: 'Hiring processes, strategies' }
            ]
          }
        ]);
        setError(`Failed to load notes: ${err.message}. Using fallback data.`);
      } finally {
        setLoading(false);
      }
    };

    fetchNotesAndSubjects();
  }, []);

  useEffect(() => {
    let filtered = notes;
    if (selectedSubject) {
      filtered = filtered.filter(note => note.subject === selectedSubject);
    }
    if (searchQuery) {
      filtered = filtered.filter(note =>
        (note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         note.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (selectedType && selectedType !== 'syllabus') {
      filtered = filtered.filter(note => note.type === selectedType);
    }
    setFilteredNotes(filtered);
  }, [selectedSubject, searchQuery, selectedType, notes]);

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  const getDriveEmbedUrl = (url) => {
    if (!url) return '';
    const fileId = url.match(/[-\w]{25,}/)?.[0];
    if (fileId && url.toLowerCase().includes('.pdf')) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return '';
  };

  const handleSyllabusSubjectSelect = (subject) => {
    setSelectedSyllabusSubject(subject);
    setSelectedType('syllabus');
  };

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
        {loading && <p>Loading notes...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loading && (
          <>
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
                <option value="file">File (PDF)</option>
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
                href="https://docs.google.com/forms/d/1ykB6ldccj5nNxKp-V_PhGhGFPIeNIuSJylywwJmvJfk/edit#responses"
                target="_blank"
                rel="noopener noreferrer"
                className="add-notes-btn"
              >
                Submit New Note
              </a>
            </div>

            {selectedType !== 'syllabus' && !selectedSyllabusSubject && (
              <div className="subjects-grid">
                <h3>Subjects</h3>
                {subjects.length === 0 ? (
                  <p>No subjects available.</p>
                ) : (
                  subjects.map(subject => (
                    <div
                      key={subject}
                      className="subject-card"
                      onClick={() => handleSyllabusSubjectSelect(subject)}
                    >
                      <h3>{subject.replace(/_/g, ' ').toUpperCase()}</h3>
                    </div>
                  ))
                )}
              </div>
            )}

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
                          {syllabus.units?.map((unit, index) => (
                            <div key={index} className="syllabus-unit">
                              <h4>{unit.unitName || 'Unit ' + (index + 1)}</h4>
                              <p>{unit.topics || 'No topics available'}</p>
                            </div>
                          )) || <p>No units available.</p>}
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

            {selectedType !== 'syllabus' && !selectedSyllabusSubject && (
              <div className="notes-grid">
                {filteredNotes.length === 0 ? (
                  <p className="empty-message">No notes found.</p>
                ) : (
                  filteredNotes.map(note => (
                    <div key={`${note.subject}-${note.id}`} className="note-card">
                      <h3>{note.title || 'Untitled'}</h3>
                      <p className="note-subject">{note.subject.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="note-description">{note.description || 'No description'}</p>
                      {note.type === 'youtube' && getYouTubeEmbedUrl(note.url) && (
                        <iframe
                          width="100%"
                          height="200"
                          src={getYouTubeEmbedUrl(note.url)}
                          title={note.title || 'YouTube Video'}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      )}
                      {note.type === 'article' && note.url && (
                        <a href={note.url} target="_blank" rel="noopener noreferrer" className="note-link">
                          View Article
                        </a>
                      )}
                      {note.type === 'file' && getDriveEmbedUrl(note.url) && (
                        <iframe
                          src={getDriveEmbedUrl(note.url)}
                          width="100%"
                          height="200"
                          frameBorder="0"
                          title={note.title || 'PDF Document'}
                        ></iframe>
                      )}
                      <p className="note-timestamp">
                        Posted on {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notes;