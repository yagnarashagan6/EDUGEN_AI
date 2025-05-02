import React, { useState } from 'react';

const OverdueTaskNotification = ({ task, onSubmitAndNavigate, onClose }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason.');
      return;
    }
    onSubmitAndNavigate(task, reason);
    onClose();
  };

  return (
    <div className="notification bg-gray-100 p-3 rounded shadow mb-2">
      <p>Task "{task.content}" is overdue by 48 hours!</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Please explain why you couldn't complete the task..."
        className="goal-input w-full mt-2"
        style={{ height: '80px' }}
      ></textarea>
      <div className="flex justify-between mt-2">
        <button onClick={handleSubmit} className="bg-blue-500 text-white p-2 rounded">
          Submit Reason
        </button>
        <button onClick={onClose} className="bg-red-500 text-white p-2 rounded">
          Close
        </button>
      </div>
    </div>
  );
};

export default OverdueTaskNotification;