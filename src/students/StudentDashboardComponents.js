// StudentDashboardComponents.js
import React, { useState, useEffect, useCallback } from "react";
import { supabaseAuth as auth, fetchMarks, fetchSubmission, saveSubmission, deleteSubmission } from "../supabase";

export const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return <h1>Something went wrong. Please refresh the page.</h1>;
  }
  return children;
};

export const ChatInterface = ({
  messages,
  selectedStaffId,
  selectedStaffName,
  staffList,
  sendMessage,
  deleteMessage,
  showContactList,
  setShowContactList,
  setSelectedStaffId,
  setSelectedStaffName,
  currentUserId,
}) => {
  const selectStaff = useCallback(
    (staff) => {
      setSelectedStaffId(staff.id);
      setSelectedStaffName(staff.name);
      setShowContactList(false);
    },
    [setSelectedStaffId, setSelectedStaffName, setShowContactList]
  );

  const formatDate = (dateString) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(dateString);

    if (messageDate.toDateString() === today.toDateString()) return "Today";
    if (messageDate.toDateString() === yesterday.toDateString())
      return "Yesterday";
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const groupedMessages = messages.reduce((acc, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(message);
    return acc;
  }, {});

  return (
    <div className="chat-interface">
      <div className="chat-body">
        {showContactList ? (
          <div className="contact-list scrollable">
            <div className="contact-list-header">🧑‍🏫 Staff Members</div>
            <div className="contact-list-body">
              {staffList.filter(
                (staff) => staff.name && staff.name.trim() !== ""
              ).length === 0 ? (
                <p className="empty-message">Loading staff members...</p>
              ) : (
                staffList
                  .filter((staff) => staff.name && staff.name.trim() !== "")
                  .map((staff) => (
                    <div
                      key={staff.id}
                      className={`contact-item ${selectedStaffId === staff.id ? "active" : ""
                        }`}
                      onClick={() => selectStaff(staff)}
                    >
                      <div className="contact-info">
                        <h4>{staff.name}</h4>
                        <p>{staff.role || "Available"}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="chat-container full-container">
            <div className="chat-header">
              <button
                onClick={() => setShowContactList(true)}
                className="toggle-contact-btn"
              >
                Back to List
              </button>
              {selectedStaffId && (
                <>
                  <div className="recipient-info">
                    <h3>{selectedStaffName}</h3>
                    <p className="status">Online</p>
                  </div>
                </>
              )}
            </div>
            <div className="messages-container scrollable">
              {selectedStaffId ? (
                Object.keys(groupedMessages).length === 0 ? (
                  <p className="empty-message">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  Object.keys(groupedMessages).map((dateKey) => (
                    <div key={dateKey}>
                      <div className="date-separator">
                        {formatDate(dateKey)}
                      </div>
                      {groupedMessages[dateKey].map((msg, index) => (
                        <div
                          key={`${msg.timestamp}-${index}`}
                          className={`message-bubble ${msg.sender === "student" ? "sent" : "received"
                            }`}
                          onClick={() => {
                            if (
                              msg.sender === "student" &&
                              window.confirm("Delete this message?")
                            ) {
                              deleteMessage(index);
                            }
                          }}
                        >
                          <div className="message-content">{msg.text}</div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.sender === "student" && (
                              <span className="message-status">
                                {msg.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )
              ) : (
                <p className="empty-message">
                  Select a staff member to start chatting.
                </p>
              )}
            </div>
            {selectedStaffId && (
              <div className="message-input-area">
                <input
                  type="text"
                  id="message-input"
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="message-input-field"
                />
                <button onClick={sendMessage} className="send-message-button">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const AssignmentSummaryCard = ({ assignment }) => {
  const [marks, setMarks] = useState(null);
  const [marksLoading, setMarksLoading] = useState(true);

  useEffect(() => {
    const loadMarks = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const marksData = await fetchMarks(user.uid, assignment.id);
        if (marksData) {
          setMarks(marksData);
        }
        setMarksLoading(false);
      } catch (err) {
        console.error("Error fetching marks:", err);
        setMarksLoading(false);
      }
    };
    loadMarks();
  }, [assignment.id]);

  // Check if assignment has expired
  const isExpired =
    assignment.deadline && new Date(assignment.deadline) < new Date();

  return (
    <div
      className="assignment-summary-card"
      style={{
        marginBottom: "16px",
        cursor: "pointer",
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: window.innerWidth <= 768 ? "12px" : "20px",
        background: isExpired ? "#f8f9fa" : "#ffffff",
        border: `2px solid ${isExpired ? "#dee2e6" : "#1976d2"}`,
        borderRadius: "12px",
        boxShadow: isExpired
          ? "0 2px 4px rgba(0,0,0,0.1)"
          : "0 4px 16px rgba(25, 118, 210, 0.15)",
        transition: "all 0.3s ease",
        opacity: 1,
        minHeight: window.innerWidth <= 768 ? "70px" : "100px",
        boxSizing: "border-box",
      }}
      onMouseOver={(e) => {
        if (!isExpired) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 6px 20px rgba(25, 118, 210, 0.2)";
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isExpired
          ? "0 2px 4px rgba(0,0,0,0.1)"
          : "0 4px 16px rgba(25, 118, 210, 0.15)";
      }}
    >
      <div
        style={{
          flex: 1,
          paddingRight: window.innerWidth <= 768 ? "8px" : "16px",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px 0",
            fontSize: window.innerWidth <= 768 ? "14px" : "20px",
            fontWeight: "600",
            color: isExpired ? "#6c757d" : "#1976d2",
            lineHeight: "1.3",
            wordBreak: "break-word",
            hyphens: "auto",
          }}
        >
          {assignment.subject}
          {isExpired && (
            <span
              style={{
                marginLeft: "6px",
                fontSize: window.innerWidth <= 768 ? "8px" : "10px",
                color: "#ff5252",
                fontWeight: "bold",
                background: "#ffebee",
                padding: "2px 4px",
                borderRadius: "4px",
                display: window.innerWidth <= 768 ? "block" : "inline",
                marginTop: window.innerWidth <= 768 ? "2px" : "0",
              }}
            >
              EXPIRED
            </span>
          )}
        </h3>

        {/* Deadline info */}
        {assignment.deadline && (
          <div
            style={{
              fontSize: window.innerWidth <= 768 ? "10px" : "14px",
              color: isExpired ? "#ff5252" : "#666",
              marginBottom: "2px",
              display: "flex",
              alignItems: "center",
              gap: window.innerWidth <= 768 ? "4px" : "6px",
              flexWrap: window.innerWidth <= 768 ? "wrap" : "nowrap",
            }}
          >
            <i
              className="fas fa-clock"
              style={{
                fontSize: window.innerWidth <= 768 ? "10px" : "12px",
                flexShrink: 0,
              }}
            ></i>
            <span
              style={{
                lineHeight: "1.2",
                wordBreak: "break-word",
              }}
            >
              Due:{" "}
              {new Date(assignment.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: window.innerWidth <= 768 ? undefined : "numeric",
              })}{" "}
              {window.innerWidth <= 768 ? "" : "at "}
              {new Date(assignment.deadline).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        )}

        {isExpired && (
          <p
            style={{
              margin: "0",
              fontSize: window.innerWidth <= 768 ? "9px" : "12px",
              color: "#ff5252",
              fontWeight: "500",
              lineHeight: "1.2",
            }}
          >
            Link no longer available
          </p>
        )}
      </div>

      <div
        style={{
          minWidth: window.innerWidth <= 768 ? 45 : 80,
          maxWidth: window.innerWidth <= 768 ? 50 : 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: isExpired
              ? "linear-gradient(135deg, #3742fa, #2f3542)"
              : "linear-gradient(135deg, #3742fa, #2f3542)",
            color: isExpired ? "#43ffc7ff" : "#1976d2",
            borderRadius: "50%",
            width: window.innerWidth <= 768 ? 40 : 70,
            height: window.innerWidth <= 768 ? 40 : 70,
            fontWeight: 700,
            fontSize: window.innerWidth <= 768 ? 12 : 20,
            lineHeight: window.innerWidth <= 768 ? "40px" : "70px",
            textAlign: "center",
            boxShadow: isExpired
              ? "inset 0 2px 4px rgba(0,0,0,0.1)"
              : "0 3px 8px rgba(25, 118, 210, 0.2), inset 0 2px 4px rgba(255,255,255,0.5)",
            border: isExpired ? "2px solid #e0e0e0" : "2px solid #1976d2",
            boxSizing: "border-box",
          }}
        >
          {marksLoading ? (
            <span
              style={{
                color: "#43ffc7ff",
                fontWeight: 400,
                fontSize: window.innerWidth <= 768 ? 8 : 12,
              }}
            >
              ...
            </span>
          ) : marks && marks.marks !== undefined ? (
            marks.marks
          ) : (
            <span
              style={{
                color: "#43ffc7ff",
                fontWeight: 400,
                fontSize: window.innerWidth <= 768 ? 8 : 12,
              }}
            >
              N/A
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export const AssignmentItem = ({ assignment }) => {
  const [marks, setMarks] = useState(null);
  const [marksLoading, setMarksLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch marks
      try {
        const marksData = await fetchMarks(user.uid, assignment.id);
        if (marksData) {
          setMarks(marksData);
        }
      } catch (err) {
        console.warn("Could not fetch marks:", err);
      } finally {
        setMarksLoading(false);
      }

      // Fetch submission
      try {
        const submissionData = await fetchSubmission(user.uid, assignment.id);
        if (submissionData) {
          setSubmission(submissionData);
        }
      } catch (err) {
        console.warn("Could not fetch submission:", err);
      }
    };
    fetchData();
  }, [assignment.id]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const user = auth.currentUser;
    if (!user) return;

    // Determine resource type based on file MIME type
    // Use 'auto' for PDFs to let Cloudinary handle them optimally
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const isPdf = fileExtension === "pdf" || file.type === "application/pdf";

    let uploadEndpoint = "raw"; // Default for documents
    if (file.type.startsWith("image/")) {
      uploadEndpoint = "image";
    } else if (file.type.startsWith("video/")) {
      uploadEndpoint = "video";
    } else if (isPdf) {
      uploadEndpoint = "auto"; // Use auto for PDFs - Cloudinary handles them as images
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "edugen_ai");
    formData.append("cloud_name", "de9ouuk13");

    try {
      console.log(`Starting upload to Cloudinary as ${uploadEndpoint}...`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/de9ouuk13/${uploadEndpoint}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      console.log("Cloudinary response:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || "Upload failed");
      }

      if (data.secure_url) {
        const cleanUrl = data.secure_url;
        const actualResourceType = data.resource_type || uploadEndpoint;

        const submissionData = {
          link: cleanUrl,
          downloadLink: cleanUrl.replace("/upload/", "/upload/fl_attachment/"),
          submittedAt: new Date().toISOString(),
          fileName: file.name,
          fileType: file.type,
          resourceType: actualResourceType,
          publicId: data.public_id,
        };

        // Save metadata to Supabase
        try {
          await saveSubmission(user.uid, assignment.id, submissionData);
          setSubmission(submissionData);
          setFile(null);
          alert("Assignment uploaded successfully!");
        } catch (supabaseError) {
          console.error(
            "Error saving submission to Supabase:",
            supabaseError
          );
          alert(
            "File uploaded to Cloudinary, but failed to save record to database. Please contact support."
          );
        }
      } else {
        alert("Upload failed: " + (data.error?.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(
        `Error uploading file: ${error.message}. Please check your internet connection or try again.`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!window.confirm("Are you sure you want to delete your submission?"))
      return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteSubmission(user.uid, assignment.id);
      setSubmission(null);
      alert("Submission deleted successfully.");
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Failed to delete submission.");
    }
  };

  // Check if assignment has expired
  const isExpired =
    assignment.deadline && new Date(assignment.deadline) < new Date();

  return (
    <div
      className={`assignment-detail-card ${isExpired ? "expired" : ""}`}
      style={{
        marginBottom: "16px",
        background: isExpired ? "#f8f9fa" : "#ffffff",
        border: `1px solid ${isExpired ? "#dee2e6" : "#e3f2fd"}`,
        borderRadius: "12px",
        padding: "16px",
        boxShadow: isExpired
          ? "0 2px 4px rgba(0,0,0,0.05)"
          : "0 2px 8px rgba(25, 118, 210, 0.1)",
        position: "relative",
      }}
    >
      {/* Status Badge */}
      {isExpired && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "#ff5252",
            color: "white",
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          EXPIRED
        </div>
      )}

      {/* Assignment Title */}
      <div
        style={{ marginBottom: "16px", paddingRight: isExpired ? "80px" : "0" }}
      >
        <h3
          style={{
            margin: "0",
            fontSize: "20px",
            fontWeight: "600",
            color: isExpired ? "#6c757d" : "#1976d2",
          }}
        >
          {!isExpired && assignment.driveLink ? (
            <a
              href={assignment.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#1976d2",
                textDecoration: "none",
                borderBottom: "2px solid transparent",
                transition: "border-bottom-color 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.target.style.borderBottomColor = "#1976d2")
              }
              onMouseOut={(e) =>
                (e.target.style.borderBottomColor = "transparent")
              }
              title="Click to open assignment"
              onClick={(e) => e.stopPropagation()}
            >
              {assignment.subject}
              <i
                className="fas fa-external-link-alt"
                style={{ marginLeft: "8px", fontSize: "14px" }}
              ></i>
            </a>
          ) : (
            <span style={{ color: isExpired ? "#6c757d" : "#1976d2" }}>
              {assignment.subject}
            </span>
          )}
        </h3>
      </div>

      {/* Assignment Details */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: window.innerWidth <= 768 ? "1fr" : "1fr 1fr",
            gap: "12px",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <i
              className="fas fa-clock"
              style={{
                color: isExpired ? "#ff5252" : "#ff9800",
                fontSize: "14px",
              }}
            ></i>
            <div>
              <strong>Deadline:</strong>{" "}
              {assignment.deadline ? (
                <span style={{ color: isExpired ? "red" : "inherit" }}>
                  {new Date(assignment.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(assignment.deadline).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              ) : (
                "No deadline set"
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <i
              className="fas fa-calendar-plus"
              style={{ color: "#28a745", fontSize: "14px" }}
            ></i>
            <div>
              <strong>Posted:</strong>{" "}
              {assignment.postedAt
                ? new Date(assignment.postedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Section */}
      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          background: "#f0f4f8",
          borderRadius: "8px",
          border: "1px solid #e1e8ed",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#37474f" }}>
          Your Submission
        </h4>
        {submission ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <i
              className="fas fa-check-circle"
              style={{ color: "#4CAF50", fontSize: "18px" }}
            ></i>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(
                    submission.link
                  )}&embedded=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "white",
                    background: "#1976d2",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontWeight: "500",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  <i className="fas fa-eye"></i> View File
                </a>
                <a
                  href={submission.downloadLink || submission.link}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "white",
                    background: "#4CAF50",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    fontWeight: "500",
                    textDecoration: "none",
                    fontSize: "14px",
                  }}
                >
                  <i className="fas fa-download"></i> Download
                </a>
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Submitted on {new Date(submission.submittedAt).toLocaleString()}
              </div>
            </div>
            {!isExpired && (
              <button
                onClick={handleDeleteSubmission}
                style={{
                  marginLeft: "auto",
                  padding: "6px 12px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Delete Submission
              </button>
            )}
          </div>
        ) : !isExpired ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              onChange={handleFileChange}
              style={{ fontSize: "14px" }}
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                padding: "6px 12px",
                background: uploading ? "#ccc" : "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: uploading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        ) : (
          <div style={{ color: "#d32f2f", fontSize: "14px" }}>
            Submission closed.
          </div>
        )}
      </div>

      {/* Warning Message for Expired */}
      {isExpired && (
        <div
          style={{
            background: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{ color: "#f44336", fontSize: "16px" }}
          ></i>
          <span
            style={{ color: "#d32f2f", fontWeight: "500", fontSize: "14px" }}
          >
            This assignment link is no longer available as the deadline has
            passed.
          </span>
        </div>
      )}

      {/* Marks Section */}
      <div
        style={{
          background: "#f5f5f5",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <i
          className="fas fa-award"
          style={{ color: "#4CAF50", fontSize: "16px" }}
        ></i>
        <div style={{ fontWeight: 600, color: "#4CAF50", fontSize: "15px" }}>
          {marksLoading
            ? "Loading marks..."
            : marks && marks.marks !== undefined
              ? `Marks: ${marks.marks}`
              : "Marks: Not assigned yet"}
        </div>
      </div>
    </div>
  );
};

export const Leaderboard = ({ students, showStats = false, currentUserId }) => {
  const filteredStudents = students.filter(
    (student) => student.name !== "Unknown"
  );
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;
    return (b.streak || 0) - (a.streak || 0);
  });

  return (
    <div className="leaderboard">
      <h3>Class Leaderboard</h3>
      <ul>
        {sortedStudents.map((student, index) => (
          <li
            key={student.id}
            className={
              student.id === currentUserId ? "current-user-leaderboard" : ""
            }
          >
            <span>
              {index + 1}. {student.name}{" "}
              {student.id === currentUserId ? "(You)" : ""}
            </span>
            <span>
              Streak: {student.streak || 0} | Progress:{" "}
              {Math.round(student.progress || 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
