import React from 'react';

const Leaderboard = ({ students }) => {
  return (
    <div className="leaderboard bg-white p-4 rounded shadow mt-4">
      <h3 className="text-xl font-bold mb-2">Class Leaderboard</h3>
      {students.length === 0 ? (
        <p className="text-gray-500">No data available.</p>
      ) : (
        <ul className="list-decimal pl-5">
          {students.map((student, index) => (
            <li key={student.id} className="py-1">
              {student.name} - {student.progress}% (Streak: {student.streak})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Leaderboard;