// StaffDashboardViews.js
import React from "react";
import Chatbot from "../components/Chatbot";
import TaskItem from "../components/TaskItem";
import StudentMonitor from "../components/StudentMonitor";
import Timetable from "../components/Timetable";
import { ChatInterface } from "./StaffDashboardComponents"; // Import from our new file
import { LANGUAGES } from "./StaffDashboardUtils"; // Import from our new file

// --- DEFAULT CONTENT VIEW (QUICK STATS) ---
export const DefaultContent = ({
  quickStats,
  toggleContainer,
  loading,
  tasks,
  latestActivity,
}) => {
  return (
    <div id="default-content" className="quick-stats">
      <h2>Quick Stats</h2>
      <div className="stats-container">
        <div
          className="stat-box"
          onClick={() => toggleContainer("quick-stats-container", "total")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) =>
            e.key === "Enter" &&
            toggleContainer("quick-stats-container", "total")
          }
        >
          <i className="fas fa-users"></i>
          <h3>Total Students</h3>
          <p>{quickStats.totalStudents}</p>
        </div>
        <div
          className="stat-box"
          onClick={() => toggleContainer("quick-stats-container", "active")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) =>
            e.key === "Enter" &&
            toggleContainer("quick-stats-container", "active")
          }
        >
          <i className="fas fa-user-check"></i>
          <h3>Active Students</h3>
          <p>{quickStats.activeStudents}</p>
        </div>
        <div
          className="stat-box"
          onClick={() => toggleContainer("tasks-container")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) =>
            e.key === "Enter" && toggleContainer("tasks-container")
          }
        >
          <i className="fas fa-tasks"></i>
          <h3>Tasks</h3>
          <p>{loading.tasks ? "Loading..." : `${tasks.length} Active`}</p>
        </div>
        <div
          className="stat-box"
          onClick={() =>
            toggleContainer("quick-stats-container", "performance")
          }
          role="button"
          tabIndex={0}
          onKeyPress={(e) =>
            e.key === "Enter" &&
            toggleContainer("quick-stats-container", "performance")
          }
        >
          <i className="fas fa-chart-line"></i>
          <h3>Overall Performance</h3>
          <p>{quickStats.overallPerformance}%</p>
        </div>
        <div
          className="stat-box"
          onClick={() => toggleContainer("monitor-container")}
          role="button"
          tabIndex={0}
          onKeyPress={(e) =>
            e.key === "Enter" && toggleContainer("monitor-container")
          }
        >
          <i className="fas fa-history"></i>
          <h3>Latest Activity</h3>
          <p
            style={{
              fontSize: "0.8em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {latestActivity || "Loading..."}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- MOBILE CHATBOT CONTAINER ---
export const MobileChatbotContainer = ({
  activeContainer,
  setActiveContainer,
}) => {
  return (
    <div
      id="chatbot-container"
      className={`toggle-container ${
        activeContainer === "chatbot-container" ? "active" : ""
      }`}
    >
      <div
        className="container-body"
        style={{
          height: "calc(100vh - 200px)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
        }}
      >
        <Chatbot
          role="staff"
          isMinimized={false}
          isVisible={true}
          toggleChatbot={() => setActiveContainer(null)}
        />
      </div>
    </div>
  );
};

// --- TASKS CONTAINER ---
export const TasksContainer = ({
  activeContainer,
  postTask,
  loading,
  tasks,
  deleteTask,
}) => {
  return (
    <div
      id="tasks-container"
      className={`toggle-container ${
        activeContainer === "tasks-container" ? "active" : ""
      }`}
    >
      <div className="container-header">Tasks Management</div>
      <div className="container-body">
        <div className="task-form">
          <h3>Post a New Task/Topic</h3>
          <input
            type="text"
            id="task-content"
            placeholder="Enter task description or topic..."
            className="goal-input"
            aria-label="Task content"
          />
          <button
            onClick={postTask}
            className="add-goal-btn"
            aria-label="Post task"
          >
            Post Task
          </button>
        </div>
        {loading.tasks ? (
          <p>Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="empty-message">No tasks posted yet. Add one above!</p>
        ) : (
          <div
            className="tasks-list scrollable"
            style={{ maxHeight: "300px", marginBottom: "20px" }}
          >
            {tasks.map((task) => (
              <TaskItem
                key={`task-item-${task.id}`}
                task={task}
                role="staff"
                onDelete={deleteTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- ASSIGNMENTS CONTAINER ---
export const AssignmentsContainer = ({
  activeContainer,
  newAssignmentSubject,
  setNewAssignmentSubject,
  newAssignmentLink,
  setNewAssignmentLink,
  newAssignmentDeadline,
  setNewAssignmentDeadline,
  newAssignmentDeadlineTime,
  setNewAssignmentDeadlineTime,
  postAssignment,
  selectedStudentForMarking,
  setSelectedStudentForMarking,
  studentStats,
  selectedAssignmentForMarking,
  setSelectedAssignmentForMarking,
  assignments,
  assignmentMarks,
  setAssignmentMarks,
  handleSendMarks,
  loading,
  deleteAssignment,
  currentUserId,
}) => {
  return (
    <div
      id="assignments-container"
      className={`toggle-container ${
        activeContainer === "assignments-container" ? "active" : ""
      }`}
    >
      <div className="container-header">Assignments</div>
      <div className="container-body">
        <div className="assignment-form post-new-assignment">
          <h3>Post a New Assignment</h3>
          <input
            type="text"
            value={newAssignmentSubject}
            onChange={(e) => setNewAssignmentSubject(e.target.value)}
            placeholder="Assignment Subject Name"
            className="goal-input"
            aria-label="New assignment subject"
          />
          <input
            type="url"
            value={newAssignmentLink}
            onChange={(e) => setNewAssignmentLink(e.target.value)}
            placeholder="Google Drive Link (https://...)"
            className="goal-input"
            aria-label="New assignment Google Drive link"
          />
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="date"
              value={newAssignmentDeadline}
              onChange={(e) => setNewAssignmentDeadline(e.target.value)}
              className="goal-input"
              style={{ flex: 1 }}
              title="Set deadline date for the assignment"
              aria-label="New assignment deadline date"
            />
            <input
              type="time"
              value={newAssignmentDeadlineTime}
              onChange={(e) => setNewAssignmentDeadlineTime(e.target.value)}
              className="goal-input"
              style={{ flex: 1 }}
              title="Set deadline time for the assignment"
              aria-label="New assignment deadline time"
            />
          </div>
          <button
            onClick={postAssignment}
            className="add-goal-btn"
            aria-label="Post new assignment button"
          >
            Post Assignment
          </button>
        </div>
        <div
          className="assignment-form marking-ui"
          style={{ marginTop: "30px" }}
        >
          <h3>Mark Student Assignment</h3>
          <select
            value={selectedStudentForMarking}
            onChange={(e) => setSelectedStudentForMarking(e.target.value)}
            className="goal-input"
            aria-label="Select student for marking"
          >
            <option value="">-- Select Student --</option>
            {studentStats
              .filter(
                (student) =>
                  student.name &&
                  student.name !== "Anonymous" &&
                  student.name !== "Unknown" &&
                  student.name !== "Unknown User"
              )
              .map((student) => (
                <option
                  key={`mark-student-option-${student.id}`}
                  value={student.id}
                >
                  {student.name} ({student.id.substring(0, 5)})
                </option>
              ))}
          </select>
          <select
            value={selectedAssignmentForMarking}
            onChange={(e) => setSelectedAssignmentForMarking(e.target.value)}
            className="goal-input"
            aria-label="Select assignment for marking"
          >
            <option value="">-- Select Assignment --</option>
            {assignments.map((assignment) => (
              <option
                key={`mark-assignment-option-${assignment.id}`}
                value={assignment.id}
              >
                {assignment.subject}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={assignmentMarks}
            onChange={(e) => setAssignmentMarks(e.target.value)}
            placeholder="Enter Marks (e.g., A+, 85/100)"
            className="goal-input"
            aria-label="Assignment marks input"
          />
          <button
            onClick={handleSendMarks}
            className="add-goal-btn"
            aria-label="Send marks button"
          >
            Send Marks
          </button>
        </div>
        <h4 style={{ marginTop: "30px" }}>Your Posted Assignments:</h4>
        {loading.assignments ? (
          <p>Loading your assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="empty-message">
            You have not posted any assignments yet.
          </p>
        ) : (
          <div
            className="assignment-list scrollable"
            style={{ maxHeight: "400px" }}
          >
            {assignments.map((assignment) => {
              const isExpired =
                assignment.deadline &&
                new Date(assignment.deadline) < new Date();

              return (
                <div
                  key={`posted-assignment-${assignment.id}`}
                  className={`assignment-card ${isExpired ? "expired" : ""}`}
                  style={{
                    background: isExpired ? "#f8f9fa" : "#ffffff",
                    border: `1px solid ${isExpired ? "#dee2e6" : "#e3f2fd"}`,
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "16px",
                    boxShadow: isExpired
                      ? "0 2px 4px rgba(0,0,0,0.05)"
                      : "0 2px 8px rgba(25, 118, 210, 0.1)",
                    transition: "all 0.3s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {isExpired && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#ff5252",
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      Expired
                    </div>
                  )}

                  <div style={{ marginBottom: "12px" }}>
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: isExpired ? "#6c757d" : "#1976d2",
                        paddingRight: isExpired ? "80px" : "0",
                      }}
                    >
                      {assignment.subject}
                    </h3>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection:
                          window.innerWidth <= 768 ? "column" : "row",
                        gap: window.innerWidth <= 768 ? "8px" : "16px",
                        fontSize: "14px",
                        color: "#666",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <i
                          className="fas fa-calendar-plus"
                          style={{ color: "#28a745", fontSize: "12px" }}
                        ></i>
                        <span>
                          <strong>Posted:</strong>{" "}
                          {assignment.postedAt?.toLocaleDateString
                            ? assignment.postedAt.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>

                      {assignment.deadline && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <i
                            className="fas fa-clock"
                            style={{
                              color: isExpired ? "#ff5252" : "#ff9800",
                              fontSize: "12px",
                            }}
                          ></i>
                          <span
                            style={{ color: isExpired ? "#ff5252" : "#666" }}
                          >
                            <strong>Deadline:</strong>{" "}
                            {assignment.deadline?.toLocaleDateString
                              ? `${assignment.deadline.toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )} at ${assignment.deadline.toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}`
                              : "N/A"}
                            {isExpired && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontWeight: "bold",
                                }}
                              >
                                (Expired)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        window.innerWidth <= 768 ? "column" : "row",
                      gap: "8px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {!isExpired ? (
                      <button
                        className="assignment-action-btn view-btn"
                        onClick={() =>
                          window.open(
                            assignment.driveLink,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        aria-label={`Open assignment ${assignment.subject}`}
                        style={{
                          background: "#1976d2",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "background-color 0.2s ease",
                          minWidth: window.innerWidth <= 768 ? "100%" : "auto",
                          justifyContent: "center",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.backgroundColor = "#1565c0")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.backgroundColor = "#1976d2")
                        }
                      >
                        <i className="fas fa-external-link-alt"></i>
                        Open Assignment
                      </button>
                    ) : (
                      <div
                        style={{
                          background: "#e0e0e0",
                          color: "#757575",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          minWidth: window.innerWidth <= 768 ? "100%" : "auto",
                          justifyContent: "center",
                        }}
                        title="Assignment link unavailable - deadline expired"
                      >
                        <i className="fas fa-lock"></i>
                        Link Expired
                      </div>
                    )}

                    {assignment.staffId === currentUserId && (
                      <button
                        className="assignment-action-btn delete-btn"
                        onClick={() => deleteAssignment(assignment.id)}
                        aria-label={`Delete assignment ${assignment.subject}`}
                        style={{
                          background: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "background-color 0.2s ease",
                          minWidth: window.innerWidth <= 768 ? "100%" : "auto",
                          justifyContent: "center",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.backgroundColor = "#d32f2f")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.backgroundColor = "#f44336")
                        }
                      >
                        <i className="fas fa-trash"></i>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- RESULTS CONTAINER ---
export const ResultsContainer = ({ activeContainer, results }) => {
  return (
    <div
      id="results-container"
      className={`toggle-container ${
        activeContainer === "results-container" ? "active" : ""
      }`}
    >
      <div className="container-header">Student Results Overview</div>
      <div className="container-body scrollable">
        {results.length === 0 ? (
          <p className="empty-message">
            No student results to display yet. Ensure tasks and student data are
            loaded.
          </p>
        ) : (
          <ul className="leaderboard">
            {results
              .filter(
                (r) =>
                  r.name &&
                  r.name !== "Anonymous" &&
                  r.name !== "Unknown" &&
                  r.name !== "Unknown User"
              )
              .map((result) => {
                const percent =
                  result.totalTasks > 0
                    ? Math.round(
                        (result.completedTasks / result.totalTasks) * 100
                      )
                    : 0;
                let percentColor = "#e53935"; // red for 0
                if (percent === 100) percentColor = "#43a047"; // green
                else if (percent >= 50) percentColor = "#fb8c00"; // orange

                return (
                  <li
                    key={`result-item-${result.id}`}
                    className="result-item"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "4px",
                      padding: "10px 0",
                      borderBottom: "1px solid #eee",
                      wordBreak: "break-word",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#222" }}>
                      {result.name}
                    </span>
                    <span style={{ fontSize: 15, color: "#555" }}>
                      {result.completedTasks} / {result.totalTasks} tasks
                      completed
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: percentColor,
                        background: "#f4f7fc",
                        borderRadius: 8,
                        padding: "0px",
                        marginTop: 2,
                        display: "inline-block",
                      }}
                    >
                      Progress: {percent}%
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- MONITOR CONTAINER ---
export const MonitorContainer = ({
  activeContainer,
  setActiveContainer,
  latestActivity,
}) => {
  return (
    <div
      id="monitor-container"
      className={`toggle-container ${
        activeContainer === "monitor-container" ? "active" : ""
      }`}
    >
      <div className="container-header">
        <h2 style={{ alignItems: "center", color: "black" }}>
          Student Activity Monitor
        </h2>
        <button
          onClick={() => setActiveContainer(null)}
          className="back-btn small"
          style={{ float: "right" }}
          aria-label="Back to dashboard from monitor"
        >
          Back to Dashboard
        </button>
      </div>
      <div className="container-body scrollable" style={{ padding: 10 }}>
        <div className="latest-activity-details">
          <span style={{ alignItems: "center" }}>Latest Activity:</span>
          <div style={{ marginTop: "6px", color: "#333" }}>
            {latestActivity || "No recent activity."}
          </div>
        </div>
        <StudentMonitor />
      </div>
    </div>
  );
};

// --- STAFF INTERACTION CONTAINER ---
export const StaffInteractionContainer = ({
  activeContainer,
  messages,
  sendMessage,
  deleteMessage,
  showContactList,
  setShowContactList,
  setSelectedStudentId,
  setSelectedStudentName,
  currentUserId,
  studentStats,
  selectedStudentName,
  selectedStudentId,
  userNames,
  unreadMessageCounts,
  selectStudentAndMarkAsRead,
}) => {
  return (
    <div
      id="staff-interaction-container"
      className={`toggle-container ${
        activeContainer === "staff-interaction-container" ? "active" : ""
      }`}
    >
      <div className="contact-list-header">Student Chat</div>
      <div
        className="contact-list-body"
        style={{
          height: "calc(100vh - 200px)",
          display: "flex",
          flexDirection: "column",
          padding: "0",
        }}
      >
        <ChatInterface
          messages={messages}
          sendMessage={sendMessage}
          deleteMessage={deleteMessage}
          showContactList={showContactList}
          setShowContactList={setShowContactList}
          setSelectedStudentId={setSelectedStudentId}
          setSelectedStudentName={setSelectedStudentName}
          currentUserId={currentUserId}
          studentList={studentStats.filter(
            (student) =>
              student.name &&
              student.name !== "Anonymous" &&
              student.name !== "Unknown" &&
              student.name !== "Unknown User"
          )}
          selectedStudentName={selectedStudentName}
          selectedStudentId={selectedStudentId}
          userNames={userNames}
          unreadMessageCounts={unreadMessageCounts}
          selectStudentAndMarkAsRead={selectStudentAndMarkAsRead}
        />
      </div>
    </div>
  );
};

// --- QUICK STATS (STUDENT LIST) CONTAINER ---
export const QuickStatsContainer = ({
  activeContainer,
  filterType,
  setActiveContainer,
  performanceTab,
  setPerformanceTab,
  results,
  loading,
  filteredStudents,
  tasks,
  taskStatusByStudent,
}) => {
  return (
    <div
      id="quick-stats-container"
      className={`toggle-container ${
        activeContainer === "quick-stats-container" ? "active" : ""
      }`}
    >
      <div className="container-header">
        {filterType === "performance" ? (
          <div style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h3>Task Performance Overview</h3>
              <button
                onClick={() => setActiveContainer(null)}
                className="back-btn small"
                aria-label="Back to dashboard"
              >
                Back to Dashboard
              </button>
            </div>
            <div
              className="tab-bar"
              style={{ display: "flex", borderBottom: "1px solid #ddd" }}
            >
              <button
                className={`tab-button ${
                  performanceTab === "completed" ? "active" : ""
                }`}
                onClick={() => setPerformanceTab("completed")}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  background:
                    performanceTab === "completed" ? "#1976d2" : "transparent",
                  color: performanceTab === "completed" ? "white" : "#666",
                  cursor: "pointer",
                  fontWeight:
                    performanceTab === "completed" ? "bold" : "normal",
                }}
              >
                Overall Performance (
                {results.filter((r) => r.completedTasks > 0).length})
              </button>
              <button
                className={`tab-button ${
                  performanceTab === "incomplete" ? "active" : ""
                }`}
                onClick={() => setPerformanceTab("incomplete")}
                style={{
                  flex: 1,
                  padding: "10px",
                  border: "none",
                  background:
                    performanceTab === "incomplete" ? "#1976d2" : "transparent",
                  color: performanceTab === "incomplete" ? "white" : "#666",
                  cursor: "pointer",
                  fontWeight:
                    performanceTab === "incomplete" ? "bold" : "normal",
                }}
              >
                Incomplete Students (
                {results.filter((r) => r.completedTasks === 0).length})
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3>Student List ({filterType || "All Students"})</h3>
            <button
              onClick={() => setActiveContainer(null)}
              className="back-btn small"
              style={{ float: "right" }}
              aria-label="Back to dashboard from student list"
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
      <div className="container-body scrollable">
        {filterType === "performance" ? (
          performanceTab === "completed" ? (
            results.filter((r) => r.completedTasks > 0).length === 0 ? (
              <p className="empty-message">
                No students have completed any tasks yet.
              </p>
            ) : (
              <div className="performance-cards-container">
                {results
                  .filter((r) => r.completedTasks > 0)
                  .map((result) => {
                    const percent =
                      result.totalTasks > 0
                        ? Math.round(
                            (result.completedTasks / result.totalTasks) * 100
                          )
                        : 0;
                    let percentColor = "#e53935";
                    if (percent === 100) percentColor = "#43a047";
                    else if (percent >= 50) percentColor = "#fb8c00";

                    return (
                      <div
                        key={`result-item-${result.id}`}
                        className="performance-card overall-performance-card"
                      >
                        <div className="performance-card-header">
                          <h4 className="student-name">{result.name}</h4>
                        </div>
                        <div className="performance-card-body">
                          <div className="performance-metric">
                            <span className="metric-label">
                              📊 Tasks Completed
                            </span>
                            <span className="metric-value">
                              {result.completedTasks} / {result.totalTasks}
                            </span>
                          </div>
                          <div className="performance-metric">
                            <span className="metric-label">📈 Progress</span>
                            <div className="progress-bar-container">
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${percent}%`,
                                  backgroundColor: percentColor,
                                }}
                              ></div>
                            </div>
                            <span
                              className="metric-value"
                              style={{ color: percentColor }}
                            >
                              {percent}%
                            </span>
                          </div>
                          <div className="performance-metric">
                            <span className="metric-label">🔥 Streak</span>
                            <span className="metric-value streak-badge">
                              {result.streak} days
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          ) : results.filter((r) => r.completedTasks === 0).length === 0 ? (
            <p className="empty-message">
              All students have completed at least one task!
            </p>
          ) : (
            <div className="incomplete-cards-container">
              {results
                .filter((r) => r.completedTasks === 0)
                .map((result) => {
                  return (
                    <div
                      key={`result-item-${result.id}`}
                      className="incomplete-card"
                    >
                      <div className="incomplete-card-header">
                        <h4 className="incomplete-student-name">
                          {result.name}
                        </h4>
                        <span className="incomplete-badge">Not Started</span>
                      </div>
                      <div className="incomplete-card-body">
                        <div className="incomplete-metric">
                          <span className="incomplete-label">
                            Total Tasks Available
                          </span>
                          <span className="incomplete-value">
                            {result.totalTasks}
                          </span>
                        </div>
                        <div className="incomplete-metric">
                          <span className="incomplete-label">
                            Current Streak
                          </span>
                          <span
                            className="incomplete-value"
                            style={{
                              color: result.streak > 0 ? "#ff9800" : "#999",
                              fontWeight: result.streak > 0 ? "700" : "400",
                            }}
                          >
                            {result.streak} days
                          </span>
                        </div>
                        <div className="incomplete-metric">
                          <span className="incomplete-label">
                            Overall Progress
                          </span>
                          <span
                            className="incomplete-value"
                            style={{ color: "#e53935" }}
                          >
                            0%
                          </span>
                        </div>
                      </div>
                      <div className="incomplete-card-footer">
                        <p className="incomplete-note">
                          ⚠️ This student hasn't started any tasks yet. Consider
                          reaching out for encouragement.
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        ) : loading.students ? (
          <p>Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="empty-message">No students match the current filter.</p>
        ) : filterType === "active" ? (
          filteredStudents.filter((student) => {
            if (
              !student.name ||
              student.name === "Anonymous" ||
              student.name === "Unknown" ||
              student.name === "Unknown User"
            ) {
              return false;
            }
            let completedCount = 0;
            for (const task of tasks) {
              const status = taskStatusByStudent[student.id]?.[task.id];
              const isCompleted =
                (status && status.completed === true) ||
                (Array.isArray(task.completedBy) &&
                  task.completedBy.includes(student.id));
              if (isCompleted) completedCount++;
            }
            const actualProgress =
              tasks.length > 0
                ? Math.round((completedCount / tasks.length) * 100)
                : 0;
            return (student.streak || 0) > 0 || actualProgress > 50;
          }).length === 0 ? (
            <p className="empty-message">
              No students with high streaks and progress found.
            </p>
          ) : (
            <div className="high-streak-cards-container">
              {filteredStudents
                .filter((student) => {
                  if (
                    !student.name ||
                    student.name === "Anonymous" ||
                    student.name === "Unknown" ||
                    student.name === "Unknown User"
                  ) {
                    return false;
                  }
                  let completedCount = 0;
                  for (const task of tasks) {
                    const status = taskStatusByStudent[student.id]?.[task.id];
                    const isCompleted =
                      (status && status.completed === true) ||
                      (Array.isArray(task.completedBy) &&
                        task.completedBy.includes(student.id));
                    if (isCompleted) completedCount++;
                  }
                  const actualProgress =
                    tasks.length > 0
                      ? Math.round((completedCount / tasks.length) * 100)
                      : 0;
                  return (student.streak || 0) > 0 || actualProgress > 50;
                })
                .sort((a, b) => (b.streak || 0) - (a.streak || 0))
                .map((student) => {
                  let completedCount = 0;
                  for (const task of tasks) {
                    const status = taskStatusByStudent[student.id]?.[task.id];
                    const isCompleted =
                      (status && status.completed === true) ||
                      (Array.isArray(task.completedBy) &&
                        task.completedBy.includes(student.id));
                    if (isCompleted) completedCount++;
                  }
                  const actualProgress =
                    tasks.length > 0
                      ? Math.round((completedCount / tasks.length) * 100)
                      : 0;
                  return (
                    <div
                      key={`high-streak-${student.id}`}
                      className="high-streak-card"
                    >
                      <div className="streak-card-header">
                        <h4 className="streak-student-name">{student.name}</h4>
                        {(student.streak || 0) > 7 && (
                          <span className="elite-badge">⭐ Elite</span>
                        )}
                      </div>
                      <div className="streak-card-body">
                        <div className="streak-metric">
                          <span className="streak-label">
                            🔥 Current Streak
                          </span>
                          <span className="streak-number">
                            {student.streak || 0}
                          </span>
                          <span className="streak-unit">days</span>
                        </div>
                        <div className="progress-metric">
                          <span className="progress-label">📈 Progress</span>
                          <div className="progress-visual">
                            <div
                              className="progress-circle"
                              style={{
                                background: `conic-gradient(#4CAF50 0deg ${
                                  (actualProgress / 100) * 360
                                }deg, #e0e0e0 ${
                                  (actualProgress / 100) * 360
                                }deg)`,
                              }}
                            >
                              <span className="progress-text">
                                {actualProgress}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        ) : (
          <div className="leaderboard">
            <ul style={{ paddingLeft: "20px" }}>
              {filteredStudents
                .filter(
                  (student) =>
                    student.name &&
                    student.name !== "Anonymous" &&
                    student.name !== "Unknown" &&
                    student.name !== "Unknown User"
                )
                .map((student) => (
                  <li
                    key={`total-student-${student.id}`}
                    style={{
                      padding: "10px 8px",
                      borderBottom: "1px solid #eee",
                      fontSize: "16px",
                    }}
                  >
                    {student.name}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// --- YOUTUBE CONTROLLER CONTAINER ---
export const YoutubeControllerContainer = ({
  activeContainer,
  showConfigureSection,
  setShowConfigureSection,
  showAddChannelSection,
  setShowAddChannelSection,
  youtubeSettings,
  setYoutubeSettings,
  deleteChannel,
  newChannelId,
  setNewChannelId,
  newChannelName,
  setNewChannelName,
  newChannelLanguage,
  setNewChannelLanguage,
  newChannelCategory,
  setNewChannelCategory,
  addNewChannel,
  saveYoutubeSettings,
  youtubeSettingsLoading,
}) => {
  return (
    <div
      id="youtube-controller-container"
      className={`toggle-container ${
        activeContainer === "youtube-controller-container" ? "active" : ""
      }`}
    >
      <div className="container-header">🎥 YouTube Settings</div>
      <div className="container-body scrollable yt-settings-container">
        <div className="yt-settings-toggle">
          <button
            onClick={() => {
              setShowConfigureSection(true);
              setShowAddChannelSection(false);
            }}
            className={`yt-settings-toggle-btn ${
              showConfigureSection ? "active" : ""
            }`}
          >
            <i className="fas fa-sliders-h"></i>
            Configure
          </button>
          <button
            onClick={() => {
              setShowConfigureSection(false);
              setShowAddChannelSection(true);
            }}
            className={`yt-settings-toggle-btn ${
              showAddChannelSection ? "active" : ""
            }`}
          >
            <i className="fas fa-plus-circle"></i>
            Add Channel
          </button>
        </div>

        {showConfigureSection && (
          <div className="yt-section-content">
            <div className="yt-form-group">
              <label htmlFor="default-language">Default Language</label>
              <select
                id="default-language"
                value={youtubeSettings.defaultLanguage}
                onChange={(e) =>
                  setYoutubeSettings((prev) => ({
                    ...prev,
                    defaultLanguage: e.target.value,
                  }))
                }
                className="yt-select"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="yt-form-group">
              <label htmlFor="default-category">Default Category Filter</label>
              <select
                id="default-category"
                value={youtubeSettings.defaultCategory}
                onChange={(e) =>
                  setYoutubeSettings((prev) => ({
                    ...prev,
                    defaultCategory: e.target.value,
                  }))
                }
                className="yt-select"
              >
                <option value="all">All Categories</option>
                {Array.from(
                  new Set(youtubeSettings.channels.map((c) => c.category))
                ).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="yt-form-group">
              <label>Enable Channels by Default</label>
              <div className="yt-channels-list">
                {youtubeSettings.channels
                  .filter(
                    (channel) =>
                      youtubeSettings.defaultCategory === "all" ||
                      channel.category === youtubeSettings.defaultCategory
                  )
                  .map((channel) => (
                    <div key={channel.id} className="yt-channel-item">
                      <label className="yt-channel-label">
                        <input
                          type="checkbox"
                          checked={youtubeSettings.defaultChannelIds.includes(
                            channel.id
                          )}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setYoutubeSettings((prev) => ({
                              ...prev,
                              defaultChannelIds: isChecked
                                ? [...prev.defaultChannelIds, channel.id]
                                : prev.defaultChannelIds.filter(
                                    (id) => id !== channel.id
                                  ),
                            }));
                          }}
                          className="yt-channel-checkbox"
                        />
                        <span className="yt-channel-name">{channel.name}</span>
                        <span className="yt-channel-category">
                          {channel.category}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => deleteChannel(channel.id)}
                        className="yt-channel-delete-btn"
                        title={`Delete ${channel.name}`}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {showAddChannelSection && (
          <div className="yt-section-content">
            <div className="yt-form-group">
              <label htmlFor="new-channel-id">
                Channel ID or Handle (@...)
              </label>
              <input
                id="new-channel-id"
                type="text"
                placeholder="e.g., UCrx-FlNM6BWOJvu3re6HH7w"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className="yt-input"
              />
            </div>
            <div className="yt-form-group">
              <label htmlFor="new-channel-name">Channel Name</label>
              <input
                id="new-channel-name"
                type="text"
                placeholder="e.g., 4G Silver Academy"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="yt-input"
              />
            </div>
            <div className="yt-form-group">
              <label htmlFor="new-channel-lang">Language</label>
              <select
                id="new-channel-lang"
                value={newChannelLanguage}
                onChange={(e) => setNewChannelLanguage(e.target.value)}
                className="yt-select"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="yt-form-group">
              <label htmlFor="new-channel-cat">Category</label>
              <input
                id="new-channel-cat"
                type="text"
                placeholder="e.g., Engineering"
                value={newChannelCategory}
                onChange={(e) => setNewChannelCategory(e.target.value)}
                className="yt-input"
              />
            </div>
            <button onClick={addNewChannel} className="yt-button primary">
              <i className="fas fa-plus"></i> Add Channel
            </button>
          </div>
        )}

        <div className="yt-save-section">
          <button
            onClick={() => saveYoutubeSettings(youtubeSettings)}
            disabled={youtubeSettingsLoading}
            className="yt-button secondary"
          >
            {youtubeSettingsLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save All Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SETTINGS CONTAINER ---
export const SettingsContainer = ({
  activeContainer,
  handleEditProfile,
  handleLogout,
  addNotification,
  setActiveContainer,
}) => {
  return (
    <div
      id="settings-container"
      className={`toggle-container ${
        activeContainer === "settings-container" ? "active" : ""
      }`}
    >
      <div className="container-header">⚙️ Settings</div>
      <div className="container-body">
        <h3>Profile Options</h3>
        <button
          onClick={handleEditProfile}
          className="add-goal-btn"
          aria-label="Edit profile"
        >
          Edit Profile
        </button>
        <button
          onClick={handleLogout}
          className="add-goal-btn logout-btn"
          aria-label="Logout"
        >
          Logout
        </button>

        <h3 style={{ marginTop: "30px" }}>Student Management</h3>
        <button
          onClick={async () => {
            if (
              window.confirm(
                "Are you sure you want to reset all student streaks to 0? This action cannot be undone."
              )
            ) {
              try {
                const { resetAllStreaksToZero } = await import(
                  "./StaffDashboardUtils"
                ); // Lazy import
                const result = await resetAllStreaksToZero();
                addNotification(result.message, "success");
              } catch (error) {
                addNotification(
                  "Error resetting streaks: " + error.message,
                  "error"
                );
              }
            }
          }}
          className="add-goal-btn"
          aria-label="Reset all student streaks"
          style={{ backgroundColor: "#ff6b6b", color: "white" }}
        >
          🔄 Reset All Streaks to 0
        </button>

        <button
          onClick={async () => {
            if (
              window.confirm(
                "Are you sure you want to delete all students with 'Unknown' name? This action cannot be undone."
              )
            ) {
              try {
                const { deleteUnknownStudents } = await import(
                  "./StaffDashboardUtils"
                ); // Lazy import
                const result = await deleteUnknownStudents();
                addNotification(result.message, "success");
              } catch (error) {
                addNotification(
                  "Error deleting unknown students: " + error.message,
                  "error"
                );
              }
            }
          }}
          className="add-goal-btn"
          aria-label="Delete unknown students"
          style={{
            backgroundColor: "#dc3545",
            color: "white",
            marginTop: "12px",
          }}
        >
          🗑️ Delete Unknown Students
        </button>

        <h3 style={{ marginTop: "30px" }}>App Information</h3>
        <button
          onClick={() => setActiveContainer("about-container")}
          className="add-goal-btn"
          aria-label="About the app"
          style={{ backgroundColor: "#17a2b8", color: "white" }}
        >
          About the App
        </button>
      </div>
    </div>
  );
};

// --- ABOUT CONTAINER ---
export const AboutContainer = ({ activeContainer, setActiveContainer }) => {
  return (
    <div
      id="about-container"
      className={`toggle-container ${
        activeContainer === "about-container" ? "active" : ""
      }`}
    >
      <div className="container-header">📱 About the App</div>
      <div className="container-body">
        <div className="about-content">
          <h3> EDUGEN AI </h3>
          <p>
            EduGen AI is an innovative educational platform developed by{" "}
            <strong>Yagnarashagan</strong> that bridges the gap between students
            and educators using smart automation. This app is designed to
            enhance academic performance, engagement, and communication in an
            intuitive and interactive way.
          </p>
          <h4>✨ It features:</h4>
          <ul className="features-list">
            <li>
              🤖 <strong>Smart Chatbot Assistance</strong> for real-time
              academic help
            </li>
            <li>
              🧠 <strong>AI-Generated Quizzes</strong> to test knowledge based
              on selected topics
            </li>
            <li>
              🎯 <strong>Goal Setting and Self Analysis</strong> to boost
              productivity
            </li>
            <li>
              📊 <strong>Interactive Dashboard</strong> for both students and
              staff to manage tasks, assignments, and performance
            </li>
          </ul>
          <p>
            EduGen AI empowers students to learn effectively and helps staff
            monitor, guide, and support learners efficiently. With built-in chat
            functionality, assignment distribution, and performance tracking,
            EduGen AI is your all-in-one AI-powered education assistant.
          </p>
          <div className="contact-section">
            <h4>📧 Need Help?</h4>
            <p>For any queries about the app, please contact us at:</p>
            <a
              href="mailto:edugenai7@gmail.com"
              className="contact-email"
              target="_blank"
              rel="noopener noreferrer"
            >
              edugenai7@gmail.com
            </a>
          </div>
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <button
              onClick={() => setActiveContainer("settings-container")}
              className="back-btn"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TIMETABLE CONTAINER ---
export const TimetableCreatorContainer = ({ activeContainer }) => {
  return (
    <div
      id="timetable-creator-container"
      className={`toggle-container ${
        activeContainer === "timetable-creator-container" ? "active" : ""
      }`}
    >
      <div className="container-body scrollable">
        <Timetable isContainer={true} />
      </div>
    </div>
  );
};
