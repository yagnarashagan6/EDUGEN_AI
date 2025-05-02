import React from 'react';
import '../styles/Dashboard.css'; // Ensure this includes necessary styles

const Leaderboard = ({ students, showStats = false }) => {
  return (
    <div className="leaderboard bg-white p-4 rounded shadow mt-4">
      <h3 className="text-xl font-bold mb-2">Class Leaderboard</h3>
      {students.length === 0 ? (
        <p className="text-gray-500">No data available.</p>
      ) : (
        <div className="student-list scrollable">
          {students.map((student) => (
            <div key={student.id} className="student-item flex items-center py-2 border-b">
              <img
                src={student.photoURL || '/default-student.png'}
                alt={student.name}
                className="student-avatar w-10 h-10 rounded-full mr-4"
                onError={(e) => (e.target.src = '/default-student.png')}
              />
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
          <p className="text-gray-600">Total Students: {students.length}</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;