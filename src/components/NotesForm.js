import React, { useState, useRef, useEffect } from "react";
import "../styles/NotesForm.css";
import { storage, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const NotesForm = ({ onSubmit, onCancel, subjects, studentName, students }) => {
  const [formData, setFormData] = useState({
    subject: "",
    youtube: "",
    article: "",
    file: null,
    description: "",
    title: "",
    sharedWith: ["all"], // Default to sharing with all students
  });
  const [error, setError] = useState("");
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [senderName, setSenderName] = useState(studentName || "Unknown");

  useEffect(() => {
    // Prefer the 'name' field from the profile if available
    if (studentName && typeof studentName === "object" && studentName.name) {
      setSenderName(studentName.name);
    } else if (typeof studentName === "string" && studentName) {
      setSenderName(studentName);
    } else if (auth.currentUser && auth.currentUser.displayName) {
      setSenderName(auth.currentUser.displayName);
    } else {
      setSenderName("Unknown");
    }
  }, [studentName]);

  const userId = auth.currentUser?.uid || "unknown";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSharedWithChange = (value) => {
    setFormData((prev) => {
      if (value === "all") {
        // If "All Students" is selected, override with ['all']
        return { ...prev, sharedWith: ["all"] };
      } else {
        // Toggle individual student selection
        let newSharedWith = prev.sharedWith.includes("all")
          ? []
          : [...prev.sharedWith];
        if (newSharedWith.includes(value)) {
          newSharedWith = newSharedWith.filter((id) => id !== value);
        } else {
          newSharedWith.push(value);
        }
        // Ensure sharedWith is never empty
        return {
          ...prev,
          sharedWith: newSharedWith.length > 0 ? newSharedWith : ["all"],
        };
      }
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError("No file selected.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const storageRef = ref(storage, `notes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      setFormData((prev) => ({
        ...prev,
        file: downloadURL,
        title: prev.title || file.name.replace(".pdf", ""),
      }));
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const validateYouTubeUrl = (url) => {
    return url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.subject) {
      setError("Please select a subject.");
      return;
    }

    if (!formData.youtube && !formData.article && !formData.file) {
      setError(
        "Please provide at least one resource (YouTube, article, or PDF)."
      );
      return;
    }

    if (formData.youtube && !validateYouTubeUrl(formData.youtube)) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    if (formData.article && !formData.article.match(/^https?:\/\/.+/)) {
      setError(
        "Please enter a valid article URL starting with http:// or https://."
      );
      return;
    }

    if (!formData.title) {
      setError("Please provide a title for the resource.");
      return;
    }

    if (formData.sharedWith.length === 0) {
      setError("Please select at least one recipient.");
      return;
    }

    const timestamp = new Date().toISOString();

    const notes = [];

    if (formData.youtube) {
      notes.push({
        title: formData.title,
        type: "youtube",
        url: formData.youtube,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith,
      });
    }

    if (formData.article) {
      notes.push({
        title: formData.title,
        type: "article",
        url: formData.article,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith,
      });
    }

    if (formData.file) {
      notes.push({
        title: formData.title,
        type: "file",
        url: formData.file,
        subject: formData.subject,
        description: formData.description,
        name: senderName,
        userId,
        timestamp,
        sharedWith: formData.sharedWith,
      });
    }

    try {
      await onSubmit(notes);
      setFormData({
        subject: "",
        youtube: "",
        article: "",
        file: null,
        description: "",
        title: "",
        sharedWith: ["all"],
      });
      setError("");
    } catch (err) {
      setError("Failed to submit notes. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="notes-form">
      <div className="form-header">
        <h2>📚 Upload Study Resources</h2>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="form-content">
        <div className="form-group">
          <label className="form-label">Select Subject *</label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            className="form-select"
            required
          >
            <option value="">Choose a subject</option>
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Share With *</label>
          <div className="dropdown-container" ref={dropdownRef}>
            <div
              className="dropdown-input"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              <span className="dropdown-text">
                {formData.sharedWith.includes("all")
                  ? "All Students"
                  : `${formData.sharedWith.length} student${
                      formData.sharedWith.length > 1 ? "s" : ""
                    } selected`}
              </span>
              <span className={`dropdown-arrow ${dropdownOpen ? "open" : ""}`}>
                ▼
              </span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-list">
                <div
                  className={`dropdown-item ${
                    formData.sharedWith.includes("all") ? "selected" : ""
                  }`}
                  onClick={() => handleSharedWithChange("all")}
                >
                  <input
                    type="checkbox"
                    checked={formData.sharedWith.includes("all")}
                    readOnly
                    className="dropdown-checkbox"
                  />
                  <span className="student-name">All Students</span>
                </div>
                {students
                  .filter(
                    (student) => student.name && student.name !== "Unknown"
                  )
                  .map((student) => (
                    <div
                      key={student.id}
                      className={`dropdown-item ${
                        formData.sharedWith.includes(student.id)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => handleSharedWithChange(student.id)}
                    >
                      <input
                        type="checkbox"
                        checked={formData.sharedWith.includes(student.id)}
                        readOnly
                        className="dropdown-checkbox"
                      />
                      <span className="student-name">{student.name}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter resource title"
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            placeholder="Add a brief description (optional)"
            className="form-textarea"
          />
        </div>

        <div className="resource-section">
          <h3 className="section-title">📎 Add Resources</h3>
          <p className="section-subtitle">Add at least one resource below</p>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🎥</span>
              YouTube Link
            </label>
            <input
              type="url"
              name="youtube"
              value={formData.youtube}
              onChange={handleInputChange}
              placeholder="https://youtube.com/watch?v=..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📄</span>
              Online Article Link
            </label>
            <input
              type="url"
              name="article"
              value={formData.article}
              onChange={handleInputChange}
              placeholder="https://example.com/article"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📋</span>
              Upload PDF
            </label>
            <div className="file-upload-wrapper">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="file-upload-label">
                {uploading ? (
                  <>
                    <span className="upload-icon spinning">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="upload-icon">📁</span>
                    Choose PDF file
                  </>
                )}
              </label>
              {formData.file && (
                <div className="file-success">
                  <span className="success-icon">✅</span>
                  PDF uploaded successfully
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons moved below upload */}
          <div className="form-actions">
            <div className="form-buttons">
              <button
                type="button"
                onClick={onCancel}
                disabled={uploading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? (
                  <>
                    <span className="btn-icon spinning">⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✨</span>
                    Submit Resources
                  </>
                )}
              </button>
            </div>

            {/* Attribution below buttons */}
            <div className="form-attribution">
              <span className="attribution-icon">👤</span>
              <strong>By: {senderName}</strong>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default NotesForm;
