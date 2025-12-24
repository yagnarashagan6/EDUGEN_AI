// StaffDashboard.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { supabaseAuth as auth } from "../supabase";
import {
  fetchStaffData,
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

    const subRef = doc(
      db,
      "students",
      selectedStudentForMarking,
      "submissions",
      selectedAssignmentForMarking
    );

    console.log(
      `Listening for submission: students/${selectedStudentForMarking}/submissions/${selectedAssignmentForMarking}`
    );

    const unsubscribe = onSnapshot(
      subRef,
      (docSnap) => {
        if (docSnap.exists()) {
          console.log("Submission found:", docSnap.data());
          setCurrentSubmission(docSnap.data());
        } else {
          console.log("No submission found for this student/assignment.");
          setCurrentSubmission(null);
        }
      },
      (error) => {
        console.error("Error listening to submission:", error);
        setCurrentSubmission(null);
      }
    );

    return () => unsubscribe();
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
      const promises = allIds.map((id) => getDoc(doc(db, "students", id)));

      try {
        const docSnaps = await Promise.all(promises);
        docSnaps.forEach((docSnap, index) => {
          const id = allIds[index];
          if (docSnap.exists()) {
            newNamesMap[id] = docSnap.data().name || "Anonymous";
          } else {
            newNamesMap[id] = "Anonymous";
          }
        });

        if (currentStaffId && !userNames[currentStaffId]) {
          const staffDoc = await getDoc(doc(db, "staff", currentStaffId));
          if (staffDoc.exists()) {
            newNamesMap[currentStaffId] = staffDoc.data().name || "Staff";
          } else {
            newNamesMap[currentStaffId] = "Staff";
          }
        }
        setUserNames((prevNames) => ({ ...prevNames, ...newNamesMap }));
      } catch (e) {
        console.error("Error fetching user names:", e);
        addNotification("Failed to load some user names.", "error");
      }
    },
    [addNotification] // Removed userNames from dependencies
  );

  const countUnreadMessages = useCallback(async () => {
    try {
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) return;
      const unreadCounts = {};
      for (const student of studentStats) {
        const chatId = [staffUserId, student.id].sort().join("_");
        const messagesRef = doc(db, "messages", chatId);
        const messagesSnap = await getDoc(messagesRef); // Use getDoc
        if (messagesSnap.exists()) {
          const messages = messagesSnap.data().messages || [];
          const unreadCount = messages.filter(
            (msg) => msg.sender === "student" && !msg.read
          ).length;
          if (unreadCount > 0) {
            unreadCounts[student.id] = unreadCount;
          }
        }
      }
      setUnreadMessageCounts(unreadCounts);
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
        const staffDocRef = doc(db, "staff", user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (!staffDocSnap.exists()) {
          addNotification(
            "Staff profile not found. Redirecting to form.",
            "error"
          );
          navigate("/staff-form");
          return;
        }
        if (!staffDocSnap.data().formFilled) {
          navigate("/staff-form");
          return;
        }
        setUserData(staffDocSnap.data());
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
        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef); // Use getDocs
        const allStudents = [];
        studentsSnap.forEach((studentDoc) => {
          const studentData = studentDoc.data();
          if (
            studentData.name &&
            studentData.name.trim() !== "" &&
            studentData.name !== "Unknown"
          ) {
            allStudents.push({
              id: studentDoc.id,
              name: studentData.name,
              streak: studentData.streak || 0,
              progress: studentData.progress || 0,
              dob: studentData.dob || null,
              ...studentData,
            });
          }
        });
        setStudentStats(
          allStudents.sort((a, b) => (b.progress || 0) - (a.progress || 0))
        );
        setQuickStats((prev) => ({
          ...prev,
          totalStudents: allStudents.length,
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
        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef); // Use getDocs
        const allStudents = [];
        studentsSnap.forEach((studentDoc) => {
          const studentData = studentDoc.data();
          if (
            studentData.name &&
            studentData.name.trim() !== "" &&
            studentData.name !== "Unknown"
          ) {
            allStudents.push({
              id: studentDoc.id,
              name: studentData.name,
              streak: studentData.streak || 0,
              progress: studentData.progress || 0,
              dob: studentData.dob || null,
              ...studentData,
            });
          }
        });
        setStudentStats(
          allStudents.sort((a, b) => (b.progress || 0) - (a.progress || 0))
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
        const overallStatsRef = doc(db, "staff", user.uid);
        const overallStatsSnap = await getDoc(overallStatsRef);
        if (overallStatsSnap.exists()) {
          const data = overallStatsSnap.data();
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
    const unsub = onSnapshot(doc(db, "staff", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
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
      const tasksRef = doc(db, "tasks", "shared");
      const tasksSnap = await getDoc(tasksRef); // Use getDoc
      if (!tasksSnap.exists()) {
        setTasks([]);
        setLoading((prev) => ({ ...prev, tasks: false }));
        return;
      }
      const allTasks = tasksSnap.data().tasks || [];
      const staffTasks = allTasks
        .filter((task) => task.staffId === currentStaffId)
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
        const statusColRef = collection(
          db,
          "students",
          student.id,
          "task_status"
        );
        const snap = await getDocs(statusColRef); // Use getDocs, not onSnapshot
        const map = {};
        snap.forEach((d) => {
          map[d.id] = d.data();
        });
        allStatuses[student.id] = map;
      } catch (e) {
        console.warn("Failed to load task status for", student.id);
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

  const fetchAssignments = useCallback(async () => {
    setLoading((prev) => ({ ...prev, assignments: true }));
    const user = auth.currentUser;
    if (!user) {
      addNotification("User not authenticated for assignments.", "error");
      setLoading((prev) => ({ ...prev, assignments: false }));
      return;
    }
    try {
      const q = query(
        collection(db, "assignments"),
        orderBy("postedAt", "desc")
      );
      const snapshot = await getDocs(q); // Use getDocs
      const staffAssignments = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          postedAt: doc.data().postedAt?.toDate
            ? doc.data().postedAt.toDate()
            : new Date(),
          deadline: doc.data().deadline?.toDate
            ? doc.data().deadline.toDate()
            : null,
        }))
        .filter((assignment) => assignment.staffId === user.uid);
      setAssignments(staffAssignments);
      setLoading((prev) => ({ ...prev, assignments: false }));
    } catch (err) {
      console.error("Error fetching assignments:", err);
      addNotification("Failed to load assignments: " + err.message, "error");
      setLoading((prev) => ({ ...prev, assignments: false }));
    }
  }, [addNotification]);

  useEffect(() => {
    fetchAssignments();
    // --- OPTIMIZATION ---
    // Remove automatic interval refresh. Staff can reopen the
    // container to refresh the data if needed, or we can add a button.
    // const interval = setInterval(fetchAssignments, 60000);
    // return () => clearInterval(interval);
  }, [fetchAssignments]);

  // Fetch all student submissions for all assignments
  useEffect(() => {
    if (
      !auth.currentUser ||
      assignments.length === 0 ||
      studentStats.length === 0
    )
      return;

    const unsubscribers = [];

    assignments.forEach((assignment) => {
      studentStats.forEach((student) => {
        const subRef = doc(
          db,
          "students",
          student.id,
          "submissions",
          assignment.id
        );

        const unsubscribe = onSnapshot(subRef, (docSnap) => {
          const key = `${assignment.id}_${student.id}`;
          if (docSnap.exists()) {
            setAssignmentSubmissions((prev) => ({
              ...prev,
              [key]: {
                ...docSnap.data(),
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
        });

        unsubscribers.push(unsubscribe);
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [assignments, studentStats]);

  const loadYoutubeSettings = useCallback(async () => {
    try {
      const settingsRef = doc(db, "settings", "youtube");
      const settingsSnap = await getDoc(settingsRef); // Use getDoc
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setYoutubeSettings({
          defaultLanguage: data.defaultLanguage || "ta",
          defaultCategory: data.defaultCategory || "all",
          defaultChannelIds: data.defaultChannelIds || [],
          channels: data.channels || CHANNELS,
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
        const settingsRef = doc(db, "settings", "youtube");
        await setDoc(settingsRef, {
          ...settings,
          updatedBy: auth.currentUser?.uid,
          updatedAt: Timestamp.now(),
        });
        setYoutubeSettings(settings);
        addNotification("YouTube settings updated successfully", "success");
      } catch (error) {
        console.error("Error saving YouTube settings:", error);
        addNotification("Failed to save YouTube settings", "error");
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
    const chatId = [staffUserId, selectedStudentId].sort().join("_");
    const messagesRef = doc(db, "messages", chatId);

    // This listener is fine. It's for an active 1-on-1 chat.
    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const currentMessages = docSnap.data().messages || [];
            setMessages(currentMessages);
            const unreadStudentMessages = currentMessages.filter(
              (msg) => msg.sender === "student" && !msg.read
            );
            if (unreadStudentMessages.length > 0) {
              const updatedMessages = currentMessages.map((msg) =>
                msg.sender === "student" && !msg.read
                  ? { ...msg, read: true }
                  : msg
              );
              await setDoc(
                messagesRef,
                { messages: updatedMessages },
                { merge: true }
              );
              countUnreadMessages();
            }
            const senderIds = currentMessages
              .map((msg) => msg.senderId)
              .filter((id) => id && !userNames[id]);
            if (senderIds.length > 0) {
              fetchUserNames(senderIds, staffUserId);
            }
          } else {
            setMessages([]);
          }
        } catch (err) {
          console.error("Error processing message snapshot:", err);
          addNotification("Failed to load messages.", "error");
        }
      },
      (err) => {
        console.error("Error subscribing to messages:", err);
        addNotification("Failed to load messages: " + err.message, "error");
      }
    );
    return () => unsubscribe();
  }, [
    selectedStudentId,
    addNotification,
    fetchUserNames,
    userNames,
    countUnreadMessages,
  ]);

  useEffect(() => {
    if (studentStats.length === 0) return;
    countUnreadMessages();
    const interval = setInterval(countUnreadMessages, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [studentStats, countUnreadMessages]);

  const sendMessage = useCallback(async () => {
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
      const chatId = [staffUserId, selectedStudentId].sort().join("_");
      const newMessage = {
        text,
        sender: "staff",
        senderId: staffUserId,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const messagesRef = doc(db, "messages", chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists()
        ? messagesSnap.data().messages || []
        : [];
      await setDoc(
        messagesRef,
        { messages: [...existingMessages, newMessage] },
        { merge: true }
      );
      if (input) input.value = "";
      try {
        const studentNotifRef = collection(
          db,
          "students",
          selectedStudentId,
          "notifications"
        );
        await addDoc(studentNotifRef, {
          message: `New message from staff: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""
            }`,
          type: "message",
          staffId: staffUserId,
          timestamp: Timestamp.now(),
        });
      } catch (notifError) {
        console.warn("Failed to send notification to student:", notifError);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      addNotification("Failed to send message: " + err.message, "error");
    }
  }, [selectedStudentId, addNotification]);

  const deleteMessage = useCallback(
    async (originalIndex) => {
      try {
        if (!selectedStudentId) return;
        const staffUserId = auth.currentUser?.uid;
        if (!staffUserId) {
          addNotification("User not authenticated to delete message.", "error");
          return;
        }
        const chatId = [staffUserId, selectedStudentId].sort().join("_");
        const updatedMessages = messages.filter((_, i) => i !== originalIndex);
        const messagesRef = doc(db, "messages", chatId);
        await setDoc(messagesRef, { messages: updatedMessages });
      } catch (err) {
        console.error("Error deleting message:", err);
        addNotification("Failed to delete message: " + err.message, "error");
      }
    },
    [selectedStudentId, messages, addNotification]
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
      const staffDocSnap = await getDoc(doc(db, "staff", user.uid));
      if (!staffDocSnap.exists() || !staffDocSnap.data().formFilled) {
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
      let deadlineTimestamp = null;
      if (newAssignmentDeadline) {
        const deadlineDateTime = newAssignmentDeadlineTime
          ? `${newAssignmentDeadline}T${newAssignmentDeadlineTime}:00`
          : `${newAssignmentDeadline}T23:59:00`;
        const deadlineDate = new Date(deadlineDateTime);
        if (isNaN(deadlineDate.getTime())) {
          addNotification("Invalid deadline date/time provided.", "warning");
          return;
        }
        deadlineTimestamp = Timestamp.fromDate(deadlineDate);
      }
      const newAssignmentData = {
        subject: newAssignmentSubject.trim(),
        driveLink: newAssignmentLink.trim(),
        staffId: user.uid,
        staffName: staffDocSnap.data().name || "Staff",
        postedAt: Timestamp.now(),
        deadline: deadlineTimestamp,
        isPublic: true,
      };
      const assignmentRef = await addDoc(
        collection(db, "assignments"),
        newAssignmentData
      );
      addNotification("Assignment posted successfully!", "success");
      const studentsRef = collection(db, "students");
      const studentSnapshot = await getDocs(studentsRef);
      studentSnapshot.forEach(async (studentDoc) => {
        const studentNotifRef = collection(
          db,
          "students",
          studentDoc.id,
          "notifications"
        );
        await addDoc(studentNotifRef, {
          message: `New assignment posted: ${newAssignmentSubject}`,
          type: "assignment",
          assignmentId: assignmentRef.id,
          timestamp: Timestamp.now(),
        });
      });
      setNewAssignmentSubject("");
      setNewAssignmentLink("");
      setNewAssignmentDeadline("");
      setNewAssignmentDeadlineTime("23:59");
    } catch (err) {
      console.error("Error posting assignment:", err);
      addNotification("Failed to post assignment: " + err.message, "error");
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      if (
        !window.confirm(
          "Are you sure you want to delete this assignment? This action cannot be undone."
        )
      )
        return;
      await deleteDoc(doc(db, "assignments", assignmentId));
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
      const marksPath = `students/${selectedStudentForMarking}/marks/${selectedAssignmentForMarking}`;
      const marksRef = doc(db, marksPath);
      await setDoc(
        marksRef,
        {
          marks: assignmentMarks.trim(),
          assignmentSubject: selectedAssignmentDetails?.subject || "N/A",
          assignmentId: selectedAssignmentForMarking,
          staffId: staffUserId,
          staffName: userData?.name || userNames[staffUserId] || "Staff",
          markedAt: Timestamp.now(),
        },
        { merge: true }
      );
      addNotification("Marks sent successfully!", "success");
      setSelectedStudentForMarking("");
      setSelectedAssignmentForMarking("");
      setAssignmentMarks("");
    } catch (err) {
      console.error("Error sending marks:", err);
      addNotification(`Failed to send marks: ${err.message}`, "error");
      return;
    }
    try {
      const studentNotifRef = collection(
        db,
        "students",
        selectedStudentForMarking,
        "notifications"
      );
      await addDoc(studentNotifRef, {
        message: `Marks received for assignment "${selectedAssignmentDetails?.subject}": ${assignmentMarks}`,
        type: "marks",
        assignmentId: selectedAssignmentForMarking,
        timestamp: Timestamp.now(),
      });
    } catch (err) {
      console.warn("Failed to send notification to student:", err);
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
      const taskInput = document.getElementById("task-content");
      const taskContent = taskInput?.value.trim();
      if (!taskContent) {
        addNotification("Please enter a task description.", "warning");
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        addNotification("User not authenticated to post task.", "error");
        return;
      }
      const staffDocSnap = await getDoc(doc(db, "staff", user.uid));
      if (!staffDocSnap.exists() || !staffDocSnap.data().formFilled) {
        addNotification("Staff profile incomplete or not found.", "error");
        return;
      }
      const staffData = staffDocSnap.data();
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: taskContent,
        subject: staffData.subject || "General",
        staffId: user.uid,
        staffName: staffData.name || "Staff",
        postedAt: Timestamp.now(),
        date: new Date().toLocaleDateString(),
        completedBy: [],
      };
      const tasksRef = doc(db, "tasks", "shared");
      const tasksSnap = await getDoc(tasksRef);
      const existingTasks = tasksSnap.exists()
        ? tasksSnap.data().tasks || []
        : [];
      await setDoc(
        tasksRef,
        { tasks: [...existingTasks, newTask] },
        { merge: true }
      );
      try {
        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef);
        const allStudents = [];
        studentsSnap.forEach((studentDoc) => {
          const studentData = studentDoc.data();
          if (
            studentData.name &&
            studentData.name.trim() !== "" &&
            studentData.name !== "Unknown"
          ) {
            allStudents.push({
              id: studentDoc.id,
              name: studentData.name,
              progress: studentData.progress || 0,
              streak: studentData.streak || 0,
              ...studentData,
            });
          }
        });
        // --- OPTIMIZATION ---
        // Recalculate performance now that a new task exists
        await calculateAndStoreOverallPerformance(allStudents, user.uid, [
          ...existingTasks,
          newTask,
        ]);
      } catch (progressError) {
        console.warn(
          "Failed to recalculate overall performance after new task:",
          progressError
        );
      }
      const studentsRef = collection(db, "students");
      const studentSnapshot = await getDocs(studentsRef);
      const notificationPromises = studentSnapshot.docs.map(
        async (studentDoc) => {
          const studentNotifRef = collection(
            db,
            "students",
            studentDoc.id,
            "notifications"
          );
          return addDoc(studentNotifRef, {
            message: `New task posted: ${taskContent}`,
            type: "task",
            taskId: newTask.id,
            timestamp: Timestamp.now(),
          });
        }
      );
      await Promise.all(notificationPromises);
      if (taskInput) taskInput.value = "";
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
        const tasksRef = doc(db, "tasks", "shared");
        const tasksSnap = await getDoc(tasksRef);
        if (!tasksSnap.exists()) {
          addNotification("No tasks found.", "error");
          return;
        }
        const existingTasks = tasksSnap.data().tasks || [];
        const taskToDelete = existingTasks.find((task) => task.id === taskId);
        if (!taskToDelete) {
          addNotification("Task not found.", "error");
          return;
        }
        if (taskToDelete.staffId !== user.uid) {
          addNotification("You can only delete your own tasks.", "error");
          return;
        }
        const updatedTasks = existingTasks.filter((task) => task.id !== taskId);
        await setDoc(tasksRef, { tasks: updatedTasks }, { merge: true });
        try {
          const studentsRef = collection(db, "students");
          const studentsSnap = await getDocs(studentsRef);
          const allStudents = [];
          studentsSnap.forEach((studentDoc) => {
            const studentData = studentDoc.data();
            if (
              studentData.name &&
              studentData.name.trim() !== "" &&
              studentData.name !== "Unknown"
            ) {
              allStudents.push({
                id: studentDoc.id,
                name: studentData.name,
                progress: studentData.progress || 0,
                streak: studentData.streak || 0,
                ...studentData,
              });
            }
          });
          // --- OPTIMIZATION ---
          // Recalculate performance now that a task is gone
          await calculateAndStoreOverallPerformance(
            allStudents,
            user.uid,
            updatedTasks
          );
        } catch (progressError) {
          console.warn(
            "Failed to recalculate overall performance after task deletion:",
            progressError
          );
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
        const chatId = [staffUserId, student.id].sort().join("_");
        const messagesRef = doc(db, "messages", chatId);
        const messagesSnap = await getDoc(messagesRef); // Use getDoc
        if (messagesSnap.exists()) {
          const currentMessages = messagesSnap.data().messages || [];
          const hasUnreadMessages = currentMessages.some(
            (msg) => msg.sender === "student" && !msg.read
          );
          if (hasUnreadMessages) {
            const updatedMessages = currentMessages.map((msg) =>
              msg.sender === "student" && !msg.read
                ? { ...msg, read: true }
                : msg
            );
            await setDoc(
              messagesRef,
              { messages: updatedMessages },
              { merge: true }
            );
            countUnreadMessages();
          }
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [countUnreadMessages]
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
              sendMessage={sendMessage}
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
