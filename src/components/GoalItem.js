import React from 'react';

const GoalItem = ({ goal, onToggleComplete, onDelete }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#FF5252';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'assignment': return '#3F51B5';
      case 'test': return '#FF5722';
      case 'quiz': return '#9C27B0';
      default: return '#607D8B';
    }
  };

  const formatGoalDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="goal-card p-4 mb-2 rounded shadow" style={{ borderLeft: `4px solid ${getPriorityColor(goal.priority)}` }}>
      <span className="type-badge inline-block px-2 py-1 rounded text-white" style={{ background: getTypeColor(goal.type) }}>
        {goal.type.charAt(0).toUpperCase() + goal.type.slice(1)}
      </span>
      <h3 className="text-lg font-semibold">{goal.title}</h3>
      <p>{goal.subject}</p>
      <p className="text-gray-600">{goal.description}</p>
      <p className="text-sm">Due: {formatGoalDate(goal.dueDate)}</p>
      <div className="goal-actions flex gap-2 mt-2">
        <button
          className={`p-2 rounded ${goal.completed ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          onClick={() => onToggleComplete(goal.id)}
        >
          {goal.completed ? 'Completed ✓' : 'Mark Complete'}
        </button>
        <button className="bg-red-500 text-white p-2 rounded" onClick={() => onDelete(goal.id)}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default GoalItem;