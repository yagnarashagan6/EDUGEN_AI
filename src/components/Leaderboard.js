import React from "react";
import "../styles/Dashboard.css";

const Leaderboard = ({ students, showStats = false, currentUserId }) => {
  // Filter out students with 'Unknown' names
  const filteredStudents = students.filter(
    (student) =>
      student.name !== "Unknown" && student.name && student.name.trim() !== ""
  );

  // Sort students by progress first, then by streak
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;
    return (b.streak || 0) - (a.streak || 0);
  });

  // Get top 10 students for better mobile display
  const displayStudents = sortedStudents.slice(0, 10);

  if (displayStudents.length === 0) {
    return (
      <div className="leaderboard">
        <h3>Class Leaderboard</h3>
        <p className="empty-message">No student data available yet.</p>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <h3>Class Leaderboard</h3>
      <ul>
        {displayStudents.map((student, index) => (
          <li
            key={student.id}
            className={
              student.id === currentUserId ? "current-user-leaderboard" : ""
            }
          >
            <span>
              #{index + 1} {student.name}
              {student.id === currentUserId ? " (You)" : ""}
            </span>
            <span>
              🔥 {Math.round(student.streak || 0)} days | 📈{" "}
              {Math.round(student.progress || 0)}%
            </span>
          </li>
        ))}
      </ul>
      {showStats && (
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            background: "#f8f9fa",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: "0",
              fontSize: "14px",
              color: "#666",
              fontWeight: "500",
            }}
          >
            Total Active Students: {displayStudents.length}
            {sortedStudents.length > 10 && (
              <span
                style={{ fontSize: "12px", display: "block", marginTop: "5px" }}
              >
                Showing top 10 students
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
