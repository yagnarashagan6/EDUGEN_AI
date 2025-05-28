import React, { useState, useRef, useEffect } from 'react';
import '../styles/NotesForm.css';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const NotesForm = ({ onSubmit, onCancel, subjects, studentName, students }) => {
  const [formData, setFormData] = useState({
    subject: '',
    youtube: '',
    article: '',
    file: null,
    description: '',
    title: '',
    sharedWith: ['all'] // Default to sharing with all students
  });
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Define senderName and userId at component level
  const user = auth.currentUser;
  const senderName = user?.displayName || studentName || 'Unknown';
  const userId = user?.uid || 'unknown';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSharedWithChange = (value) => {
    setFormData((prev) => {
      if (value === 'all') {
        // If "All Students" is selected, override with ['all']
        return { ...prev, sharedWith: ['all'] };
      } else {
        // Toggle individual student selection
        let newSharedWith = prev.sharedWith.includes('all') ? [] : [...prev.sharedWith];
        if (newSharedWith.includes(value)) {
          newSharedWith = newSharedWith.filter((id) => id !== value);
        } else {
          newSharedWith.push(value);
        }
        // Ensure sharedWith is never empty
        return { ...prev, sharedWith: newSharedWith.length > 0 ? newSharedWith : ['all'] };
      }
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('No file selected.');
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const storageRef = ref(storage, `notes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setFormData((prev) => ({
        ...prev,
        file: downloadURL,
        title: prev.title || file.name.replace('.pdf', '')
      }));
    } catch (err) {
      console.error("Error uploading file:", err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const validateYouTubeUrl = (url) => {
    return url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.subject) {
      setError('Please select a subject.');
      return;
    }

    if (!formData.youtube && !formData.article && !formData.file) {
      setError('Please provide at least one resource (YouTube, article, or PDF).');
      return;
    }

    if (formData.youtube && !validateYouTubeUrl(formData.youtube)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }

    if (formData.article && !formData.article.match(/^https?:\/\/.+/)) {
      setError('Please enter a valid article URL starting with http:// or https://.');
      return;
    }

    if (!formData.title) {
      setError('Please provide a title for the resource.');
      return;
    }

    if (formData.sharedWith.length === 0) {
      setError('Please select at least one recipient.');
      return;
    }

    const timestamp = new Date().toISOString();

    const notes = [];

    if (formData.youtube) {
      notes.push({
        title: formData.title,
        type: 'youtube',
        url: formData.youtube,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith
      });
    }

    if (formData.article) {
      notes.push({
        title: formData.title,
        type: 'article',
        url: formData.article,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith
      });
    }

    if (formData.file) {
      notes.push({
        title: formData.title,
        type: 'file',
        url: formData.file,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith
      });
    }

    try {
      await onSubmit(notes);
      setFormData({ subject: '', youtube: '', article: '', file: null, description: '', title: '', sharedWith: ['all'] });
      setError('');
    } catch (err) {
      setError('Failed to submit notes. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h2>Upload Study Resources</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Select Subject *</label>
        <select
          name="subject"
          value={formData.subject}
          onChange={handleInputChange}
          className="mt-1 block w-full border rounded-md p-2"
          required
        >
          <option value="">Choose a subject</option>
          {subjects.map((subj) => (
            <option key={subj} value={subj}>
              {subj.replace(/_/g, ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Share With *</label>
        <div className="relative" ref={dropdownRef}>
          <input
            type="text"
            readOnly
            className="mt-1 block w-full border rounded-md p-2 bg-gray-100 cursor-pointer"
            value={
              formData.sharedWith.includes('all')
                ? 'All Students'
                : `${formData.sharedWith.length} student${formData.sharedWith.length > 1 ? 's' : ''} selected`
            }
            onClick={() => setDropdownOpen((open) => !open)}
          />
          {dropdownOpen && (
            <div className="absolute z-10 bg-white border rounded-md mt-1 w-full shadow-lg max-h-60 overflow-y-auto">
              <div
                className={`p-2 cursor-pointer flex items-center ${formData.sharedWith.includes('all') ? 'bg-blue-100' : ''}`}
                onClick={() => handleSharedWithChange('all')}
              >
                <input
                  type="checkbox"
                  checked={formData.sharedWith.includes('all')}
                  readOnly
                  className="mr-2"
                />
                All Students
              </div>
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-2 cursor-pointer flex items-center ${formData.sharedWith.includes(student.id) ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSharedWithChange(student.id)}
                >
                  <input
                    type="checkbox"
                    checked={formData.sharedWith.includes(student.id)}
                    readOnly
                    className="mr-2"
                  />
                  {student.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Title *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Resource title"
          className="mt-1 block w-full border rounded-md p-2"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          placeholder="Add a brief description..."
          className="mt-1 block w-full border rounded-md p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">YouTube Link</label>
        <input
          type="url"
          name="youtube"
          value={formData.youtube}
          onChange={handleInputChange}
          placeholder="Paste YouTube URL"
          className="mt-1 block w-full border rounded-md p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Online Article Link</label>
        <input
          type="url"
          name="article"
          value={formData.article}
          onChange={handleInputChange}
          placeholder="Paste Article URL"
          className="mt-1 block w-full border rounded-md p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Upload PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="mt-1 block w-full"
        />
        {uploading && <p className="mt-2 text-sm text-gray-500">Uploading file...</p>}
      </div>

      <div className="form-buttons flex space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          {uploading ? 'Uploading...' : 'Submit'}
        </button>
      </div>

      <p className="note-sender mt-4">
        <strong>By: {senderName}</strong>
      </p>
    </form>
  );
};

export default NotesForm;