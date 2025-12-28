import React, { useState } from "react";

const TaskItem = ({
  task,
  role,
  onDelete,
  onCopy,
  onStartQuiz,
  isCompleted,
  taskProgress = {}, // Add taskProgress prop
  onUpdateTaskProgress, // Add progress update function
}) => {
  const [copied, setCopied] = useState(false);

  // Get current task progress - simplified to track only the key steps
  const currentProgress = taskProgress[task.id] || {};
  const hasCopiedTopic = !!currentProgress.copyAndAsk; // Step 1: Topic copied
  const isReadyForQuiz = hasCopiedTopic && !isCompleted; // Ready for quiz after copying

  const handleCopy = () => {
    const textToCopy = task.topic
      ? `${task.topic}${task.subtopic ? ` - ${task.subtopic}` : ""}`
      : task.content;
    navigator.clipboard.writeText(textToCopy);
    onCopy(textToCopy, task.id); // Pass task.id to track progress
    setCopied(true);

    // Update task progress to step 1 (copied topic)
    if (onUpdateTaskProgress) {
      onUpdateTaskProgress(task.id, "copyAndAsk");
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const handleTakeQuiz = () => {
    // Start quiz for this topic
    if (onStartQuiz) {
      const topicToQuiz = task.topic
        ? `${task.topic}${task.subtopic ? ` - ${task.subtopic}` : ""}`
        : task.content;
      onStartQuiz(topicToQuiz, task.id);
    }
  };

  const getButtonContent = () => {
    if (isCompleted) {
      return {
        icon: "fas fa-check",
        text: "Completed",
        disabled: true,
        className: "copy-topic-btn completed",
      };
    } else if (isReadyForQuiz) {
      // Step 2: Show "Take Quiz" button after copying
      return {
        icon: "fas fa-brain",
        text: "Take Quiz",
        disabled: false,
        className: "copy-topic-btn quiz-ready",
        onClick: handleTakeQuiz,
      };
    } else {
      // Step 1: Show "Copy & Ask AI" button
      return {
        icon: copied ? "fas fa-check" : "fas fa-copy",
        text: copied ? "Copied!" : "Copy & Ask AI",
        disabled: false,
        className: `copy-topic-btn ${copied ? "copied" : ""}`,
        onClick: handleCopy,
      };
    }
  };

  const buttonConfig = getButtonContent();

  return (
    <div
      className={`task-item${isCompleted ? " completed" : ""} ${
        copied ? "copied" : ""
      }`}
    >
      <p>
        {task.content} <small>({task.subject || "No Subject"})</small>
        {role === "student" && (
          <span
            style={{
              marginLeft: 8,
              color: isCompleted ? "#4caf50" : "#f44336",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            {isCompleted ? "Completed" : "Incomplete"}
          </span>
        )}
      </p>
      <small>Posted on: {task.date}</small>

      {role === "student" ? (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={buttonConfig.className}
            onClick={buttonConfig.onClick}
            disabled={buttonConfig.disabled}
            style={{
              fontSize: "12px",
              padding: "6px 10px",
              lineHeight: "1",
              whiteSpace: "nowrap",
              backgroundColor:
                isReadyForQuiz && !isCompleted
                  ? "#ff9800" // Orange for "Take Quiz"
                  : undefined,
              opacity: buttonConfig.disabled ? 0.6 : 1,
              cursor: buttonConfig.disabled ? "not-allowed" : "pointer",
            }}
          >
            <i className={buttonConfig.icon} style={{ marginRight: "4px" }}></i>
            {buttonConfig.text}
          </button>
        </div>
      ) : (
        <button
          className="copy-topic-btn"
          style={{
            backgroundColor: "#f44336",
            fontSize: "12px",
            padding: "6px 10px",
            lineHeight: "1",
            whiteSpace: "nowrap",
          }}
          onClick={() => onDelete(task.id)}
        >
          <i className="fas fa-trash"></i> Delete
        </button>
      )}
    </div>
  );
};

export default TaskItem;
