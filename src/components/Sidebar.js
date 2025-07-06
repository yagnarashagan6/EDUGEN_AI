import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  activeContainer, // Added to sync with StudentDashboard's activeContainer
}) => {
  const navigate = useNavigate();
  const sidebarRef = useRef(null);

  // State to track the active option (synced with activeContainer)
  const [activeOption, setActiveOption] = useState(activeContainer || "");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Sync activeOption with activeContainer prop
  useEffect(() => {
    setActiveOption(activeContainer || "");
  }, [activeContainer]);

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
    { id: "streak-container", icon: "fas fa-fire", label: "Streaks" },
    { id: "news-container", icon: "fas fa-newspaper", label: "News" }, // Changed from circular to news
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
      label: "Staff Interaction",
    },
    {
      id: "quick-stats-container",
      icon: "fas fa-chart-bar",
      label: "Quick Stats",
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
          <span>Menu</span>
        </li>
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => {
              toggleContainer(item.id);
              toggleSidebar(); // Close sidebar on mobile after selection
              setActiveOption(item.id); // Update active option
            }}
            className={`${
              activeOption === item.id ? "active-option" : ""
            }`}
            title={window.innerWidth > 768 ? item.label : ""}
          >
            <i className={item.icon}></i> <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
