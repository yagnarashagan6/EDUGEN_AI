// StudentDashboard.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  runTransaction,
  addDoc,
} from "firebase/firestore";
import { auth, db, storage } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { signOut } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import GoalItem from "../components/GoalItem";
import Quiz from "../components/Quiz";
import Notification from "../components/Notification";
import OverdueTaskNotification from "../components/OverdueTaskNotification";
import Chatbot from "../components/Chatbot";
import GuideModal from "../components/GuideModal";
import Notes from "../components/Notes";
import TaskItem from "../components/TaskItem";
import "../styles/Dashboard.css";
import "../styles/Sidebar.css";
import "../styles/Chat.css";
import "../styles/Notes.css";
import Youtube from "../components/Youtube";

// Import the refactored parts
import {
  ErrorBoundary,
  ChatInterface,
  AssignmentSummaryCard,
  AssignmentItem,
  Leaderboard,
} from "../students/StudentDashboardComponents";

import {
  saveTaskCompletion,
  generateQuizWithFallback,
  formatTimeSpent,
  getOverdueState,
  loadingIcons,
  newsCategories,
} from "../students/StudentDashboardUtils";

import {
  DefaultContent,
  TasksContainer,
  GoalsContainer,
  StreakContainer,
  AssignmentsContainer,
  CircularContainer,
  NewsContainer,
  YoutubeContainer,
  StaffInteractionContainer,
  SelfAnalysisContainer,
  SettingsContainer,
  AboutContainer,
  ChatbotContainer,
  NotesContainer,
  StudyTimerContainer,
} from "../students/StudentDashboardViews";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [inQuiz, setInQuiz] = useState(false);
  const [quizReady, setQuizReady] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [topAssignments, setTopAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState(null);
  const [selfAnalysis, setSelfAnalysis] = useState({
    learningRate: 0,
    communicationSkill: 0,
    goalCompletionRate: 0,
    quizEngagement: 0,
    timeSpent: "0 minutes",
    suggestions: "",
  });
  const [error, setError] = useState(null);
  const [quizCount, setQuizCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [showContactList, setShowContactList] = useState(true);
  const [feedbackText, setFeedbackText] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [copiedTopic, setCopiedTopic] = useState("");
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);
  const [overdueTaskReasons, setOverdueTaskReasons] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAssignmentSubject, setSelectedAssignmentSubject] =
    useState(null);
  const [pendingStreakUpdate, setPendingStreakUpdate] = useState(false);
  const [newStreakValue, setNewStreakValue] = useState(0);
  const [pendingQuizTask, setPendingQuizTask] = useState(null);
  const [showQuizSetup, setShowQuizSetup] = useState(false);
  const [quizNumQuestions, setQuizNumQuestions] = useState(3);

  // News-related state
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [newsPage, setNewsPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [hasMoreNews, setHasMoreNews] = useState(true);

  const loginTimeRef = useRef(null);
  const [totalTimeSpentInMs, setTotalTimeSpentInMs] = useState(0);
  const sessionStartTimeRef = useRef(null);

  const [mobileHamburger, setMobileHamburger] = useState(null);
  const [loading, setLoading] = useState({
    dashboard: true,
    tasks: true,
    assignments: true,
    goals: true,
    students: true,
  });

  // Add this state for initial loading animation
  const [showInitialLoading, setShowInitialLoading] = useState(true);
  const [currentIcon, setCurrentIcon] = useState(0);
  const [iconDirection, setIconDirection] = useState(1);

  const quizRequestLockRef = useRef(false);
  const [taskProgress, setTaskProgress] = useState({});
  const [overdueNotifications, setOverdueNotifications] = useState([]);

  // Debug: log taskProgress changes to verify fetch and re-render
  useEffect(() => {
    // console.log("[StudentDashboard] taskProgress updated:", taskProgress);
  }, [taskProgress]);

  // --- ALL useEffect, useMemo, useCallback, and handler functions ---
  // (All the logic from the original component stays here)

  // Animation effect:
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % loadingIcons.length);
      setIconDirection((prev) => -prev);
    }, 240);

    const timer = setTimeout(() => setShowInitialLoading(false), 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const isDashboardLoading =
    loading.dashboard || loading.tasks || loading.assignments || loading.goals;

  // --- OPTIMIZATION ---
  // This new function calculates and saves the student's overall progress.
  // This ensures the staff dashboard can read one simple value.
  const updateStudentProgress = useCallback(
    async (
      currentTaskProgress,
      currentGoals,
      allTasks,
      currentQuizCount,
      currentStreak,
      currentUserData
    ) => {
      const user = auth.currentUser;
      if (!user || !currentUserData) return;

      try {
        // console.log("updateStudentProgress called with:", {
        //   currentTaskProgress,
        //   allTasks: allTasks.length,
        //   currentQuizCount,
        //   currentStreak,
        // });
        // Calculate progress as (completed tasks / total tasks) * 100
        const completedTaskCount = allTasks.filter((task) => {
          const taskId =
            task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
          const isCompleted =
            currentTaskProgress[taskId]?.completed ||
            task.completedBy?.includes(user.uid);
          // console.log(
          //   `Task ${task.content}: id=${taskId}, completed=${isCompleted}`
          // );
          return isCompleted;
        }).length;
        const newProgress =
          allTasks.length > 0
            ? Math.round((completedTaskCount / allTasks.length) * 100)
            : 0;

        // console.log(
        //   `Progress calculation: ${completedTaskCount}/${allTasks.length} = ${newProgress}%`
        // );

        // Update Firestore
        setProgress(newProgress);
        const userRef = doc(db, "students", user.uid);
        await updateDoc(userRef, {
          progress: newProgress,
          quizCount: currentQuizCount, // Also update quiz count
        });
        // console.log("Updated progress in Firestore:", newProgress);

        // Update local leaderboard
        setLeaderboard((prevLeaderboard) =>
          prevLeaderboard.map((student) =>
            student.id === user.uid
              ? { ...student, progress: newProgress, streak: currentStreak }
              : student
          )
        );

        // Update Leaderboard in Firestore
        await updateLeaderboard(
          user.uid,
          currentUserData.name,
          currentStreak,
          newProgress
        );
      } catch (err) {
        console.error("Error updating student progress:", err);
      }
    },
    []
  ); // Removed userData from deps

  // Fetch news function
  const fetchNews = async (
    category = "general",
    page = 1,
    loadMore = false
  ) => {
    setNewsLoading(true);
    if (!loadMore) {
      setNewsError(null);
    }

    try {
      const backendUrl =
        process.env.NODE_ENV === "production"
          ? "https://edugen-backend-zbjr.onrender.com"
          : "http://localhost:10000";

      const response = await fetch(
        `${backendUrl}/api/news?category=${category}&page=${page}&country=us,in&max=10`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        }
        if (response.status === 404) {
          console.warn("News endpoint not available, using placeholder data");
          const placeholderNews = {
            articles: [
              // ... placeholder news objects
            ],
            totalArticles: 3,
            success: true,
          };
          // ... placeholder logic
          setHasMoreNews(false);
          setNewsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch news: ${response.status}`);
      }

      const data = await response.json();

      if (data.articles && data.articles.length > 0) {
        const processedArticles = data.articles.map((article) => {
          let imageUrl = article.image;
          if (
            !imageUrl ||
            imageUrl === null ||
            imageUrl === "null" ||
            imageUrl === ""
          ) {
            imageUrl = `https://picsum.photos/400/220?random=${Math.floor(
              Math.random() * 1000
            )}`;
          }
          if (imageUrl && imageUrl.startsWith("http://")) {
            imageUrl = imageUrl.replace("http://", "https://");
          }
          return {
            ...article,
            image: imageUrl,
            imageAlt: article.title || "News Article",
          };
        });

        const uniqueArticles = processedArticles.filter(
          (article, index, self) =>
            index ===
            self.findIndex(
              (a) => a.title === article.title || a.url === article.url
            )
        );
        uniqueArticles.sort(
          (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
        );

        if (loadMore) {
          setNews((prevNews) => {
            const existingUrls = new Set(
              prevNews.map((article) => article.url)
            );
            const newArticles = uniqueArticles.filter(
              (article) => !existingUrls.has(article.url)
            );
            if (newArticles.length === 0) {
              setHasMoreNews(false);
              return prevNews;
            }
            return [...prevNews, ...newArticles];
          });
        } else {
          setNews(uniqueArticles);
        }
        setHasMoreNews(uniqueArticles.length >= 8);
      } else {
        if (!loadMore) setNews([]);
        setHasMoreNews(false);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
      setNewsError(`Failed to fetch news: ${err.message}`);
      if (!loadMore) setNews([]);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setNewsPage(1);
    setHasMoreNews(true);
    setNewsError(null);
    setNews([]);
    fetchNews(category, 1, false);
  };

  const handleNewsRefresh = () => {
    setNewsPage(1);
    setHasMoreNews(true);
    setNewsError(null);
    setNews([]);
    fetchNews(selectedCategory, 1, false);
  };

  const handleLoadMore = () => {
    if (hasMoreNews && !newsLoading) {
      const nextPage = newsPage + 1;
      setNewsPage(nextPage);
      fetchNews(selectedCategory, nextPage, true);
    }
  };

  const logStudentActivity = async (activityType, subject = "N/A") => {
    // Activity logging logic (commented out in original)
  };

  useEffect(() => {
    setMobileHamburger(
      <button
        className="mobile-hamburger"
        onClick={() => setSidebarVisible(true)}
        aria-label="Open menu"
      >
        <i className="fas fa-bars"></i>
      </button>
    );
  }, []);

  const assignmentsBySubject = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
      const subject = assignment.subject || "Uncategorized";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(assignment);
      return acc;
    }, {});
  }, [assignments]);

  const tasksBySubject = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const subject = task.subject || "Uncategorized";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(task);
      return acc;
    }, {});
  }, [tasks]);

  useEffect(() => {
    const handleResize = () =>
      setIsChatbotOpen(
        window.innerWidth > 768 &&
          activeContainer !== "chatbot-container" &&
          !inQuiz
      );
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeContainer, inQuiz]);

  const updateTotalTimeSpentInFirestore = useCallback(async (timeToAddMs) => {
    setTotalTimeSpentInMs((prev) => (prev || 0) + (timeToAddMs || 0));
    // Firestore update logic (commented out in original)
  }, []);

  useEffect(() => {
    const resetProgressIfNoTasks = async () => {
      const user = auth.currentUser;
      if (!user || !userData) return;

      if (
        tasks.length === 0 &&
        (userData.progress > 0 || userData.quizCount > 0)
      ) {
        try {
          setProgress(0);
          setQuizCount(0);
          const userRef = doc(db, "students", user.uid);
          await updateDoc(userRef, {
            progress: 0,
            quizCount: 0,
            lastProgressReset: new Date().toISOString(),
          });
          await updateLeaderboard(user.uid, userData.name, streak, 0);
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith(`taskProgress_${user.uid}_`)) {
              localStorage.removeItem(key);
            }
          });
          if (activeContainer === "tasks-container") {
            setNotifications((prev) => [
              ...prev,
              {
                id: Date.now(),
                type: "info",
                message:
                  "Progress has been reset to 0% as all tasks have been removed by staff.",
              },
            ]);
          }
          // console.log("Progress reset to 0 due to no tasks available");
        } catch (err) {
          console.error("Error resetting progress:", err);
          setError("Failed to reset progress.");
        }
      }
    };

    if (userData && Array.isArray(tasks)) {
      resetProgressIfNoTasks();
    }
  }, [tasks.length, userData, streak]); // `updateLeaderboard` removed from deps

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const currentTime = new Date();
        const sessionDurationMs = currentTime - sessionStartTimeRef.current;
        updateTotalTimeSpentInFirestore(sessionDurationMs);
        sessionStartTimeRef.current = currentTime;
      }
    }, 60000);
    return () => clearInterval(intervalId);
  }, [updateTotalTimeSpentInFirestore]);

  // --- OPTIMIZATION ---
  // This function fetches tasks once, instead of listening.
  const fetchTasks = useCallback(async () => {
    // console.log("Fetching tasks...");
    setLoading((prev) => ({ ...prev, tasks: true }));
    try {
      const tasksRef = doc(db, "tasks", "shared");
      const tasksSnap = await getDoc(tasksRef); // Use getDoc (1 read)
      const fetchedTasks = tasksSnap.exists()
        ? tasksSnap.data().tasks || []
        : [];
      // console.log("Fetched tasks:", fetchedTasks);
      setTasks(fetchedTasks);
      return fetchedTasks;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks.");
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, []);

  // --- OPTIMIZATION ---
  // This function fetches task completion statuses once, instead of listening.
  const fetchTaskStatuses = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return {};
    // console.log("Fetching task statuses for user:", user.uid);
    try {
      const taskStatusRef = collection(db, "students", user.uid, "task_status");
      const taskStatusSnap = await getDocs(taskStatusRef); // Use getDocs
      const taskStatuses = {};
      taskStatusSnap.docs.forEach((doc) => {
        taskStatuses[doc.id] = doc.data();
      });
      // console.log("Fetched task statuses:", taskStatuses);
      setTaskProgress(taskStatuses);
      return taskStatuses;
    } catch (err) {
      console.error("Error fetching task statuses:", err);
      return {};
    }
  }, []);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      // console.log("checkAuthAndFetchData called");
      const user = auth.currentUser;
      if (!user) {
        // console.log("No user, navigating to login");
        navigate("/student-login");
        return;
      }
      // console.log("User found:", user.uid);
      sessionStartTimeRef.current = new Date();
      loginTimeRef.current = new Date();

      // Add timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.warn("Loading timeout reached, showing dashboard anyway");
        setLoading((prev) => ({
          ...prev,
          dashboard: false,
          tasks: false,
          assignments: false,
          goals: false,
          students: false,
        }));
        setError(
          "Some data may not have loaded due to timeout. Please refresh if needed."
        );
      }, 15000); // 15 second timeout

      try {
        setLoading((prev) => ({ ...prev, dashboard: true }));
        const docRef = doc(db, "students", user.uid);
        const docSnap = await getDoc(docRef);

        let fetchedUserData = null;
        let calculatedStreak = 0;
        if (docSnap.exists()) {
          // ... (streak logic)
          fetchedUserData = {
            ...docSnap.data(),
            photoURL: docSnap.data().photoURL || "/default-student.png",
          };
          // console.log("Loaded userData from Firestore:", fetchedUserData);
          setUserData(fetchedUserData);
          setProgress(fetchedUserData.progress || 0);
          setQuizCount(fetchedUserData.quizCount || 0);
          setTotalTimeSpentInMs(fetchedUserData.totalTimeSpentInMs || 0);

          logStudentActivity("login");
          // ... (rest of streak logic)
          const lastLogin = fetchedUserData.lastLogin
            ? new Date(fetchedUserData.lastLogin)
            : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          let currentStreak = fetchedUserData.streak || 0;
          calculatedStreak = currentStreak;
          let shouldWaitFiveMinutes = false;

          if (!lastLogin) {
            calculatedStreak = 1;
            shouldWaitFiveMinutes = true;
          } else if (lastLogin.toDateString() === today.toDateString()) {
            calculatedStreak = currentStreak;
          } else if (lastLogin.toDateString() === yesterday.toDateString()) {
            calculatedStreak = currentStreak + 1;
            shouldWaitFiveMinutes = true;
          } else {
            calculatedStreak = 1;
            shouldWaitFiveMinutes = true;
          }

          if (shouldWaitFiveMinutes) {
            setNewStreakValue(calculatedStreak);
            setPendingStreakUpdate(true);
            setStreak(currentStreak);
          } else {
            setStreak(currentStreak);
            if (currentStreak !== (fetchedUserData.streak || 0)) {
              await updateLeaderboard(
                user.uid,
                fetchedUserData.name,
                currentStreak,
                fetchedUserData.progress || 0
              );
            }
          }
        } else {
          navigate("/student-login");
          return;
        }

        // --- OPTIMIZATION ---
        // Call the new fetchTasks function instead of using onSnapshot.
        const loadedTasks = await fetchTasks();

        // --- OPTIMIZATION ---
        // Call the new fetchTaskStatuses function to load completion status.
        const loadedTaskStatuses = await fetchTaskStatuses();
        // console.log(
        //   "Loaded task statuses (from checkAuthAndFetchData):",
        //   loadedTaskStatuses
        // );

        // Debug: compute per-subject completed/total using the freshly loaded data
        try {
          const tasksBySubjectDebug = (loadedTasks || []).reduce((acc, t) => {
            const subject = t.subject || "General";
            acc[subject] = acc[subject] || [];
            acc[subject].push(t);
            return acc;
          }, {});

          const subjectCounts = {};
          Object.keys(tasksBySubjectDebug).forEach((subject) => {
            const items = tasksBySubjectDebug[subject];
            const total = items.length;
            const completed = items.filter((task) => {
              const taskId =
                task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
              return (
                !!loadedTaskStatuses[taskId]?.completed ||
                task.completedBy?.includes(user.uid)
              );
            }).length;
            subjectCounts[subject] = { completed, total };
          });
          // console.log(
          //   "Subject counts computed right after load:",
          //   subjectCounts
          // );
        } catch (e) {
          console.warn("Failed to compute debug subject counts:", e);
        }

        // --- OPTIMIZATION ---
        // Set up an interval to refresh tasks every 10 minutes.
        const taskInterval = setInterval(fetchTasks, 600000); // 10 minutes

        let loadedGoals = [];
        try {
          const goalsRef = doc(db, "students", user.uid, "goals", "list");
          const goalsSnap = await getDoc(goalsRef); // Use getDoc (1 read)
          loadedGoals = goalsSnap.exists() ? goalsSnap.data().goals || [] : [];
          setGoals(loadedGoals);
          setLoading((prev) => ({ ...prev, goals: false }));
        } catch (goalError) {
          /* ... error handling ... */
          setLoading((prev) => ({ ...prev, goals: false }));
        }

        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef); // Use getDocs (N reads)
        const students = studentsSnap.docs.map((sDoc) => ({
          id: sDoc.id,
          name: sDoc.data().name || "Unknown",
          streak: sDoc.data().streak || 0,
          progress: sDoc.data().progress || 0,
        }));
        setLeaderboard(students);
        setLeaderboard((prev) =>
          prev.map((student) =>
            student.id === user.uid
              ? { ...student, streak: calculatedStreak }
              : student
          )
        );
        setLoading((prev) => ({ ...prev, students: false }));

        // --- OPTIMIZATION ---
        // Recalculate progress based on loaded task statuses (after leaderboard is loaded)
        await updateStudentProgress(
          loadedTaskStatuses,
          loadedGoals,
          loadedTasks,
          quizCount,
          calculatedStreak,
          fetchedUserData
        );
        const assignmentsUnsubscribe = onSnapshot(
          collection(db, "assignments"),
          (snapshot) => {
            // ... (setAssignments logic)
            try {
              setAssignmentsLoading(true);
              const fetchedAssignments = snapshot.docs.map((aDoc) => ({
                id: aDoc.id,
                ...aDoc.data(),
                postedAt: aDoc.data().postedAt?.toDate
                  ? aDoc.data().postedAt.toDate()
                  : new Date(),
                deadline: aDoc.data().deadline?.toDate
                  ? aDoc.data().deadline.toDate()
                  : null,
              }));
              setAssignments(fetchedAssignments);
              const sortedAssignments = [...fetchedAssignments].sort(
                (a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
              );
              setTopAssignments(sortedAssignments.slice(0, 2));
              setAssignmentsLoading(false);
              setLoading((prev) => ({ ...prev, assignments: false })); // Add this line
            } catch (err) {
              /* ... error handling ... */
              setLoading((prev) => ({ ...prev, assignments: false })); // Add this line
            }
          },
          (err) => {
            /* ... error handling ... */
            setLoading((prev) => ({ ...prev, assignments: false })); // Add this line
          }
        );

        // Set assignments loading to false after setting up listener (in case collection is empty)
        setLoading((prev) => ({ ...prev, assignments: false }));

        const circularsRef = collection(db, "circulars");
        const circularsSnap = await getDocs(circularsRef); // Use getDocs
        setCirculars(
          circularsSnap.docs.map((cDoc) => ({ id: cDoc.id, ...cDoc.data() }))
        );

        clearTimeout(loadingTimeout); // Clear timeout on successful load
        setLoading((prev) => ({ ...prev, dashboard: false }));

        return () => {
          // tasksUnsubscribe(); // No longer exists
          clearInterval(taskInterval); // --- OPTIMIZATION ---
          assignmentsUnsubscribe();
          if (sessionStartTimeRef.current) {
            const sessionDurationMs = new Date() - sessionStartTimeRef.current;
            updateTotalTimeSpentInFirestore(sessionDurationMs);
          }
        };
      } catch (err) {
        console.error("Error in checkAuthAndFetchData:", err);
        clearTimeout(loadingTimeout); // Clear timeout on error
        setError(`Failed to load dashboard: ${err.message}`);
        setLoading((prev) => ({ ...prev, dashboard: false }));
      }
    };
    checkAuthAndFetchData();
  }, [
    navigate,
    updateTotalTimeSpentInFirestore,
    fetchTasks,
    fetchTaskStatuses,
  ]); // updateLeaderboard removed

  useEffect(() => {
    if (pendingStreakUpdate && loginTimeRef.current && userData) {
      const timer = setTimeout(async () => {
        const user = auth.currentUser;
        if (user && pendingStreakUpdate) {
          const userRef = doc(db, "students", user.uid);
          await updateDoc(userRef, {
            streak: newStreakValue,
            lastLogin: new Date().toISOString(),
          });
          setStreak(newStreakValue);
          // Update local leaderboard
          setLeaderboard((prevLeaderboard) =>
            prevLeaderboard.map((student) =>
              student.id === user.uid
                ? { ...student, streak: newStreakValue }
                : student
            )
          );
          await updateLeaderboard(
            user.uid,
            userData.name,
            newStreakValue,
            progress
          );
          setPendingStreakUpdate(false);
        }
      }, 300000);
      return () => clearTimeout(timer);
    }
  }, [pendingStreakUpdate, newStreakValue, userData, progress]); // updateLeaderboard removed

  useEffect(() => {
    const staffRef = collection(db, "staff");
    // This listener is fine. Staff list is small and changes infrequently.
    const unsubscribe = onSnapshot(
      staffRef,
      (snapshot) => {
        try {
          const staffData = snapshot.docs.map((sDoc) => ({
            id: sDoc.id,
            ...sDoc.data(),
            photoURL: sDoc.data().photoURL || "/default-staff.png",
          }));
          setStaffList(staffData);
        } catch (err) {
          console.error("Error fetching staff list:", err);
          setError("Failed to load staff list.");
        }
      },
      (err) => {
        console.error("Error in staff snapshot:", err);
        setError("Failed to load staff list.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedStaffId) {
      setMessages([]);
      return;
    }
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const chatId = [selectedStaffId, userId].sort().join("_");
    const messagesRef = doc(db, "messages", chatId);
    // This listener is also fine. It's only active when a chat is open,
    // and it only listens to one document.
    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        // ... (message fetching logic)
        if (docSnap.exists()) {
          const currentMessages = docSnap.data().messages || [];
          setMessages(currentMessages);
          const updatedMessages = currentMessages.map((msg) =>
            msg.sender === "staff" && !msg.read ? { ...msg, read: true } : msg
          );
          if (
            updatedMessages.some(
              (msg, i) => msg.read !== currentMessages[i].read
            )
          ) {
            await setDoc(
              messagesRef,
              { messages: updatedMessages },
              { merge: true }
            );
          }
        } else {
          setMessages([]);
        }
      },
      (err) => {
        /* ... error handling ... */
      }
    );
    return () => unsubscribe();
  }, [selectedStaffId]);

  const updateLeaderboard = async (
    uid,
    name,
    currentStreak,
    currentProgress
  ) => {
    try {
      const leaderboardRef = doc(db, "leaderboard", "class");
      // Get current students
      const docSnap = await getDoc(leaderboardRef);
      let students = [];
      if (docSnap.exists()) {
        students = docSnap.data().students || [];
      }
      const existingIndex = students.findIndex((s) => s.id === uid);
      if (existingIndex !== -1) {
        students[existingIndex] = {
          id: uid,
          name,
          streak: currentStreak,
          progress: currentProgress,
        };
      } else {
        students.push({
          id: uid,
          name,
          streak: currentStreak,
          progress: currentProgress,
        });
      }
      // Use setDoc with merge to avoid preconditions
      await setDoc(leaderboardRef, { students }, { merge: true });
    } catch (error) {
      console.warn("Error updating leaderboard:", error.message);
    }
  };

  const calculateSelfAnalysis = useCallback(() => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    // ... (self analysis logic)
    const completedTasks =
      tasks.length > 0
        ? tasks.filter((t) => t.completedBy?.includes(user.uid)).length
        : 0;
    const totalTasks = tasks.length;
    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const learningRate =
      totalTasks > 0 ? Math.min(progress + taskCompletionRate / 5, 100) : 0;
    const communicationSkill = Math.min(
      messages.filter((m) => m.sender === "student").length * 5,
      100
    );
    const goalCompletionRate =
      goals.length > 0
        ? (goals.filter((g) => g.completed).length / goals.length) * 100
        : 0;
    const quizEngagement = totalTasks > 0 ? Math.min(quizCount * 10, 100) : 0;
    let suggestions = [];
    if (totalTasks === 0) {
      suggestions.push(
        "No tasks available yet. Check back for new assignments."
      );
    } else {
      if (learningRate < 60)
        suggestions.push("Focus on tasks & quizzes to boost learning.");
      if (communicationSkill < 50)
        suggestions.push("Interact more with staff.");
      if (goalCompletionRate < 70 && goals.length > 0)
        suggestions.push("Set & track goals for progress.");
      if (quizEngagement < 50)
        suggestions.push("Take more quizzes to test understanding.");
      if (suggestions.length === 0)
        suggestions.push("You're doing great! Keep it up.");
    }
    setSelfAnalysis({
      learningRate,
      communicationSkill,
      goalCompletionRate,
      quizEngagement,
      timeSpent: formatTimeSpent(totalTimeSpentInMs),
      suggestions: suggestions.join(" "),
    });
  }, [
    progress,
    tasks,
    messages,
    goals,
    quizCount,
    userData,
    totalTimeSpentInMs,
  ]);

  useEffect(() => {
    if (userData) {
      calculateSelfAnalysis();
    }
  }, [calculateSelfAnalysis, userData]);

  const toggleContainer = (containerId) => {
    setActiveContainer((prev) => (prev === containerId ? null : containerId));
    setIsChatbotOpen(
      window.innerWidth > 768 && containerId !== "chatbot-container" && !inQuiz
    );
  };

  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  const copyTopicAndAskAI = (topic, taskId = null) => {
    setCopiedTopic(topic);
    setCurrentTopic(topic);
    setQuizReady(false);
    setInQuiz(false);
    setQuizQuestions([]);
    setShowQuizSetup(false);
    if (taskId) {
      updateTaskProgress(taskId, "copyAndAsk");
    }
    if (window.innerWidth <= 768) {
      setActiveContainer("chatbot-container");
    }
    setIsChatbotOpen(true);
    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "quiz-start",
        message: `Topic "${topic}" copied! You can now ask the AI or start a quiz.`,
        topic: topic,
      },
    ]);
  };

  const startQuizForTopic = (topicContent, taskId = null) => {
    if (!inQuiz) {
      setCurrentTopic(topicContent);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "start-quiz",
          message: `Starting quiz for "${topicContent}"...`,
          topic: topicContent,
        },
      ]);
      setShowQuizSetup(true);
      setActiveContainer("tasks-container");
      logStudentActivity("quiz started", topicContent);
    } else {
      alert(
        "A quiz is already in progress. Please complete it before starting a new one."
      );
    }
  };

  const generateQuizQuestions = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (quizRequestLockRef.current) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          message:
            "Please wait a few seconds before generating another quiz. This helps avoid server overload.",
        },
      ]);
      return;
    }
    setInQuiz(true);
    setQuizReady(false);
    const newQuizCount = quizCount + 1;
    setQuizCount(newQuizCount); // Optimistic update
    if (
      !currentTopic ||
      typeof currentTopic !== "string" ||
      currentTopic.trim().length === 0
    ) {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          message: "Error: No valid topic selected.",
        },
      ]);
      setInQuiz(false);
      return;
    }
    quizRequestLockRef.current = true;
    const quizLockTimeout = setTimeout(() => {
      quizRequestLockRef.current = false;
    }, 12000);

    try {
      // --- OPTIMIZATION ---
      // We no longer update quizCount here. It will be updated
      // in the updateStudentProgress function.
      const requestBody = {
        topic: currentTopic.trim(),
        count: quizNumQuestions,
      };
      const response = await generateQuizWithFallback(requestBody);
      // ... (rest of quiz generation logic)
      if (response.status === 429) {
        // ... 429 error handling
        setInQuiz(false);
        return;
      }
      if (!response.ok) {
        // ... !ok error handling
        throw new Error("Quiz generation failed");
      }
      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setActiveContainer("tasks-container");
      } else {
        throw new Error("No questions generated");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          message: `Failed to generate quiz: ${err.message}. Please try again.`,
        },
      ]);
      setInQuiz(false);
      setCurrentTopic("");
      setQuizQuestions([]);
      setActiveContainer(null);
    } finally {
      setTimeout(() => {
        quizRequestLockRef.current = false;
      }, 12000);
      clearTimeout(quizLockTimeout);
    }
  };

  const handleQuizComplete = async (score) => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      setInQuiz(false);
      const percentage = Math.round((score / quizQuestions.length) * 100);

      // --- OPTIMIZATION ---
      // Find the task, save its completion, and then call the new
      // updateStudentProgress function to recalculate and save everything.

      const completedTask = tasks.find((t) => t.content === currentTopic);
      let updatedTaskProgress = { ...taskProgress };

      if (completedTask) {
        await saveTaskCompletion(completedTask);
        const taskId =
          completedTask?.id ||
          completedTask?.content?.toLowerCase().replace(/\s+/g, "_");
        updatedTaskProgress = {
          ...taskProgress,
          [taskId]: {
            completed: true,
            topic: completedTask.content,
            completedAt: new Date(),
          },
        };
        setTaskProgress(updatedTaskProgress);
      }

      // Call the master progress updater
      await updateStudentProgress(
        updatedTaskProgress,
        goals,
        tasks,
        quizCount + 1, // Pass the new quiz count
        streak,
        userData
      );

      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "quiz-complete",
          message: `Quiz completed! Score: ${percentage}%. Great job!`,
        },
      ]);
      logStudentActivity("quiz completed", currentTopic);

      setCurrentTopic("");
      setQuizQuestions([]);
      setActiveContainer("tasks-container");
    } catch (err) {
      console.error("Error completing quiz:", err);
      setError("Failed to update after quiz completion.");
      setActiveContainer("tasks-container");
    }
  };

  const addNewGoal = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      // ... (get goal form values)
      const title = document.getElementById("goal-title")?.value.trim();
      const type = document.getElementById("goal-type")?.value;
      const subject = document.getElementById("goal-subject")?.value.trim();
      const dueDate = document.getElementById("goal-due-date")?.value;
      const description = document
        .getElementById("goal-description")
        ?.value.trim();
      const priority = document.getElementById("goal-priority")?.value;

      if (!title || !dueDate) {
        alert("Please fill in at least title and due date.");
        return;
      }
      const newGoal = {
        id: Date.now(),
        type,
        title,
        subject,
        dueDate,
        priority,
        description,
        completed: false,
      };
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      const goalsRef = doc(db, "students", user.uid, "goals", "list");
      await setDoc(goalsRef, { goals: updatedGoals });
      logStudentActivity("goal added", subject);
      toggleGoalForm(false);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "goal",
          message: `Goal "${title}" set for ${new Date(
            dueDate
          ).toLocaleDateString()}`,
        },
      ]);

      // --- OPTIMIZATION ---
      // Update progress when a new goal is added (as it changes the denominator)
      await updateStudentProgress(
        taskProgress,
        updatedGoals,
        tasks,
        quizCount,
        streak,
        userData
      );
    } catch (err) {
      console.error("Error adding goal:", err);
      setError("Failed to add goal.");
    }
  };

  const toggleGoalForm = (show) => {
    const form = document.getElementById("add-goal-form");
    const button = document.getElementById("show-add-goal-form");
    if (form && button) {
      form.style.display = show ? "block" : "none";
      button.style.display = show ? "none" : "flex";
    }
  };

  const toggleGoalComplete = async (id) => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      let completedGoalTitle = "";
      const updatedGoals = goals.map((goal) => {
        if (goal.id === id) {
          completedGoalTitle = goal.title;
          return { ...goal, completed: !goal.completed };
        }
        return goal;
      });
      setGoals(updatedGoals);
      const goalsRef = doc(db, "students", user.uid, "goals", "list");
      await setDoc(goalsRef, { goals: updatedGoals });

      // --- OPTIMIZATION ---
      // Call the master progress updater
      await updateStudentProgress(
        taskProgress,
        updatedGoals,
        tasks,
        quizCount,
        streak,
        userData
      );

      const goalJustCompleted = updatedGoals.find(
        (g) => g.id === id
      )?.completed;
      if (goalJustCompleted) {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "goal",
            message: `Goal "${completedGoalTitle}" marked complete!`,
          },
        ]);
      }
    } catch (err) {
      console.error("Error toggling goal completion:", err);
      setError("Failed to toggle goal completion.");
    }
  };

  const deleteGoal = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      if (window.confirm("Are you sure you want to delete this goal?")) {
        // ... (delete goal logic)
        const deletedGoalTitle =
          goals.find((g) => g.id === id)?.title || "Selected goal";
        const updatedGoals = goals.filter((goal) => goal.id !== id);
        setGoals(updatedGoals);
        const goalsRef = doc(db, "students", user.uid, "goals", "list");
        await setDoc(goalsRef, { goals: updatedGoals });
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "goal",
            message: `Goal "${deletedGoalTitle}" deleted.`,
          },
        ]);

        // --- OPTIMIZATION ---
        // Update progress when a goal is deleted (changes denominator)
        await updateStudentProgress(
          taskProgress,
          updatedGoals,
          tasks,
          quizCount,
          streak,
          userData
        );
      }
    } catch (err) {
      console.error("Error deleting goal:", err);
      setError("Failed to delete goal.");
    }
  };

  const handleFeedbackSubmit = async () => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      // ... (feedback submit logic)
      if (!feedbackText.trim()) {
        alert("Please enter feedback before submitting.");
        return;
      }
      const feedbackColRef = collection(db, "students", user.uid, "feedback");
      await addDoc(feedbackColRef, {
        text: feedbackText,
        studentName: userData.name,
        submittedAt: new Date(),
      });
      logStudentActivity("feedback submitted");
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "feedback",
          message: "Feedback submitted successfully!",
        },
      ]);
      setFeedbackText("");
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Failed to submit feedback.");
    }
  };

  const sendOverdueReason = async (task, reason) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      // ... (overdue reason logic)
      if (!task.staffId) throw new Error("Staff ID missing for this task.");
      const staffMember = staffList.find((s) => s.id === task.staffId);
      if (!staffMember) throw new Error("Staff member not found");

      const chatId = [task.staffId, user.uid].sort().join("_");
      const messagesRef = doc(db, "messages", chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists()
        ? messagesSnap.data().messages || []
        : [];
      const newMessage = {
        text: `Reason for not completing task "${task.content}": ${reason}`,
        sender: "student",
        senderId: user.uid,
        timestamp: new Date().toISOString(),
        read: false,
      };
      await setDoc(
        messagesRef,
        { messages: [...existingMessages, newMessage] },
        { merge: true }
      );

      setOverdueTaskReasons((prev) => ({ ...prev, [task.id]: reason }));
      setSelectedStaffId(task.staffId);
      setSelectedStaffName(staffMember.name);
      setShowContactList(false);
      setActiveContainer("staff-interaction-container");
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "overdue",
          message: `Reason for overdue task "${task.content}" sent to ${staffMember.name}.`,
        },
      ]);
    } catch (err) {
      console.error("Error sending overdue reason:", err);
      setError(`Failed to send overdue reason: ${err.message}`);
    }
  };

  const sendMessageToStaff = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      if (!selectedStaffId) {
        alert("Please select a staff member to chat with.");
        return;
      }
      const input = document.getElementById("message-input");
      const text = input?.value.trim();
      if (!text) return;

      const chatId = [selectedStaffId, user.uid].sort().join("_");
      const newMessage = {
        text,
        sender: "student",
        senderId: user.uid,
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
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  }, [selectedStaffId]);

  const deleteMessageFromStaffChat = useCallback(
    async (indexToDelete) => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        if (!selectedStaffId) return;
        const chatId = [selectedStaffId, user.uid].sort().join("_");
        const updatedMessages = messages.filter((_, i) => i !== indexToDelete);
        const messagesRef = doc(db, "messages", chatId);
        await setDoc(messagesRef, { messages: updatedMessages });
      } catch (err) {
        console.error("Error deleting message:", err);
        setError("Failed to delete message.");
      }
    },
    [selectedStaffId, messages]
  );

  const handleEditProfile = () =>
    navigate("/student-form", { state: { isEdit: true, userData } });

  const handleLogout = async () => {
    if (sessionStartTimeRef.current) {
      const sessionDurationMs = new Date() - sessionStartTimeRef.current;
      await updateTotalTimeSpentInFirestore(sessionDurationMs);
      sessionStartTimeRef.current = null;
    }
    logStudentActivity("logout");
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to log out.");
    }
  };

  const toggleSubjectExpansion = (subject) => {
    setExpandedSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const updateTaskProgress = async (taskId, step) => {
    const user = auth.currentUser;
    if (!user) return;

    const progressKey = `taskProgress_${user.uid}_${taskId}`;
    const currentProgress = JSON.parse(
      localStorage.getItem(progressKey) || "{}"
    );
    const updatedProgress = { ...currentProgress, [step]: Date.now() };
    localStorage.setItem(progressKey, JSON.stringify(updatedProgress));
    setTaskProgress((prev) => ({ ...prev, [taskId]: updatedProgress }));

    try {
      const userRef = doc(db, "students", user.uid);
      await updateDoc(userRef, {
        [`taskProgress.${taskId}`]: updatedProgress,
      });
    } catch (error) {
      console.error("Error updating task progress:", error);
    }
  };

  const checkOverdueTasks = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || tasks.length === 0) return;

    const now = Date.now();
    const overdueThreshold = 24 * 60 * 60 * 1000;
    const overdueTasks = [];

    for (const task of tasks) {
      const taskId =
        task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
      const postedDate = new Date(task.date).getTime();
      if (
        !taskProgress[taskId]?.completed &&
        now - postedDate > overdueThreshold
      ) {
        const overdueState = getOverdueState(user.uid, task.id); // Note: getOverdueState might need taskId
        if (!overdueState.submitted && !overdueState.canceledAt) {
          overdueTasks.push(task);
        }
      }
    }
    setOverdueNotifications(overdueTasks);
  }, [tasks, staffList, taskProgress]); // staffList was missing

  useEffect(() => {
    const interval = setInterval(checkOverdueTasks, 60000);
    checkOverdueTasks();
    return () => clearInterval(interval);
  }, [checkOverdueTasks]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || tasks.length === 0) return;
    const allProgress = {};
    tasks.forEach((task) => {
      const taskId =
        task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
      const progressKey = `taskProgress_${user.uid}_${taskId}`;
      const progress = JSON.parse(localStorage.getItem(progressKey) || "{}");
      if (Object.keys(progress).length > 0) {
        allProgress[taskId] = progress;
      }
    });
    setTaskProgress((prev) => ({ ...prev, ...allProgress }));
  }, [tasks]);

  const handleOverdueReasonSubmit = async (task, reason) => {
    const user = auth.currentUser;
    if (!user || !reason.trim()) return;
    try {
      const taskStaff = staffList.find((staff) => staff.id === task.staffId);
      if (taskStaff) {
        const chatId = [user.uid, task.staffId].sort().join("_");
        const messageData = {
          messages: [
            {
              sender: "student",
              senderId: user.uid,
              text: `Overdue Task Reason - "${task.content}" (${
                task.subject || "No Subject"
              }): ${reason}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
          ],
        };
        const chatRef = doc(db, "messages", chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          const existingMessages = chatDoc.data().messages || [];
          await updateDoc(chatRef, {
            messages: [...existingMessages, messageData.messages[0]],
          });
        } else {
          await setDoc(chatRef, messageData);
        }

        const taskId =
          task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
        const reasonKey = `overdueReason_${user.uid}_${taskId}`; // Use consistent taskId
        localStorage.setItem(
          reasonKey,
          JSON.stringify({ reason, submittedAt: Date.now() })
        );
        setOverdueNotifications((prev) => prev.filter((t) => t.id !== task.id));
        logStudentActivity(
          "overdue_reason_submitted",
          task.subject || "Unknown"
        );
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "success",
            message: `Overdue reason submitted successfully to ${taskStaff.name}.`,
          },
        ]);
      } else {
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "error",
            message: "Could not find the staff member who posted this task.",
          },
        ]);
      }
    } catch (err) {
      console.error("Error in handleOverdueReasonSubmit:", err);
    }
    setOverdueNotifications((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleChatbotMessageSent = () => {
    const currentTask = tasks.find((task) => task.content === copiedTopic);
    if (currentTask) {
      const taskId =
        currentTask?.id ||
        currentTask?.content?.toLowerCase().replace(/\s+/g, "_");
      updateTaskProgress(taskId, "chatbotSend");
    }
  };

  useEffect(() => {
    if (
      activeContainer === "news-container" &&
      (selectedCategory !== "general" || news.length === 0)
    ) {
      setSelectedCategory("general");
      setNewsPage(1);
      setHasMoreNews(true);
      setNewsError(null);
      setNews([]);
      fetchNews("general", 1, false);
    }
  }, [activeContainer]); // fetchNews removed from deps

  // --- RENDER ---

  if (showInitialLoading || isDashboardLoading) {
    return (
      <div className="loading-dashboard-container">
        <div className="background-grid"></div>
        <div className="animation-wrapper">
          <div className="core-spinner">
            <i className={loadingIcons[currentIcon]}></i>
          </div>
        </div>
        <div className="loading-message">
          <span className="rainbow-text">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  const currentUserId = auth.currentUser?.uid;

  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <GuideModal
          isOpen={!localStorage.getItem("hasSeenStudentGuide")}
          onClose={() => localStorage.setItem("hasSeenStudentGuide", "true")}
          role="student"
        />
        <Sidebar
          userData={userData}
          role="student"
          toggleContainer={toggleContainer}
          isVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
          setMobileHamburger={setMobileHamburger}
          copiedTopic={copiedTopic}
          clearCopiedTopic={() => setCopiedTopic("")}
          activeContainer={activeContainer}
        />
        <div
          className={`main-content ${sidebarVisible ? "sidebar-active" : ""} ${
            inQuiz ? "quiz-active" : ""
          }`}
        >
          <div className="header">{mobileHamburger}</div>
          {error && <div className="error-message">{error}</div>}
          <div id="main-content-section">
            {!activeContainer && !inQuiz && (
              <DefaultContent
                userData={userData}
                progress={progress}
                streak={streak}
                assignmentsLoading={assignmentsLoading}
                assignmentsError={assignmentsError}
                topAssignments={topAssignments}
                tasksBySubject={tasksBySubject}
                taskProgress={taskProgress}
                leaderboard={leaderboard}
                toggleContainer={toggleContainer}
                setSelectedAssignmentSubject={setSelectedAssignmentSubject}
                setSelectedSubject={setSelectedSubject}
                currentUserId={currentUserId}
              />
            )}

            <TasksContainer
              activeContainer={activeContainer}
              inQuiz={inQuiz}
              currentTopic={currentTopic}
              quizQuestions={quizQuestions}
              handleQuizComplete={handleQuizComplete}
              setInQuiz={setInQuiz}
              setCurrentTopic={setCurrentTopic}
              setQuizQuestions={setQuizQuestions}
              setActiveContainer={setActiveContainer}
              setNotifications={setNotifications}
              showQuizSetup={showQuizSetup}
              quizNumQuestions={quizNumQuestions}
              setQuizNumQuestions={setQuizNumQuestions}
              setShowQuizSetup={setShowQuizSetup}
              generateQuizQuestions={generateQuizQuestions}
              selectedSubject={selectedSubject}
              tasksBySubject={tasksBySubject}
              taskProgress={taskProgress}
              copyTopicAndAskAI={copyTopicAndAskAI}
              startQuizForTopic={startQuizForTopic}
              updateTaskProgress={updateTaskProgress}
              setSelectedSubject={setSelectedSubject}
              currentUserId={currentUserId}
            />

            <GoalsContainer
              activeContainer={activeContainer}
              toggleGoalForm={toggleGoalForm}
              addNewGoal={addNewGoal}
              goals={goals}
              toggleGoalComplete={toggleGoalComplete}
              deleteGoal={deleteGoal}
            />

            <StreakContainer
              activeContainer={activeContainer}
              streak={streak}
              progress={progress}
              leaderboard={leaderboard}
              currentUserId={currentUserId}
            />

            <AssignmentsContainer
              activeContainer={activeContainer}
              selectedAssignmentSubject={selectedAssignmentSubject}
              assignmentsLoading={assignmentsLoading}
              assignmentsError={assignmentsError}
              assignmentsBySubject={assignmentsBySubject}
              setSelectedAssignmentSubject={setSelectedAssignmentSubject}
            />

            <CircularContainer
              activeContainer={activeContainer}
              circulars={circulars}
            />

            <NewsContainer
              activeContainer={activeContainer}
              selectedCategory={selectedCategory}
              handleCategoryChange={handleCategoryChange}
              newsCategories={newsCategories}
              handleNewsRefresh={handleNewsRefresh}
              newsLoading={newsLoading}
              newsError={newsError}
              news={news}
              hasMoreNews={hasMoreNews}
              handleLoadMore={handleLoadMore}
            />

            <YoutubeContainer activeContainer={activeContainer} />

            <StaffInteractionContainer
              activeContainer={activeContainer}
              messages={messages}
              selectedStaffId={selectedStaffId}
              selectedStaffName={selectedStaffName}
              staffList={staffList}
              sendMessageToStaff={sendMessageToStaff}
              deleteMessageFromStaffChat={deleteMessageFromStaffChat}
              showContactList={showContactList}
              setShowContactList={setShowContactList}
              setSelectedStaffId={setSelectedStaffId}
              setSelectedStaffName={setSelectedStaffName}
              currentUserId={currentUserId}
            />

            <SelfAnalysisContainer
              activeContainer={activeContainer}
              selfAnalysis={selfAnalysis}
              feedbackText={feedbackText}
              setFeedbackText={setFeedbackText}
              handleFeedbackSubmit={handleFeedbackSubmit}
            />

            <SettingsContainer
              activeContainer={activeContainer}
              handleEditProfile={handleEditProfile}
              handleLogout={handleLogout}
              setActiveContainer={setActiveContainer}
            />

            <AboutContainer
              activeContainer={activeContainer}
              setActiveContainer={setActiveContainer}
            />

            <ChatbotContainer
              activeContainer={activeContainer}
              copiedTopic={copiedTopic}
              setCopiedTopic={setCopiedTopic}
              inQuiz={inQuiz}
              handleChatbotMessageSent={handleChatbotMessageSent}
            />

            <NotesContainer
              activeContainer={activeContainer}
              toggleContainer={toggleContainer}
              logStudentActivity={logStudentActivity}
              userData={userData}
            />

            <StudyTimerContainer activeContainer={activeContainer} />

            {quizReady && !inQuiz && (
              <div className="quiz-prompt">
                <p>Start a quiz on "{currentTopic}"?</p>
                <button onClick={generateQuizQuestions}>Start Quiz</button>
                <button
                  onClick={() => {
                    setQuizReady(false);
                    setCurrentTopic("");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="notifications">
            {overdueNotifications.map((task) => (
              <OverdueTaskNotification
                key={`overdue-${task.id}`}
                task={task}
                onSubmitReason={handleOverdueReasonSubmit}
                onClose={() =>
                  setOverdueNotifications((prev) =>
                    prev.filter((t) => t.id !== task.id)
                  )
                }
              />
            ))}

            {notifications.map((notif, index) => {
              // ... (notification rendering logic)
              return (
                <Notification
                  key={`${notif.id || "notif"}-${index}`}
                  message={notif.message}
                  onClose={() =>
                    setNotifications((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                />
              );
            })}
          </div>

          {window.innerWidth > 768 && (
            <Chatbot
              isVisible={isChatbotOpen && !inQuiz}
              copiedTopic={copiedTopic}
              clearCopiedTopic={() => setCopiedTopic("")}
              isInContainer={false}
              isQuizActive={inQuiz}
              onMessageSent={handleChatbotMessageSent}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;
