import React from 'react';

const MessageItem = ({ message, role }) => {
  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    date = new Date(message.timestamp);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isSent = (message.sender === 'student' && role === 'student') || (message.sender === 'staff' && role === 'staff');

  return (
    <div className={`message mb-2 p-2 rounded ${isSent ? 'bg-blue-100 text-right' : 'bg-gray-100 text-left'}`}>
      <div>{message.text}</div>
      <div className="message-time text-xs text-gray-500">
        {formatDate(message.timestamp)} {formatTime(message.timestamp)}
        {isSent && (
          <span className="message-status ml-2">
            {message.read ? (
              <i className="fas fa-check-double text-blue-500"></i>
            ) : (
              <i className="fas fa-check text-gray-500"></i>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageItem;