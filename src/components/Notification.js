import React from "react";

const Notification = ({
  message,
  onClose,
  onClick,
  isClickable = false,
  buttonText = "Start Quiz",
}) => {
  return (
    <div
      className="notification"
      style={{
        backgroundColor: isClickable ? "#e3f2fd" : "#ffffff",
        border: isClickable ? "1.5px solid #1976d2" : "1px solid #e0e0e0",
        borderRadius: "6px",
        padding: "12px 16px",
        marginBottom: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        maxWidth: "380px",
        fontSize: "14px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: isClickable ? "#1976d2" : "#333",
          fontWeight: isClickable ? "500" : "normal",
          flex: 1,
        }}
      >
        {message}
      </p>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        {isClickable && (
          <button
            onClick={onClick}
            style={{
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#1565c0")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#1976d2")}
          >
            {buttonText}
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#d32f2f")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#f44336")}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Notification;
