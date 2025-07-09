import React, { useState } from "react";

const TaskItem = ({
  task,
  role,
  onDelete,
  onCopy,
  onStartQuiz,
  isCompleted,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(task.content);
    onCopy(task.content, task.id); // Pass task.id to track progress
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

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
            className="copy-topic-btn"
            onClick={handleCopy}
            style={{
              fontSize: "12px",
              padding: "6px 10px",
              lineHeight: "1",
              whiteSpace: "nowrap",
            }}
          >
            <i
              className={copied ? "fas fa-check" : "fas fa-copy"}
              style={{ marginRight: "4px" }}
            ></i>
            {copied ? "Copied!" : "Copy & Ask AI"}
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
