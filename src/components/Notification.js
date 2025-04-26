import React from 'react';

const Notification = ({ message, onClose }) => {
  return (
    <div className="notification bg-gray-100 p-3 rounded shadow mb-2 flex justify-between items-center">
      <p>{message}</p>
      <button onClick={onClose} className="bg-red-500 text-white p-1 rounded">Close</button>
    </div>
  );
};

export default Notification;