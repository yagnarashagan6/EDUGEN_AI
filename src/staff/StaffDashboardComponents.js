// StaffDashboardComponents.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PropTypes from "prop-types";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fullpage">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export const ChatInterface = ({
  messages,
  sendMessage,
  deleteMessage,
  showContactList,
  setShowContactList,
  setSelectedStudentId,
  setSelectedStudentName,
  currentUserId,
  studentList,
  selectedStudentName,
  userNames,
  selectedStudentId,
  unreadMessageCounts,
  selectStudentAndMarkAsRead, // Add this prop
}) => {
  const messagesEndRef = useRef(null);

  // UPDATED: Use the new function that marks messages as read
  const selectStudent = useCallback(
    (student) => {
      if (selectStudentAndMarkAsRead) {
        selectStudentAndMarkAsRead(student);
      } else {
        // Fallback to original behavior
        setSelectedStudentId(student.id);
        setSelectedStudentName(student.name);
        setShowContactList(false);
      }
    },
    [
      selectStudentAndMarkAsRead,
      setSelectedStudentId,
      setSelectedStudentName,
      setShowContactList,
    ]
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

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, message, index) => {
      const date = new Date(message.timestamp).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push({ ...message, originalIndex: index });
      return acc;
    }, {});
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-interface">
      {showContactList ? (
        <div className="contact-list full-container">
          <div className="contact-list-body scrollable">
            {studentList.length === 0 ? (
              <p className="empty-message">No students available.</p>
            ) : (
              studentList.map((student) => (
                <div
                  key={`student-${student.id}`}
                  className={`contact-item ${
                    selectedStudentId === student.id ? "active" : ""
                  }`}
                  onClick={() => selectStudent(student)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) =>
                    e.key === "Enter" && selectStudent(student)
                  }
                >
                  <div className="contact-info">
                    <h4>{student.name || "Anonymous"}</h4>
                    <p>{student.role || "Student"}</p>
                  </div>
                  {/* Add unread message indicator */}
                  {unreadMessageCounts[student.id] &&
                    unreadMessageCounts[student.id] > 0 && (
                      <div className="unread-indicator">
                        <span className="unread-count">
                          {unreadMessageCounts[student.id]}
                        </span>
                      </div>
                    )}
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
              aria-label="Back to contact list"
            >
              Back to List
            </button>
            {selectedStudentName && (
              <div className="recipient-info" style={{ marginLeft: "auto" }}>
                <h3>{selectedStudentName}</h3>
                <p className="status">Online</p>
              </div>
            )}
          </div>
          <div className="messages-container scrollable" ref={messagesEndRef}>
            {selectedStudentId && Object.keys(groupedMessages).length === 0 ? (
              <p className="empty-message">
                No messages yet. Start the conversation!
              </p>
            ) : !selectedStudentId ? (
              <p className="empty-message">
                Select a student to view messages.
              </p>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={`date-${date}`}>
                  <div className="date-separator">{formatDate(date)}</div>
                  {dateMessages.map((msg) => (
                    <div
                      key={`msg-${msg.timestamp}-${msg.originalIndex}`}
                      className={`message-bubble ${
                        msg.sender === "staff" ? "sent" : "received"
                      }`}
                      onClick={() => {
                        if (
                          msg.sender === "staff" &&
                          window.confirm("Delete this message?")
                        ) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (
                          e.key === "Enter" &&
                          msg.sender === "staff" &&
                          window.confirm("Delete this message?")
                        ) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                    >
                      <div
                        className="message-sender"
                        style={{
                          fontSize: "0.8em",
                          color: "#777",
                          marginBottom: "2px",
                        }}
                      >
                        {msg.sender === "staff"
                          ? userNames[currentUserId] || "You"
                          : userNames[msg.senderId] ||
                            selectedStudentName ||
                            "Student"}
                      </div>
                      <div className="message-content">{msg.text}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.sender === "staff" && (
                          <span className="message-status">
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          {selectedStudentId && selectedStudentName && (
            <div className="message-input-area">
              <input
                type="text"
                id="staff-message-input"
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="message-input-field"
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                className="send-message-button"
                aria-label="Send message"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ChatInterface.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      sender: PropTypes.string,
      senderId: PropTypes.string,
      timestamp: PropTypes.string,
      read: PropTypes.bool,
      unreadMessageCounts: PropTypes.object,
    })
  ).isRequired,
  sendMessage: PropTypes.func.isRequired,
  deleteMessage: PropTypes.func.isRequired,
  showContactList: PropTypes.bool.isRequired,
  setShowContactList: PropTypes.func.isRequired,
  setSelectedStudentId: PropTypes.func.isRequired,
  setSelectedStudentName: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
  studentList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      photoURL: PropTypes.string,
      role: PropTypes.string,
    })
  ).isRequired,
  selectedStudentName: PropTypes.string,
  userNames: PropTypes.object.isRequired,
  selectedStudentId: PropTypes.string,
  selectStudentAndMarkAsRead: PropTypes.func,
};
