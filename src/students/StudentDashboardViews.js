// StudentDashboardViews.js
import React, { useRef } from "react";
import GoalItem from "../components/GoalItem";
import Quiz from "../components/Quiz";
import Chatbot from "../components/Chatbot";
import Notes from "../components/Notes";
import TaskItem from "../components/TaskItem";
import EduTube from "../components/Youtube";
import {
  ChatInterface,
  AssignmentSummaryCard,
  AssignmentItem,
  Leaderboard,
} from "./StudentDashboardComponents"; // Import from our new file
import StudentQuizContainer from "../components/StudentQuizContainer";

export { StudentQuizContainer };

// Helper to resolve a task's status from taskProgress using multiple key strategies
const resolveTaskStatus = (task, taskProgress) => {
  if (!task) return null;
  const normalized = (task.content || "").toLowerCase().replace(/\s+/g, "_");
  // Direct id match
  if (task.id && taskProgress && taskProgress[task.id])
    return taskProgress[task.id];
  // Normalized content match
  if (taskProgress && taskProgress[normalized]) return taskProgress[normalized];

  // Try matching by topic field inside the stored taskStatus documents
  try {
    const contentLower = (task.content || "").trim().toLowerCase();
    const keys = Object.keys(taskProgress || {});
    for (const k of keys) {
      const v = taskProgress[k];
      if (!v) continue;
      // If the stored document has a `topic` or `content` field, compare
      const topic = (v.topic || v.content || "")
        .toString()
        .trim()
        .toLowerCase();
      if (topic && topic === contentLower) return v;
      // Loose contains match (helpful when punctuation differs)
      if (
        topic &&
        (topic.includes(contentLower) || contentLower.includes(topic))
      )
        return v;
      // Sometimes storage used ids that are normalized content; check for partial key match
      if (k && k.toString().toLowerCase().includes(contentLower)) return v;
    }
  } catch (e) {
    // ignore errors in matching heuristics
  }

  return null;
};

// --- DEFAULT CONTENT VIEW ---
export const DefaultContent = ({
  userData,
  progress,
  streak,
  assignmentsLoading,
  assignmentsError,
  topAssignments,
  tasksBySubject,
  taskProgress,
  leaderboard,
  toggleContainer,
  setSelectedAssignmentSubject,
  setSelectedSubject,
  currentUserId,
}) => {
  // Track which subjects we've already logged to avoid spamming the console
  const loggedSubjectsRef = useRef(new Set());
  // Helper to resolve a task's status from taskProgress using multiple key strategies
  const resolveTaskStatus = (task, taskProgress) => {
    if (!task) return null;
    const normalized = (task.content || "").toLowerCase().replace(/\s+/g, "_");
    // Direct id match
    if (task.id && taskProgress[task.id]) return taskProgress[task.id];
    // Normalized content match
    if (taskProgress[normalized]) return taskProgress[normalized];

    // Try matching by topic field inside the stored taskStatus documents
    try {
      const contentLower = (task.content || "").trim().toLowerCase();
      const keys = Object.keys(taskProgress || {});
      for (const k of keys) {
        const v = taskProgress[k];
        if (!v) continue;
        // If the stored document has a `topic` or `content` field, compare
        const topic = (v.topic || v.content || "")
          .toString()
          .trim()
          .toLowerCase();
        if (topic && topic === contentLower) return v;
        // Loose contains match (helpful when punctuation differs)
        if (
          topic &&
          (topic.includes(contentLower) || contentLower.includes(topic))
        )
          return v;
        // Sometimes storage used ids that are normalized content; check for partial key match
        if (k && k.toString().toLowerCase().includes(contentLower)) return v;
      }
    } catch (e) {
      // ignore errors in matching heuristics
    }

    return null;
  };
  return (
    <div id="default-content" className="default-content">
      <div
        className="profile-content"
        onClick={() => toggleContainer("self-analysis-container")}
      >
        <h3>Your Profile</h3>
        <p>
          Hi {userData?.name || "Student"}, you have completed{" "}
          <b>{Math.round(progress)}%</b> of weekly targets. Your current streak:{" "}
          <b>{streak}</b> days! 🔥
        </p>
      </div>
      <h3>Your Assignments</h3>
      <div className="assignments-preview scrollable-x">
        {assignmentsLoading && <p>Loading assignments...</p>}
        {assignmentsError && (
          <p className="error-message">{assignmentsError}</p>
        )}
        {!assignmentsLoading && !assignmentsError && topAssignments.length > 0
          ? topAssignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedAssignmentSubject(
                    assignment.subject || "Uncategorized"
                  );
                  toggleContainer("assignments-container");
                }}
              >
                <AssignmentSummaryCard assignment={assignment} />
              </div>
            ))
          : !assignmentsLoading &&
            !assignmentsError && (
              <p className="empty-message">No new assignments from staff.</p>
            )}
      </div>
      <h3>Your Subjects (Tasks)</h3>
      <div className="subjects-grid assignments scrollable-x">
        {Object.keys(tasksBySubject).length > 0 ? (
          Object.keys(tasksBySubject).map((subject) => {
            const completedCount = tasksBySubject[subject].filter((task) => {
              const status = resolveTaskStatus(task, taskProgress);
              return status?.completed;
            }).length;
            // Debug logging to help identify ID mismatches
            try {
              // Only log once per subject to avoid repeated spam during renders
              if (!loggedSubjectsRef.current.has(subject)) {
                const taskDebug = tasksBySubject[subject].map((task) => {
                  const taskId =
                    task?.id ||
                    task?.content?.toLowerCase().replace(/\s+/g, "_");
                  return {
                    id: taskId,
                    content: task.content,
                    hasStatus: !!taskProgress[taskId],
                    completed: !!taskProgress[taskId]?.completed,
                  };
                });
                loggedSubjectsRef.current.add(subject);
              }
            } catch (e) {
              console.warn("[StudentDashboardViews] debug error:", e);
            }
            const totalCount = tasksBySubject[subject].length;
            return (
              <div
                key={subject}
                className="assignment-box"
                style={{ backgroundColor: "#c5cae9" }}
                onClick={() => {
                  setSelectedSubject(subject);
                  toggleContainer("tasks-container");
                }}
              >
                {subject} ({completedCount}/{totalCount} completed)
              </div>
            );
          })
        ) : (
          <p className="empty-message">No tasks assigned yet.</p>
        )}
      </div>

      <Leaderboard
        students={leaderboard}
        showStats={false}
        currentUserId={currentUserId}
      />
    </div>
  );
};

// --- TASKS CONTAINER VIEW ---
export const TasksContainer = ({
  activeContainer,
  inQuiz,
  currentTopic,
  currentSubtopic,
  quizQuestions,
  handleQuizComplete,
  setInQuiz,
  setCurrentTopic,
  setQuizQuestions,
  setActiveContainer,
  setNotifications,
  showQuizSetup,
  quizNumQuestions,
  setQuizNumQuestions,
  setShowQuizSetup,
  generateQuizQuestions,
  selectedSubject,
  tasksBySubject,
  taskProgress,
  copyTopicAndAskAI,
  startQuizForTopic,
  updateTaskProgress,
  setSelectedSubject,
  currentUserId,
  userData,
}) => {
  return (
    <div
      id="tasks-container"
      className={`toggle-container ${
        activeContainer === "tasks-container" ? "active" : ""
      }`}
    >
      <div className="container-header">
        {inQuiz && activeContainer === "tasks-container" ? (
          <span>Quiz: {currentTopic}</span>
        ) : selectedSubject ? (
          <span>Tasks in {selectedSubject}</span>
        ) : (
          "📝 Tasks"
        )}
      </div>
      <div className="container-body scrollable">
        {inQuiz && activeContainer === "tasks-container" ? (
          quizQuestions.length > 0 ? (
            <Quiz
              topic={currentTopic}
              subtopic={currentSubtopic}
              studentName={userData?.name || "Student"}
              questions={quizQuestions}
              handleQuizComplete={handleQuizComplete}
              handleQuizCancel={() => {
                setInQuiz(false);
                setCurrentTopic("");
                setQuizQuestions([]);
                setActiveContainer(null);
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    type: "info",
                    message:
                      "Quiz generation cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                  },
                ]);
              }}
              isInContainer={true}
            />
          ) : (
            <div className="quiz-loading-container">
              <div className="quiz-loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p>Generating AI quiz questions for "{currentTopic}"...</p>
              <button
                className="cancel-quiz-generation-btn"
                onClick={() => {
                  setInQuiz(false);
                  setCurrentTopic("");
                  setQuizQuestions([]);
                  setActiveContainer(null);
                  setNotifications((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      type: "info",
                      message:
                        "Quiz generation cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                    },
                  ]);
                }}
              >
                Cancel Quiz Generation
              </button>
            </div>
          )
        ) : showQuizSetup ? (
          <div className="quiz-setup-modal">
            <h3>Set Up Quiz for "{currentTopic}"</h3>
            <div className="quiz-setup-content">
               <p>Are you sure you want to start the quiz for "{currentTopic}"?</p>
            </div>
            <div className="quiz-setup-buttons">
              <button
                className="start-quiz-btn"
                onClick={() => {
                  setShowQuizSetup(false);
                  generateQuizQuestions();
                }}
              >
                Start Quiz
              </button>
              <button
                className="cancel-setup-btn"
                onClick={() => {
                  setShowQuizSetup(false);
                  setCurrentTopic("");
                  setNotifications((prev) => [
                    ...prev,
                    {
                      id: Date.now(),
                      type: "info",
                      message:
                        "Quiz setup cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                    },
                  ]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : selectedSubject ? (
          <div className="subject-tasks">
            {(tasksBySubject[selectedSubject] || []).length === 0 ? (
              <p className="empty-message">
                No tasks available for {selectedSubject}.
              </p>
            ) : (
              tasksBySubject[selectedSubject].map((task) => {
                const status = resolveTaskStatus(task, taskProgress);
                const isCompleted =
                  !!status?.completed ||
                  (task.completedBy || []).includes(currentUserId);
                const taskId =
                  task?.id ||
                  (task?.content || "").toLowerCase().replace(/\s+/g, "_");
                return (
                  <TaskItem
                    key={taskId}
                    task={task}
                    role="student"
                    onCopy={copyTopicAndAskAI}
                    onStartQuiz={startQuizForTopic} // Updated to pass the new function
                    isCompleted={isCompleted}
                    taskProgress={taskProgress} // Pass the full taskProgress map (TaskItem expects map)
                    onUpdateTaskProgress={updateTaskProgress} // Pass update function
                    hideSubject={true} // Hide subject label since we're already in a subject-filtered view
                  />
                );
              })
            )}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                className="back-btn small"
                onClick={() => setSelectedSubject(null)}
              >
                Back to All Subjects
              </button>
            </div>
          </div>
        ) : (
          <div className="subjects-grid">
            {Object.keys(tasksBySubject).map((subject) => {
              const totalTasks = tasksBySubject[subject].length;
              const completedTasks = tasksBySubject[subject].filter((task) => {
                const status = resolveTaskStatus(task, taskProgress);
                return (
                  !!status?.completed ||
                  task.completedBy?.includes(currentUserId)
                );
              }).length;
              return (
                <div
                  key={subject}
                  className={`subject-card ${
                    activeContainer === "tasks-container" ? "active" : ""
                  }`}
                  onClick={() => setSelectedSubject(subject)}
                >
                  <h3>
                    {subject} ({completedTasks}/{totalTasks})
                  </h3>
                </div>
              );
            })}
            {Object.keys(tasksBySubject).length === 0 && (
              <p className="empty-message">No tasks available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- GOALS CONTAINER VIEW ---
export const GoalsContainer = ({
  activeContainer,
  toggleGoalForm,
  addNewGoal,
  goals,
  toggleGoalComplete,
  deleteGoal,
}) => {
  return (
    <div
      id="goals-container"
      className={`toggle-container ${
        activeContainer === "goals-container" ? "active" : ""
      }`}
    >
      <div className="container-header">🎯 Your Goals</div>
      <div className="container-body scrollable">
        <button
          id="show-add-goal-form"
          className="add-goal-btn"
          onClick={() => toggleGoalForm(true)}
        >
          <i className="fas fa-plus"></i> Add New Goal
        </button>
        <div
          id="add-goal-form"
          className="add-goal-form"
          style={{ display: "none" }}
        >
          <h3>Add New Goal</h3>
          <input type="text" id="goal-title" placeholder="Goal title" />
          <select id="goal-type" className="goal-select">
            <option value="">Select type</option>
            <option value="academic">Academic</option>
            <option value="extracurricular">Extracurricular</option>
            <option value="personal">Personal</option>
          </select>
          <input
            type="text"
            id="goal-subject"
            placeholder="Subject (optional)"
          />
          <input type="date" id="goal-due-date" className="goal-date" />
          <textarea
            id="goal-description"
            placeholder="Description (optional)"
            className="goal-input"
          ></textarea>
          <select id="goal-priority" className="goal-select">
            <option value="">Select priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={addNewGoal}
            className="add-goal-btn"
            id="submit-new-goal"
          >
            <i className="fas fa-check"></i> Set Goal
          </button>
          <button
            onClick={() => toggleGoalForm(false)}
            className="add-goal-btn cancel"
          >
            <i className="fas fa-times"></i> Cancel
          </button>
        </div>
        {goals.length === 0 ? (
          <p className="empty-message">No goals set yet.</p>
        ) : (
          goals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onToggleComplete={toggleGoalComplete}
              onDelete={deleteGoal}
            />
          ))
        )}
      </div>
    </div>
  );
};

// --- STREAK CONTAINER VIEW ---
export const StreakContainer = ({
  activeContainer,
  streak,
  progress,
  leaderboard,
  currentUserId,
}) => {
  return (
    <div
      id="streak-container"
      className={`toggle-container ${
        activeContainer === "streak-container" ? "active" : ""
      }`}
    >
      <div className="container-header">🏆 Streak </div>
      <div className="container-body scrollable">
        <p
          style={{
            textAlign: "center",
            fontSize: "1.2em",
            color: "black",
          }}
        >
          🔥 Your Streak: {Math.round(streak)} days
        </p>
        <p
          style={{
            textAlign: "center",
            fontSize: "1.2em",
            color: "black",
          }}
        >
          📈 Your Progress: {Math.round(progress)}%
        </p>
        <Leaderboard
          students={leaderboard}
          showStats={true}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
};

// --- ASSIGNMENTS CONTAINER VIEW ---
export const AssignmentsContainer = ({
  activeContainer,
  selectedAssignmentSubject,
  assignmentsLoading,
  assignmentsError,
  assignmentsBySubject,
  setSelectedAssignmentSubject,
}) => {
  return (
    <div
      id="assignments-container"
      className={`toggle-container ${
        activeContainer === "assignments-container" ? "active" : ""
      }`}
    >
      <div className="container-header">
        {selectedAssignmentSubject ? (
          <span>Assignments in {selectedAssignmentSubject}</span>
        ) : (
          "📚 Assignments"
        )}
      </div>
      <div className="container-body scrollable">
        {assignmentsLoading ? (
          <p>Loading assignments...</p>
        ) : assignmentsError ? (
          <p className="error-message">{assignmentsError}</p>
        ) : selectedAssignmentSubject ? (
          <div className="subject-assignments">
            {(assignmentsBySubject[selectedAssignmentSubject] || []).length ===
            0 ? (
              <p className="empty-message">
                No assignments for {selectedAssignmentSubject}.
              </p>
            ) : (
              assignmentsBySubject[selectedAssignmentSubject].map(
                (assignment) => (
                  <AssignmentItem key={assignment.id} assignment={assignment} />
                )
              )
            )}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                className="back-btn small"
                onClick={() => setSelectedAssignmentSubject(null)}
              >
                Back to All Subjects
              </button>
            </div>
          </div>
        ) : (
          <div className="subjects-grid">
            {Object.keys(assignmentsBySubject).length === 0 ? (
              <p className="empty-message">No assignments posted by staff.</p>
            ) : (
              Object.keys(assignmentsBySubject).map((subject) => (
                <div
                  key={subject}
                  className="subject-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedAssignmentSubject(subject)}
                  title="View assignments"
                >
                  <h3>{subject}</h3>
                  <p>
                    {assignmentsBySubject[subject].length} Assignment
                    {assignmentsBySubject[subject].length > 1 ? "s" : ""}
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

// --- CIRCULAR CONTAINER VIEW ---
export const CircularContainer = ({ activeContainer, circulars }) => {
  return (
    <div
      id="circular-container"
      className={`toggle-container ${
        activeContainer === "circular-container" ? "active" : ""
      }`}
    >
      <div className="container-header">School Circulars</div>
      <div className="container-body scrollable">
        {circulars.length === 0 ? (
          <p className="empty-message">No circulars available.</p>
        ) : (
          <ul className="circular-list">
            {circulars.map((circular) => (
              <li key={circular.id} className="circular-item">
                <a
                  href={circular.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {circular.helptitle || circular.id}
                </a>{" "}
                <span>
                  {" - Sent by "} <strong>{circular.sender}</strong>{" "}
                </span>{" "}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- NEWS CONTAINER VIEW ---
export const NewsContainer = ({
  activeContainer,
  selectedCategory,
  handleCategoryChange,
  newsCategories,
  handleNewsRefresh,
  newsLoading,
  newsError,
  news,
  hasMoreNews,
  handleLoadMore,
  newsLastRefreshed,
  newsRefreshedBy,
}) => {
  // Format the last refreshed time
  const formatLastRefreshed = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div
      id="news-container"
      className={`toggle-container ${
        activeContainer === "news-container" ? "active" : ""
      }`}
    >
      <div className="container-header">📰 News </div>
      <div className="container-body scrollable">
        <div className="news-controls">
          <div className="news-categories">
            <label htmlFor="news-category-select">Category:</label>
            <select
              id="news-category-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {newsCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleNewsRefresh}
            disabled={newsLoading}
            className="news-refresh-btn"
            title="Click to refresh news for all students"
          >
            {newsLoading ? (
              <>
                <i
                  className="fas fa-spinner fa-spin"
                  style={{ marginRight: "8px" }}
                ></i>
                Loading...
              </>
            ) : (
              <>
                <i
                  className="fas fa-sync-alt"
                  style={{ marginRight: "8px" }}
                ></i>
                Refresh News
              </>
            )}
          </button>
        </div>

        {/* Show last refreshed info */}
        {newsLastRefreshed && !newsLoading && (
          <div className="news-refresh-info" style={{
            padding: "8px 12px",
            backgroundColor: "#f0f7ff",
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "#666",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <i className="fas fa-clock" style={{ color: "#0438af" }}></i>
            <span>
              Last updated: {formatLastRefreshed(newsLastRefreshed)}
              {newsRefreshedBy && newsRefreshedBy !== "anonymous" && newsRefreshedBy !== "system" && (
                <span style={{ marginLeft: "4px" }}>by {newsRefreshedBy}</span>
              )}
            </span>
          </div>
        )}

        {newsLoading ? (
          <div className="news-loading">
            <i
              className="fas fa-spinner fa-spin"
              style={{ fontSize: "24px", color: "#0438af" }}
            ></i>
            <p style={{ marginTop: "16px", color: "#666" }}>
              Loading latest news...
            </p>
          </div>
        ) : newsError ? (
          <div className="news-error-message">
            <i
              className="fas fa-exclamation-triangle"
              style={{ marginRight: "8px" }}
            ></i>
            {newsError}
          </div>
        ) : (
          <>
            <div className="news-list">
              {news.length === 0 ? (
                <div className="news-empty-message">
                  <i
                    className="fas fa-newspaper"
                    style={{
                      fontSize: "48px",
                      color: "#dee2e6",
                      marginBottom: "16px",
                    }}
                  ></i>
                  <p
                    style={{
                      margin: 0,
                      color: "#6c757d",
                      fontSize: "16px",
                    }}
                  >
                    No news articles found for this category.
                  </p>
                </div>
              ) : (
                news.map((article, index) => {
                  const isIndianSource = article.country === "in";

                  return (
                    <div
                      key={article.url || index}
                      className="news-article"
                      onClick={() => {
                        window.open(
                          article.url,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      <img
                        src={article.image}
                        alt={article.title || "News Article"}
                        className="news-article-image"
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x220/f8f9fa/6c757d?text=${encodeURIComponent(
                            "News Image"
                          )}`;
                        }}
                        loading="lazy"
                      />
                      <div className="news-article-content">
                        <h3>{article.title}</h3>
                        <p className="news-article-description">
                          {article.description || "No description available."}
                        </p>
                        <div className="news-article-footer">
                          <span
                            className={`news-source ${
                              isIndianSource ? "indian" : "us"
                            }`}
                          >
                            {article.source?.name || "Unknown Source"}
                            <span style={{ marginLeft: "4px" }}>
                              {isIndianSource ? "🇮🇳" : "🇺🇸"}
                            </span>
                          </span>
                          <span className="news-date">
                            {new Date(article.publishedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {hasMoreNews && news.length > 0 && (
              <div className="news-load-more-container">
                <button
                  onClick={handleLoadMore}
                  disabled={newsLoading}
                  className="news-load-more-btn"
                >
                  {newsLoading ? (
                    <>
                      <i
                        className="fas fa-spinner fa-spin"
                        style={{ marginRight: "8px" }}
                      ></i>
                      Loading More...
                    </>
                  ) : (
                    <>
                      <i
                        className="fas fa-plus"
                        style={{ marginRight: "8px" }}
                      ></i>
                      Load More Articles
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- YOUTUBE CONTAINER VIEW ---
export const YoutubeContainer = ({ activeContainer }) => {
  const youtubeContainerRef = useRef(null);
  return (
    <div
      id="youtube-container"
      className={`toggle-container ${
        activeContainer === "youtube-container" ? "active" : ""
      }`}
    >
      <div className="container-header">
        <i
          className="fab fa-youtube"
          style={{
            color: "#fff",
            marginRight: 8,
            display: "inline-block",
          }}
        ></i>
        EduTube Smart Search
      </div>
      <div className="container-body scrollable" ref={youtubeContainerRef}>
        <EduTube containerBodyRef={youtubeContainerRef} />
      </div>
    </div>
  );
};

// --- STAFF INTERACTION CONTAINER VIEW ---
export const StaffInteractionContainer = ({
  activeContainer,
  messages,
  selectedStaffId,
  selectedStaffName,
  staffList,
  sendMessageToStaff,
  deleteMessageFromStaffChat,
  showContactList,
  setShowContactList,
  setSelectedStaffId,
  setSelectedStaffName,
  currentUserId,
}) => {
  return (
    <div
      id="staff-interaction-container"
      className={`toggle-container ${
        activeContainer === "staff-interaction-container" ? "active" : ""
      }`}
    >
      <div className="container-body">
        <ChatInterface
          messages={messages}
          selectedStaffId={selectedStaffId}
          selectedStaffName={selectedStaffName}
          staffList={staffList}
          sendMessage={sendMessageToStaff}
          deleteMessage={deleteMessageFromStaffChat}
          showContactList={showContactList}
          setShowContactList={setShowContactList}
          setSelectedStaffId={setSelectedStaffId}
          setSelectedStaffName={setSelectedStaffName}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
};

// --- SELF ANALYSIS CONTAINER VIEW ---
export const SelfAnalysisContainer = ({
  activeContainer,
  selfAnalysis,
  feedbackText,
  setFeedbackText,
  handleFeedbackSubmit,
}) => {
  return (
    <div
      id="self-analysis-container"
      className={`toggle-container ${
        activeContainer === "self-analysis-container" ? "active" : ""
      }`}
    >
      <div className="container-header">🧠 Self Analysis</div>
      <div className="selfanalysis">
        <div className="analysis-summary">
          <h3>Weekly Progress Summary</h3>
          <div className="progress-group">
            <span className="progress-label">
              <b>Learning Rate:</b>
            </span>
            <progress
              value={selfAnalysis.learningRate}
              max="100"
              className="progress-bar"
            />
            <span className="progress-percent">
              {selfAnalysis.learningRate}%
            </span>
          </div>
          <div className="progress-group">
            <span className="progress-label">
              <b>Communication Skill:</b>
            </span>
            <progress
              value={selfAnalysis.communicationSkill}
              max="100"
              className="progress-bar"
            />
            <span className="progress-percent">
              {selfAnalysis.communicationSkill}%
            </span>
          </div>
          <div className="progress-group">
            <span className="progress-label">
              <b>Goal Completion Rate:</b>
            </span>
            <progress
              value={selfAnalysis.goalCompletionRate}
              max="100"
              className="progress-bar"
            />
            <span className="progress-percent">
              {selfAnalysis.goalCompletionRate}%
            </span>
          </div>
          <div className="progress-group">
            <span className="progress-label">
              <b>Quiz Engagement:</b>
            </span>
            <progress
              value={selfAnalysis.quizEngagement}
              max="100"
              className="progress-bar"
            />
            <span className="progress-percent">
              {selfAnalysis.quizEngagement}%
            </span>
          </div>
          <div className="progress-group">
            <span>
              <b>Time Spent:</b> {selfAnalysis.timeSpent}
            </span>
          </div>
        </div>
        <div className="suggestions-container">
          <h3>Personalized Learning Tips 💡</h3>
          <p className="suggestions-box">
            {selfAnalysis.suggestions ||
              "Keep engaging to get personalized tips!"}
          </p>
        </div>
        <div className="feedback-container">
          <h3>Feedback 🗣️</h3>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Share your thoughts on your learning experience..."
          ></textarea>
          <button
            onClick={handleFeedbackSubmit}
            className="add-goal-btn"
            id="submit-feedback"
          >
            <i className="fas fa-paper-plane"></i> Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SETTINGS CONTAINER VIEW ---
export const SettingsContainer = ({
  activeContainer,
  handleEditProfile,
  handleLogout,
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

// --- ABOUT CONTAINER VIEW ---
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

// --- CHATBOT CONTAINER VIEW ---
export const ChatbotContainer = ({
  activeContainer,
  copiedTopic,
  setCopiedTopic,
  inQuiz,
  handleChatbotMessageSent,
}) => {
  return (
    <div
      id="chatbot-container"
      className={`toggle-container ${
        activeContainer === "chatbot-container" ? "active" : ""
      }`}
    >
      <div className="container-body" style={{ padding: "0px" }}>
        <Chatbot
          isVisible={window.innerWidth <= 768}
          copiedTopic={copiedTopic}
          clearCopiedTopic={() => setCopiedTopic("")}
          isInContainer={true}
          isQuizActive={inQuiz}
          onMessageSent={handleChatbotMessageSent}
        />
      </div>
    </div>
  );
};

// --- NOTES CONTAINER VIEW ---
export const NotesContainer = ({
  activeContainer,
  toggleContainer,
  logStudentActivity,
  userData,
}) => {
  return (
    <div
      id="notes-container"
      className={`toggle-container ${
        activeContainer === "notes-container" ? "active" : ""
      }`}
    >
      <Notes
        toggleContainer={toggleContainer}
        logActivity={logStudentActivity}
        studentName={userData?.name}
      />
    </div>
  );
};

// --- STUDY TIMER CONTAINER VIEW ---
export const StudyTimerContainer = ({ activeContainer }) => {
  return (
    <div
      id="study-timer-container"
      className={`toggle-container ${
        activeContainer === "study-timer-container" ? "active" : ""
      }`}
    >
      <div className="container-body" style={{ padding: "0px" }}>
        <iframe
          src="/games/Study-Timer.html"
          title="Study Timer"
          style={{
            width: "100%",
            height: "calc(125vh - 210px)",
            minHeight: "600px",
            border: "none",
            borderRadius: "10px",
            background: "white",
            overflow: "hidden",
          }}
          frameBorder="0"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          scrolling="auto"
          loading="lazy"
        />
      </div>
    </div>
  );
};
