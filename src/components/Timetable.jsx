import React, { useState, useEffect, useRef, useReducer } from "react";
import "../styles/Timetable.css";

const initialState = {
  isLoggedIn: true,
  currentPage: "dashboard",
  exams: [],
  upcomingExams: [],
  completedExams: [],
  examFolders: [], // This will now store class timetable folders
  editingTimetable: null,
  currentUserId: "admin",
};

function appReducer(state, action) {
  switch (action.type) {
    case "LOGOUT":
      return { ...state, isLoggedIn: false, currentPage: "dashboard" };
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };
    case "ADD_EXAM": // No longer used for exams, but reducer structure is kept
      return {
        ...state,
        upcomingExams: [...state.upcomingExams, action.payload],
      };
    case "SET_UPCOMING_EXAMS":
      return { ...state, upcomingExams: action.payload };
    case "SET_COMPLETED_EXAMS":
      return { ...state, completedExams: action.payload };
    case "SET_EXAM_FOLDERS":
      return { ...state, examFolders: action.payload };
    case "ADD_EXAM_FOLDER":
      if (
        action.payload &&
        action.payload.folderName &&
        state.examFolders.some(
          (f) =>
            f &&
            f.folderName &&
            f.folderName.toLowerCase() ===
              action.payload.folderName.toLowerCase()
        )
      ) {
        return {
          ...state,
          examFolders: state.examFolders.map((f) =>
            f &&
            f.folderName &&
            f.folderName.toLowerCase() ===
              action.payload.folderName.toLowerCase()
              ? action.payload
              : f
          ),
        };
      }
      return { ...state, examFolders: [...state.examFolders, action.payload] };
    case "UPDATE_EXAM_FOLDER":
      return {
        ...state,
        examFolders: state.examFolders.map((f) =>
          f.id === action.payload.id ? action.payload : f
        ),
      };
    case "DELETE_EXAM_FOLDER":
      return {
        ...state,
        examFolders: state.examFolders.filter((f) => f.id !== action.payload),
      };
    case "CLEAR_ALL_TIMETABLES":
      return { ...state, examFolders: [] };
    case "SET_EDITING_TIMETABLE":
      return { ...state, editingTimetable: action.payload };
    default:
      return state;
  }
}

const Homepage = ({ isContainer = false }) => {
  const [appState, dispatch] = useReducer(appReducer, {
    ...initialState,
    currentPage: isContainer ? "create-exam" : "dashboard",
  });

  useEffect(() => {
    const fetchExamFolders = async () => {
      // Load all timetables from localStorage
      const storedFolders = JSON.parse(
        localStorage.getItem("examFolders") || "[]"
      );
      const savedTimetables = JSON.parse(
        localStorage.getItem("savedTimetables") || "[]"
      );

      // Merge stored folders and saved timetables
      const allFolders = [...storedFolders, ...savedTimetables];
      dispatch({ type: "SET_EXAM_FOLDERS", payload: allFolders });
    };
    fetchExamFolders();
  }, [appState.currentUserId]);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    dispatch({ type: "LOGOUT" });
  };

  const refreshExamFolders = async () => {
    // Load all timetables from localStorage
    const storedFolders = JSON.parse(
      localStorage.getItem("examFolders") || "[]"
    );
    const savedTimetables = JSON.parse(
      localStorage.getItem("savedTimetables") || "[]"
    );

    // Merge stored folders and saved timetables
    const allFolders = [...storedFolders, ...savedTimetables];

    dispatch({ type: "SET_EXAM_FOLDERS", payload: allFolders });
  };

  const handleClearAllTimetables = () => {
    if (
      window.confirm(
        "This will remove ALL stored timetables locally. Continue?"
      )
    ) {
      dispatch({ type: "CLEAR_ALL_TIMETABLES" });
      localStorage.removeItem("examFolders");
      localStorage.removeItem("examTimetables"); // Clear legacy key
      localStorage.removeItem("savedTimetables"); // Clear locally saved timetables
    }
  };

  const setPage = (page) => {
    dispatch({ type: "SET_PAGE", payload: page });
    if (page === "upcoming-exams") {
      refreshExamFolders();
    }
  };

  const handleCreateTimetable = async (timetableData) => {
    // Save timetable to localStorage only
    const folder = {
      id: Date.now().toString(),
      userId: appState.currentUserId,
      folderName: timetableData.tableName,
      timetables: [timetableData],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_EXAM_FOLDER", payload: folder });
    const storedFolders = JSON.parse(
      localStorage.getItem("examFolders") || "[]"
    );
    storedFolders.push(folder);
    localStorage.setItem("examFolders", JSON.stringify(storedFolders));
    return {
      success: true,
      message: "Timetable saved successfully!",
    };
  };

  const handleUpdateTimetable = async (updatedTimetableData) => {
    // Update in state only, local storage is handled separately if needed
    dispatch({ type: "SET_EDITING_TIMETABLE", payload: null });
    dispatch({ type: "SET_PAGE", payload: "upcoming-exams" });
  };

  const handleEditTimetable = (timetable) => {
    dispatch({ type: "SET_EDITING_TIMETABLE", payload: timetable });
    dispatch({ type: "SET_PAGE", payload: "create-exam" });
  };

  const handleDeleteTimetable = async (timetableId) => {
    if (window.confirm("Are you sure you want to delete this timetable?")) {
      const folder = appState.examFolders.find((f) =>
        f.timetables.some((t) => t.id === timetableId)
      );
      if (!folder) return;

      // Handle local storage deletion
      const savedTimetables = JSON.parse(
        localStorage.getItem("savedTimetables") || "[]"
      );
      const examFolders = JSON.parse(
        localStorage.getItem("examFolders") || "[]"
      );

      // Remove from savedTimetables
      const updatedSavedTimetables = savedTimetables.filter(
        (t) => t.id !== folder.id
      );
      if (updatedSavedTimetables.length !== savedTimetables.length) {
        localStorage.setItem(
          "savedTimetables",
          JSON.stringify(updatedSavedTimetables)
        );
      }

      // Remove from examFolders
      const updatedExamFolders = examFolders.filter((f) => f.id !== folder.id);
      if (updatedExamFolders.length !== examFolders.length) {
        localStorage.setItem("examFolders", JSON.stringify(updatedExamFolders));
      }

      // Update state
      dispatch({ type: "DELETE_EXAM_FOLDER", payload: folder.id });
      alert("Timetable deleted successfully!");
      refreshExamFolders();
    }
  };

  const handleCellChange = (day, periodIndex, value) => {
    // This function is implemented in TimetableGenerator component
  };

  const handleDragStart = (e, day, periodIndex) => {
    // This function is implemented in TimetableGenerator component
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, targetDay, targetPeriodIndex) => {
    // This function is implemented in TimetableGenerator component
  };

  const handleLegendCellChange = (courseIndex, field, value) => {
    // This function is implemented in TimetableGenerator component
  };

  const handleAddCourse = () => {
    // This function is implemented in TimetableGenerator component
  };

  const handleDeleteCourse = (index) => {
    // This function is implemented in TimetableGenerator component
  };

  return (
    <div className={isContainer ? "timetable-container" : "homepage-container"}>
      <Dashboard
        currentPage={appState.currentPage}
        setPage={setPage}
        onLogout={handleLogout}
        onCreateTimetable={handleCreateTimetable}
        onUpdateTimetable={handleUpdateTimetable}
        onEditTimetable={handleEditTimetable}
        onDeleteTimetable={handleDeleteTimetable}
        examFolders={appState.examFolders}
        editingTimetable={appState.editingTimetable}
        dispatch={dispatch}
        refreshExamFolders={refreshExamFolders}
        onClearAll={handleClearAllTimetables}
        isContainer={isContainer}
      />
    </div>
  );
};
const Dashboard = ({
  currentPage,
  setPage,
  onLogout,
  onCreateTimetable,
  onUpdateTimetable,
  onEditTimetable,
  onDeleteTimetable,
  examFolders,
  editingTimetable,
  dispatch,
  refreshExamFolders,
  onClearAll,
  isContainer = false,
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const renderPage = () => {
    switch (currentPage) {
      case "create-exam":
        return (
          <TimetableGenerator
            onSaveTimetable={onCreateTimetable}
            editingTimetable={editingTimetable}
            onUpdateTimetable={onUpdateTimetable}
            dispatch={dispatch}
          />
        );
      case "upcoming-exams":
        return (
          <TimetableFolders
            title="Class Timetables"
            timetables={examFolders}
            onEdit={onEditTimetable}
            onDelete={onDeleteTimetable}
            onRefresh={refreshExamFolders}
            onClearAll={onClearAll}
          />
        );
      default:
        return (
          <main className="dashboard-main">
            <h2 className="dashboard-main-title">Dashboard</h2>
            <p className="dashboard-main-subtitle">
              Welcome, Staff! Select an option from the menu.
            </p>
            <div className="dashboard-grid">
              <DashboardCard
                title="Create Timetable"
                description="Generate a new class timetable."
                onClick={() => setPage("create-exam")}
                icon="M12 4v16m8-8H4"
              />
              <DashboardCard
                title="Class Timetables"
                description="View and manage your class timetables."
                onClick={() => setPage("upcoming-exams")}
                icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </div>
          </main>
        );
    }
  };
  return (
    <div className={isContainer ? "dashboard-container" : "dashboard"}>
      {isContainer ? (
        // Container mode - show navigation tabs and content within container
        <div className="timetable-content">
          {/* Container navigation tabs */}
          <div className="container-nav-tabs">
            <button
              className={`nav-tab ${
                currentPage === "dashboard" ? "active" : ""
              }`}
              onClick={() => setPage("dashboard")}
            >
              Home
            </button>
            <button
              className={`nav-tab ${
                currentPage === "create-exam" ? "active" : ""
              }`}
              onClick={() => setPage("create-exam")}
            >
              Create
            </button>
            <button
              className={`nav-tab ${
                currentPage === "upcoming-exams" ? "active" : ""
              }`}
              onClick={() => setPage("upcoming-exams")}
            >
              View
            </button>
          </div>
          {/* Container content */}
          <div className="container-content">{renderPage()}</div>
        </div>
      ) : (
        // Full page mode - with navigation
        <>
          <nav className={`mobile-nav ${isMobileNavOpen ? "show" : ""}`}>
            <button
              className="nav-link"
              onClick={() => {
                setPage("dashboard");
                setIsMobileNavOpen(false);
              }}
            >
              Home
            </button>
            <button
              className="nav-link"
              onClick={() => {
                setPage("create-exam");
                setIsMobileNavOpen(false);
              }}
            >
              Create
            </button>
            <button
              className="nav-link"
              onClick={() => {
                setPage("upcoming-exams");
                setIsMobileNavOpen(false);
              }}
            >
              View
            </button>
            <button className="nav-link nav-button-danger" onClick={onLogout}>
              Logout
            </button>
          </nav>
          <div className="main-content">
            <header className="header">
              <button
                className={`hamburger ${isMobileNavOpen ? "active" : ""}`}
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                aria-label="Toggle menu"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
              <h1 className="header-title">Timetable Generator</h1>
              <nav className="desktop-nav">
                <button
                  className="nav-link"
                  onClick={() => setPage("dashboard")}
                >
                  Home
                </button>
                <button
                  className="nav-link"
                  onClick={() => setPage("create-exam")}
                >
                  Create
                </button>
                <button
                  className="nav-link"
                  onClick={() => setPage("upcoming-exams")}
                >
                  View
                </button>
                <button
                  className="nav-link nav-button-danger"
                  onClick={onLogout}
                >
                  Logout
                </button>
              </nav>
            </header>
            {renderPage()}
          </div>
        </>
      )}
    </div>
  );
};
const DashboardCard = ({ title, description, onClick, icon }) => (
  <div onClick={onClick} className="dashboard-card">
    <div className="dashboard-card-icon">
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={icon}
        />
      </svg>
    </div>
    <h3 className="dashboard-card-title">{title}</h3>
    <p className="dashboard-card-description">{description}</p>
  </div>
);
const TimetableFolders = ({
  title,
  timetables,
  onEdit,
  onDelete,
  onRefresh,
  onClearAll,
}) => (
  <main className="timetable-folders">
    <div className="timetable-folders-header">
      <h2 className="timetable-folders-title">{title}</h2>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="refresh-button"
          title="Refresh from database"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      )}
      {onClearAll && timetables.length > 0 && (
        <button
          onClick={onClearAll}
          className="refresh-button"
          style={{ background: "#991b1b", borderColor: "#7f1d1d" }}
          title="Clear all timetables (local only)"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear All
        </button>
      )}
    </div>
    <div className="timetable-folders-container">
      {timetables.length > 0 ? (
        <div className="timetable-folders-grid">
          {timetables.map((timetable) => (
            <TimetableFolder
              key={timetable.id}
              timetable={timetable}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <p className="timetable-folders-empty">
          No timetables created yet. Create your first class timetable!
        </p>
      )}
    </div>
  </main>
);

const TimetableFolder = ({ timetable: folder, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!folder || !folder.folderName) return null;
  const firstTimetable = folder.timetables && folder.timetables[0];

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getTimetableMeta = () => {
    if (!firstTimetable) return "Meta unavailable";

    // Handle different data structures
    if (firstTimetable.periods && firstTimetable.days) {
      const days = firstTimetable.days.length;
      const periods = firstTimetable.numHours || firstTimetable.periods.length;
      return `${days} days • ${periods} periods/day`;
    }

    // Handle structure with config
    if (firstTimetable.config) {
      return `${firstTimetable.config.numDays} days • ${firstTimetable.config.periodsPerDay} periods/day`;
    }

    return "Meta unavailable";
  };

  return (
    <div className="timetable-folder">
      <div
        className="timetable-folder-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="timetable-folder-icon">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2z"
            />
          </svg>
        </div>
        <div className="timetable-folder-info">
          <h3 className="timetable-folder-name">{folder.folderName}</h3>
          <p className="timetable-folder-meta">
            {getTimetableMeta()} • Created:{" "}
            {folder.createdAt ? formatDate(folder.createdAt) : "Unknown"}
          </p>
        </div>
        <div className="timetable-folder-actions">
          {firstTimetable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(firstTimetable);
              }}
              className="folder-action-button edit-button"
              title="Edit Timetable"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (firstTimetable) onDelete(firstTimetable.id);
            }}
            className="folder-action-button delete-button"
            title="Delete Timetable"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <div className="timetable-folder-chevron">
          <svg
            className={`h-5 w-5 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {isExpanded && firstTimetable && (
        <div className="timetable-folder-content">
          <div className="timetable-preview">
            {firstTimetable.periods && firstTimetable.days ? (
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {firstTimetable.days.map((day) => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {firstTimetable.periods.slice(0, 4).map((period, pIndex) => (
                    <tr key={pIndex}>
                      <td>{period.time}</td>
                      {firstTimetable.days.map((day) => (
                        <td key={`${pIndex}-${day}`}>{period.subjects[day]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : firstTimetable.config && firstTimetable.data ? (
              // Handle data structure with config
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {Object.keys(firstTimetable.data)
                      .slice(0, 5)
                      .map((day) => (
                        <th key={day}>{day}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {firstTimetable.data[Object.keys(firstTimetable.data)[0]]
                    .slice(0, 4)
                    .map((period, pIndex) => (
                      <tr key={pIndex}>
                        <td>
                          {firstTimetable.times && firstTimetable.times[pIndex]
                            ? firstTimetable.times[pIndex]
                            : `Period ${pIndex + 1}`}
                        </td>
                        {Object.keys(firstTimetable.data)
                          .slice(0, 5)
                          .map((day) => (
                            <td key={`${pIndex}-${day}`}>
                              {firstTimetable.data[day][pIndex]}
                            </td>
                          ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p>Unable to display preview - data format not recognized</p>
            )}
            {firstTimetable.periods && firstTimetable.periods.length > 4 && (
              <p className="preview-more">
                ... and {firstTimetable.periods.length - 4} more periods
              </p>
            )}
            {firstTimetable.data &&
              firstTimetable.data[Object.keys(firstTimetable.data)[0]] &&
              firstTimetable.data[Object.keys(firstTimetable.data)[0]].length >
                4 && (
                <p className="preview-more">
                  ... and{" "}
                  {firstTimetable.data[Object.keys(firstTimetable.data)[0]]
                    .length - 4}{" "}
                  more periods
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
const TimetableGenerator = ({
  onSaveTimetable,
  editingTimetable,
  onUpdateTimetable,
  dispatch,
}) => {
  const [config, setConfig] = useState({
    tableName: "IV B.Tech AIDS",
    numDays: 5,
    periodsPerDay: 7,
    startTime: "08:30",
    periodDuration: 50,
    breakAfterPeriod: 2,
    breakDuration: 20,
    lunchAfterPeriod: 4,
    lunchDuration: 50,
    subjectsArray: [
      {
        name: "Mathematics",
        periodsPerDay: 2,
        periodsPerWeek: 3,
        staffName: "Mr. Smith",
      },
      {
        name: "Physics",
        periodsPerDay: 1,
        periodsPerWeek: 4,
        staffName: "Ms. Johnson",
      },
      {
        name: "Chemistry",
        periodsPerDay: 2,
        periodsPerWeek: 2,
        staffName: "Dr. Brown",
      },
    ],
  });
  const [timetable, setTimetable] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [courseDetails, setCourseDetails] = useState([]);
  const [hours, setHours] = useState([]);
  const [times, setTimes] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editingLegendCell, setEditingLegendCell] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const timetableRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubjectChange = (index, field, value) => {
    const newSubjects = [...config.subjectsArray];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setConfig((prev) => ({ ...prev, subjectsArray: newSubjects }));
  };

  const handleAddSubject = () => {
    setConfig((prev) => ({
      ...prev,
      subjectsArray: [
        ...prev.subjectsArray,
        { name: "", periodsPerDay: "", periodsPerWeek: "", staffName: "" },
      ],
    }));
  };

  const handleRemoveSubject = (index) => {
    setConfig((prev) => ({
      ...prev,
      subjectsArray: prev.subjectsArray.filter((_, i) => i !== index),
    }));
  };

  const generateTimetable = () => {
    try {
      // --- 1. PARSE SUBJECTS ---
      const subjects = config.subjectsArray.map((subject) => ({
        name: subject.name,
        periodsPerDay: parseInt(subject.periodsPerDay),
        timesPerWeek: parseInt(subject.periodsPerWeek),
        teacher: subject.staffName,
      }));

      // Validate each subject
      subjects.forEach((subject, index) => {
        if (!subject.name || !subject.teacher) {
          throw new Error(
            `Subject ${index + 1}: Name and staff name are required`
          );
        }
        if (
          isNaN(subject.periodsPerDay) ||
          isNaN(subject.timesPerWeek) ||
          subject.periodsPerDay < 1 ||
          subject.timesPerWeek < 1
        ) {
          throw new Error(`Subject ${index + 1}: Invalid numbers for periods`);
        }
      });

      // --- 2. VALIDATE ---
      const totalPeriodsNeeded = subjects.reduce(
        (sum, s) => sum + s.periodsPerDay * s.timesPerWeek,
        0
      );
      const totalAvailable = config.numDays * config.periodsPerDay;
      if (totalPeriodsNeeded > totalAvailable) {
        alert(
          `Error: Total periods needed (${totalPeriodsNeeded}) exceeds available slots (${totalAvailable}).`
        );
        return;
      }

      // --- 3. INITIALIZE TIMETABLE DATA ---
      const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].slice(
        0,
        config.numDays
      );
      const timetableData = {};
      weekDays.forEach((day) => {
        timetableData[day] = Array(config.periodsPerDay).fill("FREE");
      });

      // --- 4. PLACE SUBJECTS ---
      subjects.forEach((subject) => {
        const availableDays = [...weekDays];
        for (let t = 0; t < subject.timesPerWeek; t++) {
          if (availableDays.length === 0) break; // No more days available
          const dayIndex = Math.floor(Math.random() * availableDays.length);
          const selectedDay = availableDays.splice(dayIndex, 1)[0];

          // Get free slots on this day
          const freeSlots = [];
          timetableData[selectedDay].forEach((val, idx) => {
            if (val === "FREE") freeSlots.push(idx);
          });

          // Shuffle free slots
          for (let i = freeSlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [freeSlots[i], freeSlots[j]] = [freeSlots[j], freeSlots[i]];
          }

          // Place as many as possible
          const toPlace = Math.min(subject.periodsPerDay, freeSlots.length);
          for (let p = 0; p < toPlace; p++) {
            timetableData[selectedDay][freeSlots[p]] = subject.name;
          }
        }
      });

      // --- 5. CALCULATE TIME SLOTS & STRUCTURE DATA ---
      const weekDaysFull = [
        "MON",
        "TUE",
        "WED",
        "THU",
        "FRI",
        "SAT",
        "SUN",
      ].slice(0, config.numDays);

      const finalPeriods = [];
      const finalTimetable = {};
      weekDaysFull.forEach((day) => (finalTimetable[day] = []));

      const formatTime = (date) =>
        date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

      let currentTimePointer = new Date(`1970-01-01T${config.startTime}:00`);
      let classIndex = 0;
      let breakAdded = false;
      let lunchAdded = false;

      const numTotalSlots =
        config.periodsPerDay +
        (config.breakDuration > 0 ? 1 : 0) +
        (config.lunchDuration > 0 ? 1 : 0);

      for (let i = 0; i < numTotalSlots; i++) {
        if (
          config.breakDuration > 0 &&
          !breakAdded &&
          classIndex === parseInt(config.breakAfterPeriod, 10)
        ) {
          const breakStart = new Date(currentTimePointer.getTime());
          currentTimePointer.setMinutes(
            currentTimePointer.getMinutes() + parseInt(config.breakDuration, 10)
          );
          const breakEnd = new Date(currentTimePointer.getTime());
          weekDaysFull.forEach((day) => finalTimetable[day].push("BREAK"));
          finalPeriods.push({
            time: `${formatTime(breakStart)} to ${formatTime(breakEnd)}`,
            isBreak: true,
          });
          breakAdded = true;
        } else if (
          config.lunchDuration > 0 &&
          !lunchAdded &&
          classIndex === parseInt(config.lunchAfterPeriod, 10)
        ) {
          const lunchStart = new Date(currentTimePointer.getTime());
          currentTimePointer.setMinutes(
            currentTimePointer.getMinutes() + parseInt(config.lunchDuration, 10)
          );
          const lunchEnd = new Date(currentTimePointer.getTime());
          weekDaysFull.forEach((day) => finalTimetable[day].push("LUNCH"));
          finalPeriods.push({
            time: `${formatTime(lunchStart)} to ${formatTime(lunchEnd)}`,
            isBreak: true,
          });

          lunchAdded = true;
        } else if (classIndex < config.periodsPerDay) {
          const periodStart = new Date(currentTimePointer.getTime());
          currentTimePointer.setMinutes(
            currentTimePointer.getMinutes() +
              parseInt(config.periodDuration, 10)
          );
          const periodEnd = new Date(currentTimePointer.getTime());

          weekDaysFull.forEach((day) => {
            finalTimetable[day].push(timetableData[day][classIndex] || "FREE");
          });
          finalPeriods.push({
            time: `${formatTime(periodStart)} to ${formatTime(periodEnd)}`,
            isBreak: false,
          });
          classIndex++;
        }
      }

      setTimetable({
        name: config.tableName,
        days: weekDaysFull,
        periods: finalPeriods,
        data: finalTimetable,
      });
      setTimetableData(finalTimetable);
      setCourseDetails(
        subjects.map((s) => ({ ABB: s.name, NAME: s.name, TEACHER: s.teacher }))
      );
      // Set hours and times
      const hoursArr = [];
      const timesArr = [];
      let hourNum = 1;
      finalPeriods.forEach((p) => {
        timesArr.push(p.time);
        if (p.isBreak) {
          hoursArr.push("");
        } else {
          hoursArr.push(hourNum.toString());
          hourNum++;
        }
      });
      setHours(hoursArr);
      setTimes(timesArr);
    } catch (error) {
      alert(`Error generating timetable: ${error.message}`);
    }
  };

  const handleCellChange = (day, periodIndex, value) => {
    const newData = { ...timetableData };
    newData[day][periodIndex] = value;
    setTimetableData(newData);
  };

  const handleDragStart = (e, day, periodIndex) => {
    setDraggedItem({ day, periodIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, targetDay, targetPeriodIndex) => {
    if (!draggedItem) return;
    e.preventDefault();
    const newData = JSON.parse(JSON.stringify(timetableData));
    const targetValue = newData[targetDay][targetPeriodIndex];
    if (targetValue === "BREAK" || targetValue === "LUNCH") return; // Don't drop on breaks
    const sourceValue = newData[draggedItem.day][draggedItem.periodIndex];
    newData[draggedItem.day][draggedItem.periodIndex] = targetValue;
    newData[targetDay][targetPeriodIndex] = sourceValue;
    setTimetableData(newData);
    setDraggedItem(null);
  };

  const handleLegendCellChange = (courseIndex, field, value) => {
    const newDetails = [...courseDetails];
    newDetails[courseIndex][field] = value;
    setCourseDetails(newDetails);
  };

  const handleAddCourse = () => {
    setCourseDetails((prev) => [...prev, { ABB: "", NAME: "", TEACHER: "" }]);
  };

  const handleDeleteCourse = (index) => {
    setCourseDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = async (type) => {
    if (
      !timetableRef.current ||
      !window.html2canvas ||
      (type === "pdf" && !window.jspdf)
    ) {
      alert(
        "Required libraries for download are not available. Please refresh the page."
      );
      return;
    }

    if (type === "word") {
      const timetableClone = timetableRef.current.cloneNode(true);
      timetableClone
        .querySelectorAll(
          ".download-section, .fullscreen-button, .back-button, .orientation-prompt, .legend-table th:last-child, .legend-table td:last-child, .legend-container .generate-button, .legend-container .download-button, .timetable-header-controls"
        )
        .forEach((el) => el.remove());
      timetableClone
        .querySelectorAll(".cell-input")
        .forEach((input) => (input.parentElement.innerText = input.value));

      const source = `<html><head><meta charset='utf-8'><title>${
        config.tableName
      }</title><style>body{font-family:Arial,sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:center;} th{background-color:#f2f2f2;} .timetable-folder-name{font-size:1.5em;font-weight:bold;text-align:center;margin-bottom:1em;} .legend-container{margin-top:2em;} .legend-title{font-size:1.2em;font-weight:bold;text-align:center;} .break-cell{writing-mode:vertical-rl;text-orientation:mixed;font-weight:bold;background-color:#e0e0e0;}</style></head><body>${timetableClone.innerHTML.replace(
        /style="[^"]*writing-mode[^"]*"/g,
        'class="break-cell"'
      )}</body></html>`;
      const file = new Blob([source], { type: "application/msword" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = `${config.tableName}.doc`;
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }

    const wrapper = timetableRef.current;
    const elementsToHide = wrapper.querySelectorAll(
      ".download-section, .fullscreen-button, .back-button, .orientation-prompt, .legend-table th:last-child, .legend-table td:last-child, .legend-container .generate-button, .legend-container .download-button, .timetable-header-controls"
    );
    const parents = [];
    let current = wrapper.parentElement;
    while (current) {
      const styles = window.getComputedStyle(current);
      if (
        styles.overflow !== "visible" ||
        styles.overflowX !== "visible" ||
        styles.overflowY !== "visible"
      ) {
        parents.push(current);
      }
      current = current.parentElement;
    }

    const originalStyles = new Map();
    const storeStyle = (el, props) => {
      if (!el) return;
      const styles = {};
      props.forEach((prop) => (styles[prop] = el.style[prop]));
      originalStyles.set(el, styles);
    };

    // Store original styles
    storeStyle(wrapper, [
      "overflow",
      "height",
      "maxHeight",
      "width",
      "boxSizing",
    ]);
    parents.forEach((p) =>
      storeStyle(p, ["overflow", "overflowX", "overflowY", "height", "width"])
    );
    elementsToHide.forEach((el) => storeStyle(el, ["display"]));

    // Apply styles for full capture
    if (wrapper) {
      wrapper.style.overflow = "visible";
      wrapper.style.height = "auto";
      wrapper.style.maxHeight = "none";
      wrapper.style.width = "100%";
      wrapper.style.boxSizing = "border-box";
    }

    // Fix parent overflow
    parents.forEach((p) => {
      p.style.overflow = "visible";
      p.style.overflowX = "visible";
      p.style.overflowY = "visible";
      p.style.height = "auto";
      p.style.width = "auto";
    });

    // Hide unnecessary elements
    elementsToHide.forEach((el) => (el.style.display = "none"));

    // Also ensure table container has proper styles
    const tableContainer = wrapper.querySelector(".timetable-table-container");
    if (tableContainer) {
      tableContainer.style.overflow = "visible";
      tableContainer.style.width = "100%";
      tableContainer.style.margin = "0";
      tableContainer.style.padding = "0";
    }

    const table = wrapper.querySelector(".timetable-table-static");
    if (table) {
      table.style.width = "100%";
      table.style.tableLayout = "auto";
      table.style.minWidth = "auto";
    }

    // Ensure all table cells display properly
    const tableCells = wrapper.querySelectorAll(
      ".timetable-table-static th, .timetable-table-static td"
    );
    tableCells.forEach((cell) => {
      cell.style.minWidth = "auto";
      cell.style.whiteSpace = "normal";
    });

    // Reduce wrapper padding for capture
    const originalWrapperPadding = wrapper.style.padding;
    wrapper.style.padding = "0.5rem";

    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // Get the actual width and height of just the content (table + legend)
      const tableElement = wrapper.querySelector(".timetable-table-container");
      const legendElement = wrapper.querySelector(".legend-container");
      const headerElement = wrapper.querySelector(".timetable-header-info");

      let contentWidth = wrapper.offsetWidth;
      let contentHeight = wrapper.offsetHeight;

      // Calculate dimensions more accurately
      if (tableElement) {
        contentWidth = tableElement.scrollWidth || tableElement.offsetWidth;
      }

      // Calculate total height including header and legend with minimal gaps
      let totalHeight = 0;
      if (headerElement) {
        totalHeight += headerElement.scrollHeight || headerElement.offsetHeight;
      }
      if (tableElement) {
        totalHeight += tableElement.scrollHeight || tableElement.offsetHeight;
      }
      if (legendElement) {
        totalHeight += legendElement.scrollHeight || legendElement.offsetHeight;
      }

      // Use calculated dimensions
      contentHeight = totalHeight > 0 ? totalHeight : wrapper.offsetHeight;

      const canvas = await window.html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        logging: false,
      });
      if (type === "png") {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${config.tableName}.png`;
        link.click();
      } else if (type === "pdf") {
        const imgData = canvas.toDataURL("image/png");

        // Determine PDF orientation based on canvas ratio
        const canvasRatio = canvas.width / canvas.height;
        const orientation = canvasRatio > 1 ? "landscape" : "portrait";

        const pdf = new window.jspdf.jsPDF({
          orientation: orientation,
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;

        // Calculate dimensions to fit the PDF while maintaining aspect ratio
        let imgWidth = pdfWidth - 10;
        let imgHeight = imgWidth / ratio;

        // If height exceeds PDF height, scale down both dimensions
        if (imgHeight > pdfHeight - 10) {
          imgHeight = pdfHeight - 10;
          imgWidth = imgHeight * ratio;
        }

        // Add image to PDF (top-left corner with minimal margins)
        const x = 5;
        const y = 5;
        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
        pdf.save(`${config.tableName}.pdf`);
      }
    } catch (error) {
      console.error("Error during canvas capture:", error);
      alert("Failed to create the download file.");
    } finally {
      // Restore original wrapper padding
      wrapper.style.padding = originalWrapperPadding;

      originalStyles.forEach((styles, el) => {
        for (const prop in styles) {
          el.style[prop] = styles[prop];
        }
      });
    }
  };

  const handleSaveLocally = () => {
    if (!timetable || !timetableData) {
      alert("Please generate a timetable first before saving.");
      return;
    }

    const savedTimetable = {
      id: Date.now().toString(),
      folderName: config.tableName,
      timetable,
      timetableData,
      courseDetails,
      config,
      hours,
      times,
      createdAt: new Date().toISOString(),
      timetables: [
        {
          id: Date.now().toString(),
          name: config.tableName,
          data: timetableData,
          courseDetails,
          config,
          hours,
          times,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Get existing saved timetables from localStorage
    const existingTimetables = JSON.parse(
      localStorage.getItem("savedTimetables") || "[]"
    );

    // Check if timetable with same name already exists
    const existingIndex = existingTimetables.findIndex(
      (t) => t.folderName === config.tableName
    );

    if (existingIndex >= 0) {
      // Update existing timetable
      existingTimetables[existingIndex] = savedTimetable;
    } else {
      // Add new timetable
      existingTimetables.push(savedTimetable);
    }

    // Save to localStorage
    localStorage.setItem("savedTimetables", JSON.stringify(existingTimetables));

    // Update the parent component's state if available
    if (onSaveTimetable) {
      onSaveTimetable(savedTimetable);
    }

    alert(
      `Timetable "${config.tableName}" saved successfully! You can view and edit it in the "View" section.`
    );
  };

  const toggleFullScreen = () => {
    let elem = timetable
      ? timetableRef.current
      : document.querySelector(".generator-form-container");
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullScreenChange = () =>
      setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullScreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullScreenChange);
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
      setIsMobile(window.innerWidth <= 768);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    return () => window.removeEventListener("resize", updateOrientation);
  }, []);

  useEffect(() => {
    if (editingTimetable && editingTimetable.timetable) {
      setTimetable(editingTimetable.timetable);
      setTimetableData(
        editingTimetable.timetableData || editingTimetable.timetable.data
      );
      setCourseDetails(editingTimetable.courseDetails || []);
      setConfig(editingTimetable.config || config);
      setHours(editingTimetable.hours || []);
      setTimes(editingTimetable.times || []);
    }
  }, [editingTimetable, config]);

  return (
    <main className="create-exam">
      {!timetable ? (
        <div className="generator-form-container">
          <div className="timetable-header-controls">
            <div></div> {/* Empty div for flex spacing */}
            <h2 className="create-exam-title">Automatic Timetable Generator</h2>
            <button
              onClick={toggleFullScreen}
              className="fullscreen-button"
              title="Toggle Fullscreen"
            >
              {isFullScreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              background: "rgba(251, 191, 36, 0.1)",
              borderRadius: "0.5rem",
              border: "1px solid rgba(251, 191, 36, 0.3)",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                color: "var(--accent-primary)",
                fontSize: "1.1rem",
                fontWeight: "600",
              }}
            >
              How to Use:
            </h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.5rem",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
              }}
            >
              <li>Fill in your class details and schedule preferences.</li>
              <li>
                Add subjects using the table below - specify subject name,
                periods per day, periods per week, and staff name.
              </li>
              <li>Use the "Add Subject" button to add more subjects.</li>
              <li>Click "Generate Timetable" to create your schedule.</li>
              <li>
                You can edit the generated timetable by clicking on any cell.
              </li>
            </ul>
          </div>
          <div className="form-grid">
            <div>
              <label className="form-label" htmlFor="tableName">
                Timetable Name
              </label>
              <input
                type="text"
                id="tableName"
                name="tableName"
                className="form-input"
                value={config.tableName}
                onChange={handleConfigChange}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="numDays">
                Number of Days
              </label>
              <input
                type="number"
                id="numDays"
                name="numDays"
                className="form-input"
                value={config.numDays}
                onChange={handleConfigChange}
                min="1"
                max="7"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="periodsPerDay">
                Periods Per Day (Classes)
              </label>
              <input
                type="number"
                id="periodsPerDay"
                name="periodsPerDay"
                className="form-input"
                value={config.periodsPerDay}
                onChange={handleConfigChange}
                min="1"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="startTime">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                className="form-input"
                value={config.startTime}
                onChange={handleConfigChange}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="periodDuration">
                Period Duration (minutes)
              </label>
              <input
                type="number"
                id="periodDuration"
                name="periodDuration"
                className="form-input"
                value={config.periodDuration}
                onChange={handleConfigChange}
                min="1"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="breakAfterPeriod">
                Break After Period No.
              </label>
              <input
                type="number"
                id="breakAfterPeriod"
                name="breakAfterPeriod"
                className="form-input"
                value={config.breakAfterPeriod}
                onChange={handleConfigChange}
                min="1"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="breakDuration">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                id="breakDuration"
                name="breakDuration"
                className="form-input"
                value={config.breakDuration}
                onChange={handleConfigChange}
                min="0"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="lunchAfterPeriod">
                Lunch After Period No.
              </label>
              <input
                type="number"
                id="lunchAfterPeriod"
                name="lunchAfterPeriod"
                className="form-input"
                value={config.lunchAfterPeriod}
                onChange={handleConfigChange}
                min="1"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="lunchDuration">
                Lunch Duration (minutes)
              </label>
              <input
                type="number"
                id="lunchDuration"
                name="lunchDuration"
                className="form-input"
                value={config.lunchDuration}
                onChange={handleConfigChange}
                min="0"
              />
            </div>
            <div className="full-width">
              <label className="form-label">Subjects</label>
              <div className="subjects-table-container">
                <table className="subjects-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Periods/Day</th>
                      <th>Periods/Week</th>
                      <th>Staff Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.subjectsArray.map((subject, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            value={subject.name}
                            onChange={(e) =>
                              handleSubjectChange(index, "name", e.target.value)
                            }
                            className="subject-input"
                            placeholder="e.g., Mathematics"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={subject.periodsPerDay}
                            onChange={(e) =>
                              handleSubjectChange(
                                index,
                                "periodsPerDay",
                                e.target.value
                              )
                            }
                            className="subject-input"
                            min="1"
                            placeholder="2"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={subject.periodsPerWeek}
                            onChange={(e) =>
                              handleSubjectChange(
                                index,
                                "periodsPerWeek",
                                e.target.value
                              )
                            }
                            className="subject-input"
                            min="1"
                            placeholder="3"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={subject.staffName}
                            onChange={(e) =>
                              handleSubjectChange(
                                index,
                                "staffName",
                                e.target.value
                              )
                            }
                            className="subject-input"
                            placeholder="Mr. Smith"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => handleRemoveSubject(index)}
                            className="remove-subject-btn"
                            title="Remove Subject"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleAddSubject} className="add-subject-btn">
                Add Subject
              </button>
            </div>
          </div>
          <button onClick={generateTimetable} className="generate-button">
            Generate Timetable
          </button>
        </div>
      ) : (
        <div className="create-exam-container">
          <div className="timetable-header-controls">
            <button onClick={() => setTimetable(null)} className="back-button">
              ← Regenerate
            </button>
            <button
              onClick={toggleFullScreen}
              className="fullscreen-button"
              title="Toggle Fullscreen"
            >
              {isFullScreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>

          <div className="timetable-wrapper" ref={timetableRef}>
            <div className="timetable-header-info">
              <h1 className="timetable-folder-name">{timetable.name}</h1>
            </div>

            {isMobile && !isLandscape && (
              <div className="orientation-prompt">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 16v.01M12 4v.01M4 12H2m20 0h-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                  <path d="m10 6 2-2 2 2m-4 12 2 2 2-2" />
                </svg>
                <h3>Please Rotate to Landscape</h3>
                <p>
                  For the best editing experience, please rotate your device to
                  landscape orientation.
                </p>
              </div>
            )}

            {(!isMobile || isLandscape) && (
              <div className="timetable-table-container">
                <div>
                  <table className="timetable-table-static">
                    <thead>
                      <tr>
                        <th>HOUR</th>
                        {hours.map((hour, index) => (
                          <th key={index}>{hour}</th>
                        ))}
                      </tr>
                      <tr>
                        <th>TIME/DAY</th>
                        {times.map((time, index) => (
                          <th key={index}>{time}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.days.map((day, dayIndex) => (
                        <tr key={day}>
                          <td className="day-cell-static">{day}</td>
                          {timetableData[day].map((period, periodIndex) => {
                            if (
                              (period === "BREAK" || period === "LUNCH") &&
                              dayIndex > 0
                            ) {
                              return null; // Rendered by rowspan from first row
                            }
                            return (
                              <td
                                key={periodIndex}
                                className={
                                  period === "BREAK" || period === "LUNCH"
                                    ? "break-cell"
                                    : ""
                                }
                                rowSpan={
                                  period === "BREAK" || period === "LUNCH"
                                    ? timetable.days.length
                                    : 1
                                }
                              >
                                {editingCell &&
                                editingCell.day === day &&
                                editingCell.periodIndex === periodIndex ? (
                                  <input
                                    type="text"
                                    value={period}
                                    onChange={(e) =>
                                      handleCellChange(
                                        day,
                                        periodIndex,
                                        e.target.value
                                      )
                                    }
                                    onBlur={() => setEditingCell(null)}
                                    onKeyPress={(e) =>
                                      e.key === "Enter" && setEditingCell(null)
                                    }
                                    className="cell-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    className={
                                      period !== "BREAK" && period !== "LUNCH"
                                        ? "editable-cell"
                                        : ""
                                    }
                                    draggable={
                                      period !== "BREAK" && period !== "LUNCH"
                                    }
                                    onDragStart={(e) =>
                                      handleDragStart(e, day, periodIndex)
                                    }
                                    onDragOver={handleDragOver}
                                    onDrop={(e) =>
                                      handleDrop(e, day, periodIndex)
                                    }
                                    onClick={() =>
                                      period !== "BREAK" &&
                                      period !== "LUNCH" &&
                                      setEditingCell({ day, periodIndex })
                                    }
                                  >
                                    {period}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="legend-container">
                    <h3 className="legend-title">Course Legend</h3>
                    <table className="legend-table">
                      <thead>
                        <tr>
                          <th>Abbreviation</th>
                          <th>Course Name</th>
                          <th>Course Teacher</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseDetails.map((course, index) => (
                          <tr key={course.ABB || index}>
                            <td>
                              {editingLegendCell &&
                              editingLegendCell.index === index &&
                              editingLegendCell.field === "ABB" ? (
                                <input
                                  type="text"
                                  value={course.ABB}
                                  onChange={(e) =>
                                    handleLegendCellChange(
                                      index,
                                      "ABB",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => setEditingLegendCell(null)}
                                  onKeyPress={(e) =>
                                    e.key === "Enter" &&
                                    setEditingLegendCell(null)
                                  }
                                  className="cell-input"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="editable-cell"
                                  onClick={() =>
                                    setEditingLegendCell({
                                      index,
                                      field: "ABB",
                                    })
                                  }
                                >
                                  {course.ABB}
                                </span>
                              )}
                            </td>
                            <td>
                              {editingLegendCell &&
                              editingLegendCell.index === index &&
                              editingLegendCell.field === "NAME" ? (
                                <input
                                  type="text"
                                  value={course.NAME}
                                  onChange={(e) =>
                                    handleLegendCellChange(
                                      index,
                                      "NAME",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => setEditingLegendCell(null)}
                                  onKeyPress={(e) =>
                                    e.key === "Enter" &&
                                    setEditingLegendCell(null)
                                  }
                                  className="cell-input"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="editable-cell"
                                  onClick={() =>
                                    setEditingLegendCell({
                                      index,
                                      field: "NAME",
                                    })
                                  }
                                >
                                  {course.NAME}
                                </span>
                              )}
                            </td>
                            <td>
                              {editingLegendCell &&
                              editingLegendCell.index === index &&
                              editingLegendCell.field === "TEACHER" ? (
                                <input
                                  type="text"
                                  value={course.TEACHER}
                                  onChange={(e) =>
                                    handleLegendCellChange(
                                      index,
                                      "TEACHER",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => setEditingLegendCell(null)}
                                  onKeyPress={(e) =>
                                    e.key === "Enter" &&
                                    setEditingLegendCell(null)
                                  }
                                  className="cell-input"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="editable-cell"
                                  onClick={() =>
                                    setEditingLegendCell({
                                      index,
                                      field: "TEACHER",
                                    })
                                  }
                                >
                                  {course.TEACHER}
                                </span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => handleDeleteCourse(index)}
                                className="folder-action-button delete-button"
                                title="Delete Course"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button
                      onClick={handleAddCourse}
                      className="generate-button"
                      style={{
                        marginTop: "1rem",
                        width: "auto",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Add Course
                    </button>
                    {isFullScreen && (
                      <button
                        onClick={() => handleDownload("png")}
                        className="download-button download-button-image"
                        style={{
                          marginTop: "1rem",
                          marginLeft: "1rem",
                        }}
                        title="Download Image"
                      >
                        📷 Download Image
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="download-section">
            <button
              onClick={() => handleDownload("word")}
              className="download-button"
            >
              Download Word
            </button>
            <button
              onClick={() => handleDownload("png")}
              className="download-button download-button-image"
            >
              Download Image
            </button>
            <button
              onClick={() => handleDownload("pdf")}
              className="download-button download-button-pdf"
            >
              Download PDF
            </button>
            <button
              onClick={handleSaveLocally}
              className="download-button download-button-image"
            >
              Save Locally
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Homepage;
