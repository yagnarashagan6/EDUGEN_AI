import React, { useState } from "react";
import { supabaseAuth as auth } from "../supabase";

const OverdueTaskNotification = ({ task, onSubmitReason, onClose }) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!reason.trim()) {
      alert("Please provide a reason before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReason(task, reason);
      setSubmitted(true);
      setReason("");

      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error submitting reason:", error);
      alert(`Failed to submit reason: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    e.stopPropagation();
    setReason(e.target.value);
  };

  // ...existing code...
  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) {
      try {
        // FIXED: Use imported auth
        const user = auth.currentUser;
        if (user) {
          const reasonKey = `overdueReason_${user.uid}_${task.id}`;
          localStorage.setItem(
            reasonKey,
            JSON.stringify({
              canceledAt: Date.now(),
            })
          );
          console.log(
            `Cancellation stored for task ${task.id} at ${Date.now()}`
          ); // Debug log
        } else {
          console.warn("No user found when trying to store cancellation");
        }
      } catch (error) {
        console.error("Error storing cancellation:", error);
      }
      onClose();
    }
  };
  // ...existing code...

  const handleContainerClick = (e) => {
    e.stopPropagation();
  };

  if (submitted) {
    return (
      <div
        onClick={handleContainerClick}
        style={{
          backgroundColor: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          maxWidth: "450px",
          position: "relative",
          zIndex: 10001,
          pointerEvents: "auto",
          textAlign: "center",
        }}
      >
        <h4
          style={{
            margin: "0 0 8px 0",
            color: "#155724",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          ✅ Reason Submitted!
        </h4>
        <p
          style={{
            margin: "0",
            color: "#155724",
            fontSize: "14px",
            lineHeight: "1.4",
          }}
        >
          Your reason has been sent to{" "}
          <strong>{task.staffName || "the staff member"}</strong> who posted
          this task. This notification will close automatically.
        </p>
        <button
          onClick={handleCloseClick}
          style={{
            marginTop: "10px",
            padding: "6px 12px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Close Now
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleContainerClick}
      style={{
        backgroundColor: "#fff3cd",
        border: "1px solid #ffeaa7",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        maxWidth: "450px",
        position: "relative",
        zIndex: 10001,
        pointerEvents: "auto",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h4
          style={{
            margin: "0 0 8px 0",
            color: "#856404",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          ⚠️ Task Overdue (2+ Days)
        </h4>
        <p
          style={{
            margin: "0 0 12px 0",
            color: "#856404",
            fontSize: "14px",
            lineHeight: "1.4",
          }}
        >
          Task "<strong>{task.content}</strong>" from{" "}
          <strong>{task.subject || "Unknown Subject"}</strong> posted by{" "}
          <strong>{task.staffName || "Staff"}</strong> is overdue!
          <br />
          <br />
          Please complete:{" "}
          <strong>Copy & Ask AI → Chatbot Send → Take Quiz</strong>
          <br />
          Or provide a reason below to explain the delay.
        </p>
      </div>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <textarea
          value={reason}
          onChange={handleInputChange}
          onClick={(e) => e.stopPropagation()}
          placeholder="Please explain why you couldn't complete the task sequence... (e.g., technical issues, personal circumstances, need help understanding, etc.)"
          disabled={isSubmitting}
          required
          autoFocus
          style={{
            width: "100%",
            minHeight: "90px",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            resize: "vertical",
            fontSize: "14px",
            fontFamily: "inherit",
            boxSizing: "border-box",
            backgroundColor: isSubmitting ? "#f5f5f5" : "white",
            cursor: isSubmitting ? "not-allowed" : "text",
            outline: "none",
            transition: "border-color 0.2s ease",
            pointerEvents: "auto",
          }}
          onFocus={(e) => {
            e.stopPropagation();
            e.target.style.borderColor = "#856404";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ddd";
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
            marginTop: "15px",
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            style={{
              backgroundColor:
                isSubmitting || !reason.trim() ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "6px",
              cursor:
                isSubmitting || !reason.trim() ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              flex: 1,
              pointerEvents: "auto",
            }}
          >
            {isSubmitting ? (
              <>
                <i
                  className="fas fa-spinner fa-spin"
                  style={{ marginRight: "6px" }}
                ></i>
                Sending to {task.staffName || "Staff"}...
              </>
            ) : (
              <>
                <i
                  className="fas fa-paper-plane"
                  style={{ marginRight: "6px" }}
                ></i>
                Send Reason to {task.staffName || "Staff"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCloseClick}
            disabled={isSubmitting}
            style={{
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: "6px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease",
              pointerEvents: "auto",
            }}
          >
            <i className="fas fa-times" style={{ marginRight: "6px" }}></i>
            Close
          </button>
        </div>
      </form>
      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            backgroundColor: "#f8f9fa",
            fontSize: "12px",
            color: "#666",
            borderRadius: "4px",
          }}
        >
          Debug: Task posted{" "}
          {Math.floor(
            (Date.now() - new Date(task.date).getTime()) / (24 * 60 * 60 * 1000)
          )}{" "}
          days ago
        </div>
      )}
    </div>
  );
};

export default OverdueTaskNotification;
