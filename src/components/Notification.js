import React from 'react';

const Notification = ({ message, onClose, onClick, isClickable = false }) => {
  return (
    <div
      className="notification bg-gray-100 p-3 rounded shadow mb-2 flex flex-col md:flex-row md:items-center justify-between"
      style={{ gap: '10px' }}
    >
      <p className="text-gray-800">{message}</p>

      <div className="flex gap-2 mt-2 md:mt-0">
        {onClick && (
          <button
            onClick={onClick}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            Start Quiz
          </button>
        )}
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Notification;
