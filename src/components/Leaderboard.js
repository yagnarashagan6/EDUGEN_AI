import React from 'react';
import '../styles/Dashboard.css'; // Ensure this includes necessary styles

const Leaderboard = ({ students, showStats = false }) => {
  // Only show students whose name is not 'Unknown'
  const validStudents = students.filter(student => student.name !== 'Unknown');

  return (
    <div className="leaderboard bg-white p-4 rounded shadow mt-4">
      <h3 className="text-xl font-bold mb-2">Class Leaderboard</h3>
      {validStudents.length === 0 ? (
        <p className="text-gray-500">No data available.</p>
      ) : (
        <div className="student-list scrollable">
          {validStudents.map((student) => (
            <div key={student.id} className="student-item flex items-center py-2 border-b">
              <div className="student-info flex-grow">
                <h4 className="font-semibold">{student.name}</h4>
                <p className="text-sm text-gray-600">
                  Streak: {student.streak} days | Progress: {student.progress}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {showStats && (
        <div className="mt-4">
          <p className="text-gray-600">Total Students: {validStudents.length}</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;