/* eslint-disable no-undef */
// StaffDashboard.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { supabaseAuth as auth } from "../supabase";
import {
  fetchStaffData,
  fetchStudentData,
  updateStaffData,
  updateStaffStats,
  fetchAllStudents,
  fetchTasks,
  saveTasks,
  fetchTaskStatuses,
  fetchAssignments,
  subscribeToAssignments,
  addAssignment,
  deleteAssignment,
  fetchSubmission,
  saveMarks,
  fetchSettings,
  saveSettings,
  calculateAndStoreOverallPerformance,
  resetAllStreaksToZero,
  deleteUnknownStudents,
  subscribeToStaff,
  sendMessage,
  markMessagesAsRead,
  subscribeToMessages,
} from "../supabase";
import Sidebar from "../components/Sidebar";
import Chatbot from "../components/Chatbot";
import TaskItem from "../components/TaskItem";
import GuideModal from "../components/GuideModal";
import StudentMonitor from "../components/StudentMonitor";
import Notification from "../components/Notification";
import Timetable from "../components/Timetable";
import "../styles/Dashboard.css";
import "../styles/StaffInteraction.css";
import "../styles/Chat.css";
import "../styles/Youtube.css";
import "../staff/StaffDashboardComponents.js";
import "../staff/StaffDashboardUtils.js";
import "../staff/StaffDashboardViews.js";

// --- Import Refactored Parts ---
import {
  ErrorBoundary,
  ChatInterface,
} from "../staff/StaffDashboardComponents";
import {
  LANGUAGES,
  API_KEY,
  resolveChannelId,
  CHANNELS,
  CATEGORY_LIST,
  loadingIcons,
} from "../staff/StaffDashboardUtils";
import {
  DefaultContent,
  MobileChatbotContainer,
  TasksContainer,
  AssignmentsContainer,
  ResultsContainer,
  MonitorContainer,
  StaffInteractionContainer,
  QuickStatsContainer,
  YoutubeControllerContainer,
  SettingsContainer,
  AboutContainer,
  TimetableCreatorContainer,
} from "../staff/StaffDashboardViews";

// --- Main Component ---
const StaffDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- State Definitions ---
  const [userData, setUserData] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [mobileHamburger, setMobileHamburger] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState({
    dashboard: true,
    assignments: false,
    tasks: false,
    students: true,
    analytics: false,
    messages: false,
    minLoadTime: true,
  });
  const [notifications, setNotifications] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [showContactList, setShowContactList] = useState(true);
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quickStats, setQuickStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    overallPerformance: 0,
  });
  const [performanceTab, setPerformanceTab] = useState("completed");
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);
  const [filterType, setFilterType] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newAssignmentSubject, setNewAssignmentSubject] = useState("");
  const [newAssignmentLink, setNewAssignmentLink] = useState("");
  const [newAssignmentDeadline, setNewAssignmentDeadline] = useState("");
  const [newAssignmentDeadlineTime, setNewAssignmentDeadlineTime] =
    useState("23:59");
  const [latestActivity, setLatestActivity] = useState(null);
  const [showMarkingUI, setShowMarkingUI] = useState(false);
  const [selectedStudentForMarking, setSelectedStudentForMarking] =
    useState("");
  const [selectedAssignmentForMarking, setSelectedAssignmentForMarking] =
    useState("");
  const [assignmentMarks, setAssignmentMarks] = useState("");
  const [userNames, setUserNames] = useState({});
  const [showAbout, setShowAbout] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [unreadMessageCounts, setUnreadMessageCounts] = useState({});
  const [taskStatusByStudent, setTaskStatusByStudent] = useState({});
  const [youtubeSettings, setYoutubeSettings] = useState({
    defaultLanguage: "ta",
    defaultCategory: "all",
    defaultChannelIds: [],
    channels: CHANNELS,
  });
  const [youtubeSettingsLoading, setYoutubeSettingsLoading] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelLanguage, setNewChannelLanguage] = useState("ta");
  const [newChannelCategory, setNewChannelCategory] = useState("");
  const [showConfigureSection, setShowConfigureSection] = useState(true);
  const [showAddChannelSection, setShowAddChannelSection] = useState(false);
  const [currentIcon, setCurrentIcon] = React.useState(0);
  const [iconDirection, setIconDirection] = React.useState(1);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState({});

  // --- Logic and Handler Functions ---

  useEffect(() => {
    if (!selectedStudentForMarking || !selectedAssignmentForMarking) {
      setCurrentSubmission(null);
      return;
    }

    console.log(
      `Fetching submission: students/${selectedStudentForMarking}/submissions/${selectedAssignmentForMarking}`
    );

    // Fetch submission using Supabase
    const fetchCurrentSubmission = async () => {
      try {
        const submission = await fetchSubmission(
          selectedStudentForMarking,
          selectedAssignmentForMarking
        );
        if (submission) {
          console.log("Submission found:", submission);
          setCurrentSubmission(submission);
        } else {
          console.log("No submission found for this student/assignment.");
          setCurrentSubmission(null);
        }
      } catch (error) {
        console.error("Error fetching submission:", error);
        setCurrentSubmission(null);
      }
    };

    fetchCurrentSubmission();

    return () => {
      // No cleanup needed for one-time fetch
    };
  }, [selectedStudentForMarking, selectedAssignmentForMarking]);

  const addNotification = useCallback((message, type = "info") => {
    setNotifications((prev) => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const isValidDriveLink = (url) => {
    return /^https:\/\/(drive\.google\.com|docs\.google\.com)/.test(url);
  };

  const fetchUserNames = useCallback(
    async (idsToFetch, currentStaffId) => {
      const newNamesMap = {};
      const allIds = [...new Set(idsToFetch)];

      try {
        const promises = allIds.map((id) => fetchStudentData(id));
        const students = await Promise.all(promises);

        students.forEach((student, index) => {
          const id = allIds[index];
          if (student) {
            newNamesMap[id] = student.name || "Anonymous";
          } else {
            newNamesMap[id] = "Anonymous";
          }
        });

        setUserNames((prevNames) => ({ ...prevNames, ...newNamesMap }));
      } catch (e) {
        console.error("Error fetching user names:", e);
        addNotification("Failed to load some user names.", "error");
      }
    },
    [addNotification] // Removed userNames from dependencies
  );


  const loadUnreadMessages = useCallback(async () => {
    try {
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) return;

      // For now, set empty unread counts - messaging will be implemented later
      setUnreadMessageCounts({});
    } catch (error) {
      console.error("Error counting unread messages:", error);
    }
  }, [studentStats]);

  // --- useEffect Hooks ---

  useEffect(() => {
    const fetchInitialDashboardData = async () => {
      setLoading((prev) => ({ ...prev, dashboard: true, students: true }));
      try {
        const user = auth.currentUser;
        if (!user) {
          addNotification(
            "No authenticated user. Redirecting to login.",
            "error"
          );
          navigate("/staff-login");
          return;
        }
        const staffData = await fetchStaffData(user.uid);
        if (!staffData) {
          addNotification(
            "Staff profile not found. Redirecting to form.",
            "error"
          );
          navigate("/staff-form");
          return;
        }
        if (!staffData.formFilled) {
          navigate("/staff-form");
          return;
        }
        setUserData(staffData);
        try {
          const cachedStudents = localStorage.getItem(
            "staffDashboard_students"
          );
          const cachedUserNames = localStorage.getItem(
            "staffDashboard_userNames"
          );
          if (cachedStudents) {
            const parsedStudents = JSON.parse(cachedStudents);
            setStudentStats(parsedStudents.sort((a, b) => b.streak - a.streak));
            setQuickStats((prev) => ({
              ...prev,
              totalStudents: parsedStudents.length,
            }));
          }
          if (cachedUserNames) {
            setUserNames(JSON.parse(cachedUserNames));
          }
        } catch (cacheError) {
          console.warn("Cache loading failed:", cacheError);
        }
        const allStudents = await fetchAllStudents();
        const filteredStudents = allStudents.filter(
          (student) =>
            student.name &&
            student.name.trim() !== "" &&
            student.name !== "Unknown"
        );
        setStudentStats(
          filteredStudents.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        );
        setQuickStats((prev) => ({
          ...prev,
          totalStudents: filteredStudents.length,
        }));
        // Removed localStorage caching to avoid quota exceeded errors
        setLoading((prev) => ({ ...prev, students: false }));
        const studentIds = allStudents.map((s) => s.id);
        if (studentIds.length > 0) {
          fetchUserNames(studentIds, user.uid)
            .then(() => {
              try {
                localStorage.setItem(
                  "staffDashboard_userNames",
                  JSON.stringify(userNames)
                );
              } catch (cacheError) {
                console.warn("Failed to cache user names:", cacheError);
              }
            })
            .catch((err) =>
              console.warn("Non-critical: Failed to load user names:", err)
            );
        }
        setLoading((prev) => ({ ...prev, dashboard: false }));
        setTimeout(() => {
          setLoading((prev) => ({ ...prev, minLoadTime: false }));
        }, 1500);

        // Load tasks automatically on mount
        loadTasksIfNeeded();

        // --- OPTIMIZATION ---
        // Run the calculation *after* fetching all student data.
        setTimeout(async () => {
          try {
            await calculateAndStoreOverallPerformance(
              allStudents,
              user.uid,
              tasks
            );
          } catch (error) {
            console.warn("Background operations failed:", error);
          }
        }, 100);
      } catch (err) {
        console.error("Error fetching initial dashboard data:", err);
        addNotification(
          "Failed to load dashboard data: " + err.message,
          "error"
        );
        setLoading((prev) => ({ ...prev, dashboard: false, students: false }));
      }
    };
    fetchInitialDashboardData();
  }, [navigate, addNotification, fetchUserNames]);

  useEffect(() => {
    const refreshStudentStats = async () => {
      try {
        const allStudents = await fetchAllStudents();
        const filteredStudents = allStudents.filter(
          (student) =>
            student.name &&
            student.name.trim() !== "" &&
            student.name !== "Unknown"
        );
        setStudentStats(
          filteredStudents.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        );

        // --- OPTIMIZATION ---
        // Recalculate performance when stats are refreshed
        await calculateAndStoreOverallPerformance(
          allStudents,
          auth.currentUser?.uid,
          tasks
        );
      } catch (error) {
        console.error("Error refreshing student stats:", error);
      }
    };
    const interval = setInterval(refreshStudentStats, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchOverallStats = async () => {
      try {
        const staffData = await fetchStaffData(user.uid);
        if (staffData) {
          const data = staffData;
          const stats = data.stats || {};
          setQuickStats((prev) => ({
            ...prev,
            overallPerformance: stats.overallPercentage || 0,
            activeStudents: stats.activeStudents || 0,
          }));
        }
      } catch (error) {
        console.error("Error fetching overall stats:", error);
      }
    };
    fetchOverallStats();
    // Listen to current user's staff document
    const unsub = subscribeToStaff(user.uid, (staffData) => {
      if (staffData) {
        const data = staffData;
        const stats = data.stats || {};
        setQuickStats((prev) => ({
          ...prev,
          totalStudents: stats.totalStudents || studentStats.length || 0,
          overallPerformance: stats.overallPercentage || 0,
          activeStudents: stats.activeStudents || 0,
        }));
      }
    });
    return () => unsub();
  }, []);

  const loadTasksIfNeeded = useCallback(async () => {
    if (loading.tasks || tasks.length > 0) return;
    setLoading((prev) => ({ ...prev, tasks: true }));
    try {
      const currentStaffId = auth.currentUser?.uid;
      if (!currentStaffId) {
        setTasks([]);
        setLoading((prev) => ({ ...prev, tasks: false }));
        return;
      }

      const allTasks = await fetchTasks();
      if (!allTasks || allTasks.length === 0) {
        setTasks([]);
        setLoading((prev) => ({ ...prev, tasks: false }));
        return;
      }

      const staffTasks = allTasks
        .filter((task) => task.staffId === currentStaffId || task.staff_id === currentStaffId)
        .map((task) => ({
          ...task,
          date:
            task.date ||
            (task.postedAt?.toDate
              ? task.postedAt.toDate().toLocaleDateString()
              : new Date().toLocaleDateString()),
          subject: task.subject || "General",
        }));
      setTasks(staffTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      addNotification("Failed to load tasks: " + error.message, "error");
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, [loading.tasks, tasks.length, addNotification]);

  // --- OPTIMIZATION ---
  // This is the new "lazy-loading" function for student task progress.
  const loadStudentTaskProgress = useCallback(async () => {
    // If data is already loaded or loading, don't fetch again.
    if (Object.keys(taskStatusByStudent).length > 0 || loading.analytics)
      return;

    setLoading((prev) => ({ ...prev, analytics: true }));
    const allStatuses = {};

    // Use Promise.all for parallel fetches
    const promises = studentStats.map(async (student) => {
      try {
        const studentTaskStatuses = await fetchTaskStatuses(student.id);
        const map = {};
        studentTaskStatuses.forEach((status) => {
          map[status.task_id] = status;
        });
        allStatuses[student.id] = map;
      } catch (e) {
        console.warn("Failed to load task status for", student.id, e);
        allStatuses[student.id] = {}; // Ensure student key exists
      }
    });

    await Promise.all(promises);

    setTaskStatusByStudent(allStatuses);
    setLoading((prev) => ({ ...prev, analytics: false }));
  }, [studentStats, taskStatusByStudent, loading.analytics]);

  // --- OPTIMIZATION ---
  // This useEffect (was line 448) is now DELETED.
  // We no longer attach N listeners.
  /*
  useEffect(() => {
    if (loading.students || loading.tasks) return;
    ...
    DELETED
    ...
  }, [studentStats, loading.students, loading.tasks]);
  */

  const loadAssignmentsData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, assignments: true }));
    const user = auth.currentUser;
    if (!user) {
      addNotification("User not authenticated for assignments.", "error");
      setLoading((prev) => ({ ...prev, assignments: false }));
      return;
    }
    try {
      const allAssignments = await fetchAssignments();
      // Check if allAssignments is valid
      if (!allAssignments || !Array.isArray(allAssignments)) {
        console.warn("fetchAssignments returned invalid data:", allAssignments);
        setAssignments([]);
        setLoading((prev) => ({ ...prev, assignments: false }));
        return;
      }
      const staffAssignments = allAssignments.filter(
        (assignment) => assignment.staff_id === user.uid || assignment.staffId === user.uid
      );
      setAssignments(staffAssignments);
      setLoading((prev) => ({ ...prev, assignments: false }));
    } catch (err) {
      console.error("Error fetching assignments:", err);
      addNotification("Failed to load assignments: " + err.message, "error");
      setAssignments([]);
      setLoading((prev) => ({ ...prev, assignments: false }));
    }
  }, [addNotification]);

  useEffect(() => {
    if (userData) {
      loadAssignmentsData();
    }
  }, [userData, loadAssignmentsData]);

  // Fetch all student submissions for all assignments
  useEffect(() => {
    if (
      !auth.currentUser ||
      assignments.length === 0 ||
      studentStats.length === 0
    )
      return;

    const unsubscribers = [];

    // Fetch all submissions instead of subscribing
    const fetchAllSubmissions = async () => {
      for (const assignment of assignments) {
        for (const student of studentStats) {
          try {
            const submission = await fetchSubmission(student.id, assignment.id);
            const key = `${assignment.id}_${student.id}`;
            if (submission) {
              setAssignmentSubmissions((prev) => ({
                ...prev,
                [key]: {
                  ...submission,
                  studentId: student.id,
                  assignmentId: assignment.id,
                },
              }));
            } else {
              setAssignmentSubmissions((prev) => {
                const newState = { ...prev };
                delete newState[key];
                return newState;
              });
            }
          } catch (error) {
            console.error(`Error fetching submission for ${student.id}:`, error);
          }
        }
      }
    };

    fetchAllSubmissions();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [assignments, studentStats]);


  const loadYoutubeSettings = useCallback(async () => {
    try {
      const settings = await fetchSettings('youtube');
      if (settings) {
        setYoutubeSettings({
          defaultLanguage: settings.defaultLanguage || "ta",
          defaultCategory: settings.defaultCategory || "all",
          defaultChannelIds: settings.defaultChannelIds || [],
          channels: settings.channels || CHANNELS,
        });
      }
    } catch (error) {
      console.error("Error loading YouTube settings:", error);
      addNotification("Failed to load YouTube settings", "error");
    }
  }, [addNotification]);

  const saveYoutubeSettings = useCallback(
    async (settings) => {
      setYoutubeSettingsLoading(true);
      try {
        await saveSettings("youtube", {
          ...settings,
          updatedBy: auth.currentUser?.uid,
          updated_by: auth.currentUser?.uid,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setYoutubeSettings(settings);
        addNotification("YouTube settings updated successfully", "success");
      } catch (error) {
        console.error("Error saving YouTube settings:", error);
        addNotification(
          "Failed to save YouTube settings: " + error.message,
          "error"
        );
      } finally {
        setYoutubeSettingsLoading(false);
      }
    },
    [addNotification]
  );

  const addNewChannel = useCallback(async () => {
    if (
      !newChannelId.trim() ||
      !newChannelName.trim() ||
      !newChannelCategory.trim()
    ) {
      addNotification("Please fill all fields", "error");
      return;
    }
    const resolvedId = await resolveChannelId(newChannelId.trim());
    if (youtubeSettings.channels.some((c) => c.id === resolvedId)) {
      addNotification("Channel ID already exists", "error");
      return;
    }
    const newChannel = {
      id: resolvedId,
      name: newChannelName.trim(),
      category: newChannelCategory.trim(),
      language: newChannelLanguage,
    };
    const updatedChannels = [...youtubeSettings.channels, newChannel];
    const updatedSettings = { ...youtubeSettings, channels: updatedChannels };
    await saveYoutubeSettings(updatedSettings);
    setNewChannelId("");
    setNewChannelName("");
    setNewChannelCategory("");
    setNewChannelLanguage("ta");
  }, [
    newChannelId,
    newChannelName,
    newChannelCategory,
    newChannelLanguage,
    youtubeSettings,
    saveYoutubeSettings,
    addNotification,
  ]);

  const deleteChannel = useCallback(
    async (channelId) => {
      const updatedChannels = youtubeSettings.channels.filter(
        (c) => c.id !== channelId
      );
      const updatedSettings = { ...youtubeSettings, channels: updatedChannels };
      await saveYoutubeSettings(updatedSettings);
      addNotification("Channel deleted successfully", "success");
    },
    [youtubeSettings, saveYoutubeSettings, addNotification]
  );

  useEffect(() => {
    loadYoutubeSettings();
  }, [loadYoutubeSettings]);

  useEffect(() => {
    // --- OPTIMIZATION ---
    // This calculation now depends on `taskStatusByStudent`,
    // which is lazy-loaded. It will be empty initially, and
    // will auto-recalculate when the state is populated.
    if (loading.students || loading.tasks) {
      return;
    }
    const compute = () => {
      const validStudents = studentStats.filter(
        (student) =>
          student.name &&
          student.name.trim() !== "" &&
          student.name !== "Anonymous" &&
          student.name !== "Unknown" &&
          student.name !== "Unknown User"
      );
      const resultsData = validStudents.map((student) => {
        let completedCount = 0;
        // Check if status for this student has been loaded
        if (taskStatusByStudent[student.id]) {
          for (const task of tasks) {
            const status = taskStatusByStudent[student.id]?.[task.id];
            const isCompleted =
              (status && status.completed === true) ||
              (Array.isArray(task.completedBy) &&
                task.completedBy.includes(student.id));
            if (isCompleted) completedCount++;
          }
        }
        return {
          id: student.id,
          name: student.name || "Anonymous",
          completedTasks: completedCount,
          totalTasks: tasks.length,
          streak: student.streak || 0,
          // Use the master progress from the student doc.
          // This is more reliable and syncs with the fix in StudentDashboard.
          progress: student.progress || 0,
        };
      });
      const sortedResultsData = resultsData.sort((a, b) => {
        return b.progress - a.progress;
      });
      setResults(sortedResultsData);
    };
    compute();
  }, [
    tasks,
    studentStats,
    taskStatusByStudent, // This is the key change
    loading.students,
    loading.tasks,
  ]);

  // Calculate and store overall performance when studentStats or tasks change
  useEffect(() => {
    const user = auth.currentUser;
    if (
      !user ||
      loading.students ||
      loading.tasks ||
      studentStats.length === 0
    ) {
      return;
    }

    const updatePerformance = async () => {
      try {
        await calculateAndStoreOverallPerformance(
          studentStats,
          user.uid,
          tasks
        );
      } catch (error) {
        console.error("Error updating overall performance:", error);
      }
    };

    updatePerformance();
  }, [studentStats, tasks, loading.students, loading.tasks]);

  useEffect(() => {
    setLatestActivity("Monitor fetch is temporarily disabled.");
  }, []);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("hasSeenStaffGuide");
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem("hasSeenStaffGuide", "true");
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsChatbotOpen(!mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setMessages([]);
      return;
    }
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId) return;

    // Use Supabase subscribeToMessages
    const unsubscribe = subscribeToMessages(
      selectedStudentId,
      "staff",
      setMessages
    );

    return () => unsubscribe();
  }, [
    selectedStudentId,
  ]);


  useEffect(() => {
    if (studentStats.length === 0) return;
    loadUnreadMessages();
    const interval = setInterval(loadUnreadMessages, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [studentStats, loadUnreadMessages]);

  const sendStaffMessage = useCallback(async () => {
    try {
      const input = document.getElementById("staff-message-input");
      const text = input?.value.trim();
      if (!text || !selectedStudentId) {
        addNotification(
          "Please select a student and type a message.",
          "warning"
        );
        return;
      }
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) {
        addNotification("User not authenticated to send message.", "error");
        return;
      }

      await sendMessage(text, selectedStudentId, "staff");
      if (input) input.value = "";
      addNotification("Message sent successfully!", "success");
    } catch (err) {
      console.error("Error sending message:", err);
      addNotification("Failed to send message: " + err.message, "error");
    }
  }, [selectedStudentId, addNotification]);

  const deleteMessage = useCallback(
    async (originalIndex) => {
      // TODO: Implement with Supabase
      console.warn("Delete message not yet implemented with Supabase");
      addNotification("Delete message feature coming soon", "info");
    },
    [addNotification]
  );

  const postAssignment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        addNotification(
          "No authenticated user. Cannot post assignment.",
          "error"
        );
        return;
      }

      const staffData = await fetchStaffData(user.uid);
      if (!staffData || !staffData.formFilled) {
        addNotification("Staff profile incomplete or not found.", "error");
        return;
      }

      if (!newAssignmentSubject.trim()) {
        addNotification("Please enter assignment subject.", "warning");
        return;
      }
      if (newAssignmentLink.trim() && !isValidDriveLink(newAssignmentLink)) {
        addNotification(
          "Please enter a valid Google Drive or Google Docs link.",
          "warning"
        );
        return;
      }

      let deadlineISO = null;
      if (newAssignmentDeadline) {
        const deadlineDateTime = newAssignmentDeadlineTime
          ? `${newAssignmentDeadline}T${newAssignmentDeadlineTime}:00`
          : `${newAssignmentDeadline}T23:59:00`;
        const deadlineDate = new Date(deadlineDateTime);
        if (isNaN(deadlineDate.getTime())) {
          addNotification("Invalid deadline date/time provided.", "warning");
          return;
        }
        deadlineISO = deadlineDate.toISOString();
      }

      const newAssignmentData = {
        subject: newAssignmentSubject.trim(),
        driveLink: newAssignmentLink.trim(),
        drive_link: newAssignmentLink.trim(),
        staffId: user.uid,
        staff_id: user.uid,
        staffName: staffData.name || "Staff",
        staff_name: staffData.name || "Staff",
        postedAt: new Date().toISOString(),
        posted_at: new Date().toISOString(),
        deadline: deadlineISO,
        isPublic: true,
        is_public: true,
      };

      await addAssignment(newAssignmentData);
      addNotification("Assignment posted successfully!", "success");

      setNewAssignmentSubject("");
      setNewAssignmentLink("");
      setNewAssignmentDeadline("");
      setNewAssignmentDeadlineTime("23:59");
    } catch (err) {
      console.error("Error posting assignment:", err);
      addNotification("Failed to post assignment: " + err.message, "error");
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      if (
        !window.confirm(
          "Are you sure you want to delete this assignment? This action cannot be undone."
        )
      )
        return;
      await deleteAssignment(assignmentId);
      addNotification("Assignment deleted successfully!", "success");
    } catch (err) {
      console.error("Error deleting assignment:", err);
      addNotification("Failed to delete assignment: " + err.message, "error");
    }
  };

  const handleSendMarks = async () => {
    if (
      !selectedStudentForMarking ||
      !selectedAssignmentForMarking ||
      !assignmentMarks.trim()
    ) {
      addNotification(
        "Please select student, assignment, and enter marks.",
        "warning"
      );
      return;
    }
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId) {
      addNotification("User not authenticated to send marks.", "error");
      return;
    }
    const selectedAssignmentDetails = assignments.find(
      (a) => a.id === selectedAssignmentForMarking
    );
    try {
      await saveMarks(
        selectedStudentForMarking,
        selectedAssignmentForMarking,
        {
          marks: assignmentMarks.trim(),
          assignmentSubject: selectedAssignmentDetails?.subject || "N/A",
          assignment_subject: selectedAssignmentDetails?.subject || "N/A",
          assignmentId: selectedAssignmentForMarking,
          assignment_id: selectedAssignmentForMarking,
          staffId: staffUserId,
          staff_id: staffUserId,
          staffName: userData?.name || userNames[staffUserId] || "Staff",
          staff_name: userData?.name || userNames[staffUserId] || "Staff",
          markedAt: new Date().toISOString(),
          marked_at: new Date().toISOString(),
        }
      );
      addNotification("Marks sent successfully!", "success");
      setSelectedStudentForMarking("");
      setSelectedAssignmentForMarking("");
      setAssignmentMarks("");
    } catch (err) {
      console.error("Error sending marks:", err);
      addNotification(`Failed to send marks: ${err.message}`, "error");
    }
  };

  const handleEditProfile = () => {
    navigate("/staff-form", { state: { isEdit: true, userData } });
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (err) {
      console.error("Error logging out:", err);
      addNotification("Failed to log out.", "error");
    }
  };

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  const isDashboardLoading =
    loading.minLoadTime || loading.dashboard || loading.students;

  useEffect(() => {
    if (!isDashboardLoading) return;
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % loadingIcons.length);
      setIconDirection((prev) => -prev);
    }, 240);
    return () => clearInterval(interval);
  }, [isDashboardLoading]);

  // --- OPTIMIZATION ---
  // We must update toggleContainer to call our new lazy-load function.
  const toggleContainer = useCallback(
    (containerId, filterType = null) => {
      const newActiveContainer =
        activeContainer === containerId ? null : containerId;
      setActiveContainer(newActiveContainer);
      if (filterType) {
        setFilterType(filterType);
      }
      if (newActiveContainer === "tasks-container") {
        loadTasksIfNeeded();
      }

      // --- This is the new logic ---
      if (
        newActiveContainer === "quick-stats-container" ||
        newActiveContainer === "results-container"
      ) {
        loadStudentTaskProgress();
      }
      // --- End new logic ---

      if (isMobile && sidebarVisible) {
        setSidebarVisible(false);
      }
    },
    [
      activeContainer,
      isMobile,
      sidebarVisible,
      loadTasksIfNeeded,
      loadStudentTaskProgress,
    ] // Add new dependency
  );

  const toggleSidebar = useCallback(() => {
    setSidebarVisible((prev) => !prev);
  }, []);

  const postTask = useCallback(async () => {
    try {
      const taskTopicInput = document.getElementById("task-topic");
      const taskSubtopicInput = document.getElementById("task-subtopic");
      const taskDifficultyInput = document.getElementById("task-difficulty");
      const taskQuestionsInput = document.getElementById("task-questions");

      const taskTopic = taskTopicInput?.value.trim();
      const taskSubtopic = taskSubtopicInput?.value.trim();
      const taskDifficulty = taskDifficultyInput?.value || "Easy";
      const taskQuestions = parseInt(taskQuestionsInput?.value || "5", 10);

      if (!taskTopic) {
        addNotification("Please enter a topic.", "warning");
        return;
      }

      const taskContent = taskSubtopic ? `${taskTopic} - ${taskSubtopic}` : taskTopic;

      const user = auth.currentUser;
      if (!user) {
        addNotification("User not authenticated to post task.", "error");
        return;
      }

      const staffData = await fetchStaffData(user.uid);
      if (!staffData || !staffData.formFilled) {
        addNotification("Staff profile incomplete or not found.", "error");
        return;
      }

      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: taskContent,
        topic: taskTopic,
        subtopic: taskSubtopic || "",
        difficulty: taskDifficulty,
        numQuestions: taskQuestions,
        subject: staffData.subject || "General",
        staffId: user.uid,
        staff_id: user.uid,
        staffName: staffData.name || "Staff",
        postedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        completedBy: [],
      };

      const existingTasks = await fetchTasks();
      const updatedTasks = [...(existingTasks || []), newTask];
      await saveTasks(updatedTasks);

      // Recalculate performance
      try {
        const allStudents = await fetchAllStudents();
        await calculateAndStoreOverallPerformance(allStudents, user.uid, updatedTasks);
      } catch (progressError) {
        console.warn("Failed to recalculate overall performance after new task:", progressError);
      }

      if (taskTopicInput) taskTopicInput.value = "";
      if (taskSubtopicInput) taskSubtopicInput.value = "";
      if (taskQuestionsInput) taskQuestionsInput.value = "5";
      if (taskDifficultyInput) taskDifficultyInput.value = "Easy";
      addNotification("Task posted successfully!", "success");
    } catch (err) {
      console.error("Error posting task:", err);
      addNotification("Failed to post task: " + err.message, "error");
    }
  }, [addNotification]);

  const deleteTask = useCallback(
    async (taskId) => {
      try {
        if (
          !window.confirm(
            "Are you sure you want to delete this task? This action cannot be undone."
          )
        ) {
          return;
        }
        const user = auth.currentUser;
        if (!user) {
          addNotification("User not authenticated to delete task.", "error");
          return;
        }

        const existingTasks = await fetchTasks();
        if (!existingTasks || existingTasks.length === 0) {
          addNotification("No tasks found.", "error");
          return;
        }

        const taskToDelete = existingTasks.find((task) => task.id === taskId);
        if (!taskToDelete) {
          addNotification("Task not found.", "error");
          return;
        }
        if (taskToDelete.staffId !== user.uid && taskToDelete.staff_id !== user.uid) {
          addNotification("You can only delete your own tasks.", "error");
          return;
        }

        const updatedTasks = existingTasks.filter((task) => task.id !== taskId);
        await saveTasks(updatedTasks);

        // Recalculate performance
        try {
          const allStudents = await fetchAllStudents();
          await calculateAndStoreOverallPerformance(allStudents, user.uid, updatedTasks);
        } catch (progressError) {
          console.warn("Failed to recalculate overall performance after task deletion:", progressError);
        }

        addNotification("Task deleted successfully!", "success");
      } catch (err) {
        console.error("Error deleting task:", err);
        addNotification("Failed to delete task: " + err.message, "error");
      }
    },
    [addNotification]
  );

  const filteredStudents = useMemo(() => {
    // This logic is fine. It uses `results` which is now
    // correctly calculated from `student.progress`
    if (!filterType) return results;
    switch (filterType) {
      case "total":
        return results;
      case "active":
        return studentStats;
      case "performance":
        return results;
      default:
        return results;
    }
  }, [results, filterType, studentStats]);

  const selectStudentAndMarkAsRead = useCallback(
    async (student) => {
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) return;
      setSelectedStudentId(student.id);
      setSelectedStudentName(student.name);
      setShowContactList(false);
      try {
        await markMessagesAsRead(staffUserId, student.id);
        loadUnreadMessages();
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [loadUnreadMessages]
  );

  const getLoadingProgress = () => {
    const totalSteps = 4;
    let completedSteps = 0;
    if (!loading.dashboard) completedSteps++;
    if (!loading.students) completedSteps++;
    if (Object.keys(userNames).length > 0) completedSteps++;
    if (quickStats.totalStudents > 0) completedSteps++;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getLoadingMessage = () => {
    if (loading.students) return "Loading student data...";
    if (loading.dashboard) return "Setting up dashboard...";
    if (Object.keys(userNames).length === 0)
      return "Loading user information...";
    return "Finalizing dashboard...";
  };

  // --- Render Loading Screen ---
  if (isDashboardLoading) {
    const progress = getLoadingProgress();
    const message = getLoadingMessage();
    return (
      <div className="loading-dashboard-container">
        <div className="background-grid"></div>
        <div className="animation-wrapper">
          <div className="core-spinner">
            <i className={loadingIcons[currentIcon]}></i>
          </div>
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="loading-message">
          <span className="rainbow-text">{message}</span>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <GuideModal
          isOpen={showGuide}
          onClose={() => setShowGuide(false)}
          role="staff"
        />
        <Sidebar
          userData={userData}
          role="staff"
          toggleContainer={toggleContainer}
          isVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
          setMobileHamburger={setMobileHamburger}
          activeContainer={activeContainer}
          unreadMessageCounts={unreadMessageCounts}
        />
        <div
          className={`main-content ${sidebarVisible ? "sidebar-active" : ""}`}
        >
          {isMobile && <div className="header">{mobileHamburger}</div>}
          <div className="notifications-area">
            {notifications.map((notif) => (
              <Notification
                key={`notif-area-${notif.id}`}
                message={notif.message}
                type={notif.type}
                onClose={() =>
                  setNotifications((prev) =>
                    prev.filter((n) => n.id !== notif.id)
                  )
                }
              />
            ))}
          </div>
          <div id="main-content-section">
            {!activeContainer && (
              <DefaultContent
                quickStats={quickStats}
                toggleContainer={toggleContainer}
                loading={loading}
                tasks={tasks}
                latestActivity={latestActivity}
              />
            )}

            {isMobile && (
              <MobileChatbotContainer
                activeContainer={activeContainer}
                setActiveContainer={setActiveContainer}
              />
            )}

            <TasksContainer
              activeContainer={activeContainer}
              postTask={postTask}
              loading={loading}
              tasks={tasks}
              deleteTask={deleteTask}
            />

            <AssignmentsContainer
              activeContainer={activeContainer}
              newAssignmentSubject={newAssignmentSubject}
              setNewAssignmentSubject={setNewAssignmentSubject}
              newAssignmentLink={newAssignmentLink}
              setNewAssignmentLink={setNewAssignmentLink}
              newAssignmentDeadline={newAssignmentDeadline}
              setNewAssignmentDeadline={setNewAssignmentDeadline}
              newAssignmentDeadlineTime={newAssignmentDeadlineTime}
              setNewAssignmentDeadlineTime={setNewAssignmentDeadlineTime}
              postAssignment={postAssignment}
              selectedStudentForMarking={selectedStudentForMarking}
              setSelectedStudentForMarking={setSelectedStudentForMarking}
              studentStats={studentStats}
              selectedAssignmentForMarking={selectedAssignmentForMarking}
              setSelectedAssignmentForMarking={setSelectedAssignmentForMarking}
              assignments={assignments}
              assignmentMarks={assignmentMarks}
              setAssignmentMarks={setAssignmentMarks}
              handleSendMarks={handleSendMarks}
              loading={loading}
              deleteAssignment={deleteAssignment}
              currentUserId={auth.currentUser?.uid}
              currentSubmission={currentSubmission}
              assignmentSubmissions={assignmentSubmissions}
            />

            <ResultsContainer
              activeContainer={activeContainer}
              results={results}
            />

            <MonitorContainer
              activeContainer={activeContainer}
              setActiveContainer={setActiveContainer}
              latestActivity={latestActivity}
            />

            <StaffInteractionContainer
              activeContainer={activeContainer}
              messages={messages}
              sendMessage={sendStaffMessage}
              deleteMessage={deleteMessage}
              showContactList={showContactList}
              setShowContactList={setShowContactList}
              setSelectedStudentId={setSelectedStudentId}
              setSelectedStudentName={setSelectedStudentName}
              currentUserId={auth.currentUser?.uid}
              studentStats={studentStats}
              selectedStudentName={selectedStudentName}
              selectedStudentId={selectedStudentId}
              userNames={userNames}
              unreadMessageCounts={unreadMessageCounts}
              selectStudentAndMarkAsRead={selectStudentAndMarkAsRead}
            />

            <QuickStatsContainer
              activeContainer={activeContainer}
              filterType={filterType}
              setActiveContainer={setActiveContainer}
              performanceTab={performanceTab}
              setPerformanceTab={setPerformanceTab}
              results={results}
              loading={loading}
              filteredStudents={filteredStudents}
              tasks={tasks}
              taskStatusByStudent={taskStatusByStudent}
            />

            <YoutubeControllerContainer
              activeContainer={activeContainer}
              showConfigureSection={showConfigureSection}
              setShowConfigureSection={setShowConfigureSection}
              showAddChannelSection={showAddChannelSection}
              setShowAddChannelSection={setShowAddChannelSection}
              youtubeSettings={youtubeSettings}
              setYoutubeSettings={setYoutubeSettings}
              deleteChannel={deleteChannel}
              newChannelId={newChannelId}
              setNewChannelId={setNewChannelId}
              newChannelName={newChannelName}
              setNewChannelName={setNewChannelName}
              newChannelLanguage={newChannelLanguage}
              setNewChannelLanguage={setNewChannelLanguage}
              newChannelCategory={newChannelCategory}
              setNewChannelCategory={setNewChannelCategory}
              addNewChannel={addNewChannel}
              saveYoutubeSettings={saveYoutubeSettings}
              youtubeSettingsLoading={youtubeSettingsLoading}
            />

            <SettingsContainer
              activeContainer={activeContainer}
              handleEditProfile={handleEditProfile}
              handleLogout={handleLogout}
              addNotification={addNotification}
              setActiveContainer={setActiveContainer}
            />

            <AboutContainer
              activeContainer={activeContainer}
              setActiveContainer={setActiveContainer}
            />

            <TimetableCreatorContainer activeContainer={activeContainer} />
          </div>
        </div>

        {!isMobile && (
          <Chatbot
            role="staff"
            isMinimized={false}
            isVisible={isChatbotOpen}
            toggleChatbot={toggleChatbot}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default StaffDashboard;
