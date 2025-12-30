import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseAuth as auth } from "../supabase";
import "../styles/Sidebar.css";
import "../styles/Dashboard.css";

const Sidebar = ({
  userData,
  role,
  toggleContainer,
  isVisible,
  toggleSidebar,
  setMobileHamburger,
  copiedTopic,
  clearCopiedTopic,
  activeContainer,
  unreadMessageCounts = {}, // Add this prop
}) => {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const redirectToProfile = () => {
    navigate("/profile", { state: { role } });
  };

  const studentItems = [
    { id: "tasks-container", icon: "fas fa-tasks", label: "Tasks" },
    { id: "goals-container", icon: "fas fa-bullseye", label: "Goals" },
    {
      id: "assignments-container",
      icon: "fas fa-file-alt",
      label: "Assignments",
    },
    {
      id: "quiz-container",
      icon: "fas fa-question-circle",
      label: "Quiz",
    },
    { id: "streak-container", icon: "fas fa-fire", label: "Streaks" },
    { id: "news-container", icon: "fas fa-newspaper", label: "News" },
    {
      id: "youtube-container",
      icon: "fab fa-youtube",
      label: "YouTube",
    },
    {
      id: "study-timer-container", // Add Study Timer option
      icon: "fas fa-stopwatch",
      label: "Study Timer",
    },
    {
      id: "staff-interaction-container",
      icon: "fas fa-users",
      label: "Staff Interaction",
    },
    {
      id: "self-analysis-container",
      icon: "fas fa-chart-bar",
      label: "Self Analysis",
    },
    // Only show chatbot option on mobile
    ...(isMobile
      ? [
        {
          id: "chatbot-container",
          icon: "fas fa-comment",
          label: "Chatbot",
        },
      ]
      : []),
    { id: "notes-container", icon: "fas fa-sticky-note", label: "Notes" },
    { id: "settings-container", icon: "fas fa-cog", label: "Settings" },
  ];

  const staffItems = [
    { id: "tasks-container", icon: "fas fa-tasks", label: "Tasks" },
    {
      id: "assignments-container",
      icon: "fas fa-file-alt",
      label: "Assignments",
    },
    { id: "results-container", icon: "fas fa-chart-line", label: "Results" },
    { id: "monitor-container", icon: "fas fa-history", label: "Monitor" },
    {
      id: "staff-interaction-container",
      icon: "fas fa-users",
      label: "Student Interaction",
    },
    {
      id: "quick-stats-container",
      icon: "fas fa-chart-bar",
      label: "Quick Stats",
    },
    {
      id: "timetable-creator-container", // Timetable Creator option for staff
      icon: "fas fa-calendar-alt",
      label: "Timetable Creator",
    },
    {
      id: "rag-model-container",
      icon: "fas fa-database",
      label: "RAG Model",
    },
    {
      id: "quiz-analytics",
      icon: "fas fa-chart-pie",
      label: "Quiz Analytics",
    },
    {
      id: "youtube-controller-container", // YouTube Controller option for staff
      icon: "fab fa-youtube",
      label: "YouTube Controller",
    },
    // Only show chatbot option on mobile
    ...(isMobile
      ? [
        {
          id: "chatbot-container",
          icon: "fas fa-comment",
          label: "Chatbot",
        },
      ]
      : []),
    { id: "settings-container", icon: "fas fa-cog", label: "Settings" },
  ];

  const items = role === "staff" ? staffItems : studentItems;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isVisible &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        toggleSidebar();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isVisible, toggleSidebar]);

  const hamburgerButton = (
    <button
      className={`sidebar-toggle-btn ${isVisible ? "active" : ""}`}
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

  // Touch event states
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Touch event handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchEnd - touchStart;
    const isLeftSwipe = distance < -50;
    const isRightSwipe = distance > 50;

    if (isRightSwipe && !isVisible) {
      toggleSidebar();
    } else if (isLeftSwipe && isVisible) {
      toggleSidebar();
    }

    setTouchEnd(null);
    setTouchStart(null);
  };

  // Add unread message counter effect
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // This is a simplified version - you might want to implement
    // a more comprehensive unread counter based on your needs
    const checkUnreadMessages = () => {
      // Implementation would depend on your specific requirements
      // For now, this is a placeholder
    };

    checkUnreadMessages();
  }, []);

  // Calculate total unread messages for staff interaction
  const totalUnreadMessages = Object.values(unreadMessageCounts || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div
      ref={sidebarRef}
      className={`sidebar ${isVisible ? "active" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="profile"
        onClick={redirectToProfile}
        style={{ padding: "20px 0", marginTop: "10px" }}
      >
        <img
          src={userData?.image || "/default-profile.jpg"}
          alt="Profile"
          className="sidebar-profile-img"
        />
        <h3>{userData?.name || "Loading..."}</h3>
      </div>
      <ul>
        <li
          className={`sidebar-toggle-item ${isVisible ? "active" : ""}`}
          onClick={toggleSidebar}
          title="Menu"
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span style={{ marginLeft: 30 }}> Menu</span>
        </li>
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => {
              toggleContainer(item.id);
              if (isMobile) {
                toggleSidebar(); // Close sidebar on mobile after selection
              }
            }}
            className={`sidebar-menu-item ${activeContainer === item.id ? "active-option" : ""
              }`}
            title={window.innerWidth > 768 ? item.label : ""}
          >
            <i className={item.icon}></i>
            <span>
              {isVisible && item.label}
              {item.id === "staff-interaction-container" &&
                totalUnreadMessages > 0 && (
                  <span className="unread-badge">{totalUnreadMessages}</span>
                )}
            </span>
            {/* Badge for collapsed state */}
            {!isVisible &&
              item.id === "staff-interaction-container" &&
              totalUnreadMessages > 0 && (
                <span className="unread-badge">{totalUnreadMessages}</span>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
