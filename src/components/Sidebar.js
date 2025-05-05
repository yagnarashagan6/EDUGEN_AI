import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';
import '../styles/Dashboard.css';

const Sidebar = ({ 
  userData, 
  role, 
  toggleContainer, 
  isVisible, 
  toggleSidebar, 
  setMobileHamburger, 
  copiedTopic, 
  clearCopiedTopic 
}) => {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

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
    { id: 'chatbot-container', icon: 'fas fa-comment', label: 'Chatbot', mobileOnly: true },
    { id: 'settings-container', icon: 'fas fa-cog', label: 'Settings' },
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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isVisible && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        toggleSidebar();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isVisible, toggleSidebar]);

  const hamburgerButton = (
    <button
      className={`sidebar-toggle-btn ${isVisible ? 'active' : ''}`}
      onClick={toggleSidebar}
    >
      <div className="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>
  );

  useEffect(() => {
    setMobileHamburger(hamburgerButton);
    return () => setMobileHamburger(null);
  }, [isVisible, setMobileHamburger]);

  return (
    <div ref={sidebarRef} className={`sidebar ${isVisible ? 'active' : ''}`}>
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
          className={`sidebar-toggle-item ${isVisible ? 'active' : ''}`}
          onClick={toggleSidebar}
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>Menu</span>
        </li>
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => {
              toggleContainer(item.id);
              toggleSidebar(); // Close sidebar on mobile after selection
            }}
            className={item.mobileOnly ? 'mobile-only' : ''}
            style={item.id === 'chatbot-container' && window.innerWidth > 768 ? { display: 'none' } : {}}
          >
            <i className={item.icon}></i> <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;