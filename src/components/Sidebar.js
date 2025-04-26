import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

const Sidebar = ({ userData, role, toggleContainer, isVisible, toggleSidebar }) => {
  const navigate = useNavigate();

  const redirectToProfile = () => {
    navigate('/profile', { state: { role } });
  };

  const studentItems = [
    { id: 'tasks-container', icon: 'fas fa-tasks', label: 'Tasks' },
    { id: 'goals-container', icon: 'fas fa-bullseye', label: 'Goals' },
    { id: 'assignments-container', icon: 'fas fa-file-alt', label: 'Assignments' },
    { id: 'streak-container', icon: 'fas fa-fire', label: 'Streaks' },
    { id: 'circular-container', icon: 'fas fa-bullhorn', label: 'Circular' },
    { id: 'staff-interaction-container', icon: 'fas fa-users', label: 'Staff Interaction' },
    { id: 'self-analysis-container', icon: 'fas fa-chart-bar', label: 'Self Analysis' },
    { id: 'settings-container', icon: 'fas fa-cog', label: 'Settings' }, // Added settings for students
  ];

  const staffItems = [
    { id: 'tasks-container', icon: 'fas fa-tasks', label: 'Tasks' },
    { id: 'assignments-container', icon: 'fas fa-file-alt', label: 'Assignments' },
    { id: 'results-container', icon: 'fas fa-chart-line', label: 'Results' },
    { id: 'circular-container', icon: 'fas fa-bullhorn', label: 'Circulars' },
    { id: 'staff-interaction-container', icon: 'fas fa-users', label: 'Staff Interaction' },
    { id: 'quick-stats-container', icon: 'fas fa-chart-bar', label: 'Quick Stats' },
    { id: 'settings-container', icon: 'fas fa-cog', label: 'Settings' },
  ];

  const items = role === 'staff' ? staffItems : studentItems;

  return (
    <div className={`sidebar ${isVisible ? 'active' : ''}`}>
      <div
        className="profile"
        onClick={redirectToProfile}
        style={{ padding: '20px 0', marginTop: '10px' }}
      >
        <img
          src={userData?.image || '/default-profile.jpg'}
          alt="Profile"
          className="sidebar-profile-img"
        />
        <h3>{userData?.name || 'Loading...'}</h3>
      </div>
      <ul>
        <li
          onClick={toggleSidebar}
          className={`sidebar-toggle-item ${isVisible ? 'active' : ''}`}
          style={{ padding: '12px 20px', cursor: 'pointer' }}
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Menu</span>
        </li>
        {items.map((item) => (
          <li key={item.id} onClick={() => toggleContainer(item.id)}>
            <i className={item.icon}></i> <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;