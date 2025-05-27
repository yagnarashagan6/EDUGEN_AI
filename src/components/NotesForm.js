import React, { useState } from 'react';
import '../styles/NotesForm.css';

const NotesForm = ({ onSubmit, onCancel, subjects, studentName }) => {
  const [formData, setFormData] = useState({
    subject: '',
    youtube: '',
    article: '',
    file: null,
    description: '',
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return; // no file selected
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, file: reader.result }));
    };
    reader.onerror = () => setError('Error reading file.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!formData.subject) {
      setError('Please select a subject.');
      return;
    }
    if (!formData.youtube && !formData.article && !formData.file) {
      setError('Please provide at least one resource.');
      return;
    }

    const timestamp = new Date().toISOString();
    const uniqueBaseId = Date.now().toString(); // To avoid duplicate IDs

    const notes = [];

    if (formData.youtube) {
      notes.push({
        id: uniqueBaseId + '-yt',
        title: 'YouTube Resource',
        type: 'youtube',
        url: formData.youtube,
        subject: formData.subject,
        description: formData.description,
        name: studentName,
        timestamp,
      });
    }

    if (formData.article) {
      notes.push({
        id: uniqueBaseId + '-art',
        title: 'Article Resource',
        type: 'article',
        url: formData.article,
        subject: formData.subject,
        description: formData.description,
        name: studentName,
        timestamp,
      });
    }

    if (formData.file) {
      notes.push({
        id: uniqueBaseId + '-pdf',
        title: 'PDF Resource',
        type: 'file',
        url: formData.file,
        subject: formData.subject,
        description: formData.description,
        name: studentName,
        timestamp,
      });
    }

    setUploading(true);
    setTimeout(() => {
      onSubmit(notes);
      setFormData({ subject: '', youtube: '', article: '', file: null, description: '' });
      setUploading(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h2>Upload Study Resources</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-4">
        <label>Select Subject *</label>
        <select name="subject" value={formData.subject} onChange={handleInputChange} required>
          <option value="">Choose a subject</option>
          {subjects.map((subj) => (
            <option key={subj} value={subj}>
              {subj.replace(/_/g, ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          placeholder="Add a brief description..."
        />
      </div>

      <div className="mb-4">
        <label>YouTube Link</label>
        <input
          type="url"
          name="youtube"
          value={formData.youtube}
          onChange={handleInputChange}
          placeholder="Paste YouTube URL"
        />
      </div>

      <div className="mb-4">
        <label>Online Article Link</label>
        <input
          type="url"
          name="article"
          value={formData.article}
          onChange={handleInputChange}
          placeholder="Paste Article URL"
        />
      </div>

      <div className="mb-4">
        <label>Upload PDF</label>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
      </div>

      <div className="form-buttons">
        <button type="button" onClick={onCancel} disabled={uploading}>
          Cancel
        </button>
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};

export default NotesForm;
