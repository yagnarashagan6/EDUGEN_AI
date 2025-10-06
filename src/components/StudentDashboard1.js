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

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return <h1>Something went wrong. Please refresh the page.</h1>;
  }
  return children;
};

const ChatInterface = ({
  messages,
  selectedStaffId,
  selectedStaffName,
  staffList,
  sendMessage,
  deleteMessage,
  showContactList,
  setShowContactList,
  setSelectedStaffId,
  setSelectedStaffName,
  currentUserId,
}) => {
  const selectStaff = useCallback(
    (staff) => {
      setSelectedStaffId(staff.id);
      setSelectedStaffName(staff.name);
      setShowContactList(false);
    },
    [setSelectedStaffId, setSelectedStaffName, setShowContactList]
  );

  const formatDate = (dateString) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(dateString);

    if (messageDate.toDateString() === today.toDateString()) return "Today";
    if (messageDate.toDateString() === yesterday.toDateString())
      return "Yesterday";
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const groupedMessages = messages.reduce((acc, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(message);
    return acc;
  }, {});

  return (
    <div className="chat-interface">
      <div className="chat-body">
        {showContactList ? (
          <div className="contact-list scrollable">
            <div className="contact-list-header">Staff Members</div>
            <div className="contact-list-body">
              {staffList.filter(
                (staff) => staff.name && staff.name.trim() !== ""
              ).length === 0 ? (
                <p className="empty-message">Loading staff members...</p>
              ) : (
                staffList
                  .filter((staff) => staff.name && staff.name.trim() !== "")
                  .map((staff) => (
                    <div
                      key={staff.id}
                      className={`contact-item ${
                        selectedStaffId === staff.id ? "active" : ""
                      }`}
                      onClick={() => selectStaff(staff)}
                    >
                      <div className="contact-info">
                        <h4>{staff.name}</h4>
                        <p>{staff.role || "Available"}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="chat-container full-container">
            <div className="chat-header">
              <button
                onClick={() => setShowContactList(true)}
                className="toggle-contact-btn"
              >
                Back to List
              </button>
              {selectedStaffId && (
                <>
                  <img
                    src={
                      staffList.find((s) => s.id === selectedStaffId)
                        ?.photoURL || "/default-staff.png"
                    }
                    alt="Staff"
                    className="recipient-avatar"
                    onError={(e) => (e.target.src = "/default-staff.png")}
                  />
                  <div className="recipient-info">
                    <h3>{selectedStaffName}</h3>
                    <p className="status">Online</p>
                  </div>
                </>
              )}
            </div>
            <div className="messages-container scrollable">
              {selectedStaffId ? (
                Object.keys(groupedMessages).length === 0 ? (
                  <p className="empty-message">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  Object.keys(groupedMessages).map((dateKey) => (
                    <div key={dateKey}>
                      <div className="date-separator">
                        {formatDate(dateKey)}
                      </div>
                      {groupedMessages[dateKey].map((msg, index) => (
                        <div
                          key={`${msg.timestamp}-${index}`}
                          className={`message-bubble ${
                            msg.sender === "student" ? "sent" : "received"
                          }`}
                          onClick={() => {
                            if (
                              msg.sender === "student" &&
                              window.confirm("Delete this message?")
                            ) {
                              deleteMessage(index);
                            }
                          }}
                        >
                          <div className="message-content">{msg.text}</div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {msg.sender === "student" && (
                              <span className="message-status">
                                {msg.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )
              ) : (
                <p className="empty-message">
                  Select a staff member to start chatting.
                </p>
              )}
            </div>
            {selectedStaffId && (
              <div className="message-input-area">
                <input
                  type="text"
                  id="message-input"
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="message-input-field"
                />
                <button onClick={sendMessage} className="send-message-button">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// AssignmentItem for MAIN CONTENT AREA (assignment name left, marks right in a bubble)
const AssignmentSummaryCard = ({ assignment }) => {
  const [marks, setMarks] = useState(null);
  const [marksLoading, setMarksLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const marksRef = doc(db, "students", user.uid, "marks", assignment.id);
        const marksSnap = await getDoc(marksRef);
        if (marksSnap.exists()) {
          setMarks(marksSnap.data());
        }
        setMarksLoading(false);
      } catch (err) {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [assignment.id]);

  return (
    <div
      className="task-item"
      style={{
        marginBottom: "10px",
        cursor: "default",
        minWidth: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingRight: 16,
        paddingLeft: 16,
      }}
    >
      <h3 style={{ margin: 0, flex: 1 }}>{assignment.subject}</h3>
      <div
        style={{
          minWidth: 60,
          marginLeft: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "#e3f2fd",
            color: "#1976d2",
            borderRadius: "50%",
            minWidth: 44,
            minHeight: 44,
            fontWeight: 700,
            fontSize: 18,
            lineHeight: "44px",
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.10)",
            border: "2px solid #90caf9",
            padding: "0 10px",
          }}
        >
          {marksLoading ? (
            <span style={{ color: "#888", fontWeight: 400, fontSize: 14 }}>
              ...
            </span>
          ) : marks && marks.marks !== undefined ? (
            marks.marks
          ) : (
            <span style={{ color: "#888", fontWeight: 400, fontSize: 12 }}>
              N/A
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

// AssignmentItem for ASSIGNMENTS CONTAINER (show full details)
const AssignmentItem = ({ assignment }) => {
  const [marks, setMarks] = useState(null);
  const [marksLoading, setMarksLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const marksRef = doc(db, "students", user.uid, "marks", assignment.id);
        const marksSnap = await getDoc(marksRef);
        if (marksSnap.exists()) {
          setMarks(marksSnap.data());
        }
        setMarksLoading(false);
      } catch (err) {
        setMarksLoading(false);
      }
    };
    fetchMarks();
  }, [assignment.id]);

  return (
    <div className="task-item" style={{ marginBottom: "10px" }}>
      <div className="task-header">
        <h3>
          <a
            href={assignment.driveLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1976d2", textDecoration: "underline" }}
            title="Open assignment link"
            onClick={(e) => e.stopPropagation()}
          >
            {assignment.subject}
          </a>
        </h3>
      </div>
      <p>
        <b>Deadline:</b>{" "}
        {assignment.deadline
          ? new Date(assignment.deadline).toLocaleDateString()
          : "N/A"}
      </p>
      <p>
        <b>Posted At:</b>{" "}
        {assignment.postedAt
          ? new Date(assignment.postedAt).toLocaleDateString()
          : "N/A"}
      </p>
      <div style={{ fontWeight: 600, color: "#4CAF50", marginTop: 8 }}>
        {marksLoading
          ? "Loading marks..."
          : marks && marks.marks !== undefined
          ? `Marks: ${marks.marks}`
          : "Marks: Not assigned yet"}
      </div>
    </div>
  );
};

const Leaderboard = ({ students, showStats = false, currentUserId }) => {
  const filteredStudents = students.filter(
    (student) => student.name !== "Unknown"
  );
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;
    return (b.streak || 0) - (a.streak || 0);
  });

  return (
    <div className="leaderboard">
      <h3>Class Leaderboard</h3>
      <ul>
        {sortedStudents.map((student, index) => (
          <li
            key={student.id}
            className={
              student.id === currentUserId ? "current-user-leaderboard" : ""
            }
          >
            <span>
              {index + 1}. {student.name}{" "}
              {student.id === currentUserId ? "(You)" : ""}
            </span>
            <span>
              Streak: {student.streak || 0} | Progress:{" "}
              {Math.round(student.progress || 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

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

  // News categories
  const newsCategories = [
    { value: "general", label: "General" },
    { value: "technology", label: "Technology" },
    { value: "education", label: "Education" },
    { value: "science", label: "Science" },
    { value: "health", label: "Health" },
    { value: "business", label: "Business" },
    { value: "sports", label: "Sports" },
    { value: "entertainment", label: "Entertainment" },
  ];

  // Fetch news function with better pagination and Indian news support
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
      const apiKey = process.env.REACT_APP_GNEWS_API_KEY;

      if (!apiKey) {
        throw new Error("News API key is not configured");
      }

      // Use both US and Indian sources for better coverage
      const countries = ["us", "in"]; // US and India
      let allArticles = [];

      for (const country of countries) {
        try {
          const response = await fetch(
            `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=${country}&max=5&page=${page}&apikey=${apiKey}`
          );

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Invalid API key");
            } else if (response.status === 429) {
              throw new Error("Too many requests. Please try again later.");
            }
            continue; // Skip this country if there's an error
          }

          const data = await response.json();
          if (data.articles && data.articles.length > 0) {
            allArticles = [...allArticles, ...data.articles];
          }
        } catch (countryError) {
          console.warn(`Error fetching news from ${country}:`, countryError);
          continue;
        }
      }

      // Remove duplicates based on title and URL
      const uniqueArticles = allArticles.filter(
        (article, index, self) =>
          index ===
          self.findIndex(
            (a) => a.title === article.title || a.url === article.url
          )
      );

      // Sort by publication date (newest first)
      uniqueArticles.sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );

      if (uniqueArticles.length > 0) {
        if (loadMore) {
          // Check if we already have these articles to avoid duplicates
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

        // Set hasMoreNews based on whether we got articles
        setHasMoreNews(uniqueArticles.length >= 8); // Reduced threshold
      } else {
        if (!loadMore) {
          setNews([]);
        }
        setHasMoreNews(false);
      }
    } catch (err) {
      console.error("Error fetching news:", err);
      setNewsError(`Failed to fetch news: ${err.message}`);
      if (!loadMore) {
        setNews([]);
      }
    } finally {
      setNewsLoading(false);
    }
  };

  // Handle category change with reset
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setNewsPage(1); // Reset to page 1
    setHasMoreNews(true);
    setNewsError(null);
    setNews([]); // Clear existing news
    fetchNews(category, 1, false);
  };

  // Handle refresh with reset
  const handleNewsRefresh = () => {
    setNewsPage(1); // Reset to page 1
    setHasMoreNews(true);
    setNewsError(null);
    setNews([]); // Clear existing news
    fetchNews(selectedCategory, 1, false);
  };

  // Handle load more with incremented page
  const handleLoadMore = () => {
    if (hasMoreNews && !newsLoading) {
      const nextPage = newsPage + 1;
      setNewsPage(nextPage);
      fetchNews(selectedCategory, nextPage, true);
    }
  };

  const logStudentActivity = async (activityType, subject = "N/A") => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      await addDoc(collection(db, "student_activities"), {
        name: userData.name || "Unknown Student",
        studentId: user.uid,
        activity: activityType,
        subject: subject,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Error logging student activity:", err);
    }
  };

  useEffect(() => {
    setMobileHamburger(
      <button
        className="mobile-hamburger"
        onClick={() => setSidebarVisible(true)}
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

  const formatTimeSpent = (ms) => {
    if (ms <= 0) return "0 minutes";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let readableTime = "";
    if (hours > 0) readableTime += `${hours} hour${hours > 1 ? "s" : ""} `;
    if (minutes > 0 || hours === 0)
      readableTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
    return readableTime.trim() || "Less than a minute";
  };

  // Temporarily disable updating total time spent in Firestore
  const updateTotalTimeSpentInFirestore = useCallback(async (timeToAddMs) => {
    // Disabled: setTotalTimeSpentInMs will still update local state, but no Firestore writes
    setTotalTimeSpentInMs((prev) => (prev || 0) + (timeToAddMs || 0));
    // If you want to re-enable, restore the code below:
    /*
    const user = auth.currentUser;
    if (!user || timeToAddMs <= 0) return;
    try {
      const userRef = doc(db, 'students', user.uid);
      const currentTotalMs = totalTimeSpentInMs || 0;
      const newTotalMs = currentTotalMs + timeToAddMs;
      await updateDoc(userRef, { totalTimeSpentInMs: newTotalMs });
      setTotalTimeSpentInMs(newTotalMs);
    } catch (err) {
      console.error("Error updating total time spent in Firestore:", err);
    }
    */
  }, []);

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

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/student-login");
        return;
      }
      sessionStartTimeRef.current = new Date();
      loginTimeRef.current = new Date();

      try {
        const docRef = doc(db, "students", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          if (!docSnap.data().formFilled) {
            navigate("/student-form");
            return;
          }
          const fetchedUserData = {
            ...docSnap.data(),
            photoURL: docSnap.data().photoURL || "/default-student.png",
          };
          setUserData(fetchedUserData);
          setProgress(fetchedUserData.progress || 0);
          setQuizCount(fetchedUserData.quizCount || 0);
          setTotalTimeSpentInMs(fetchedUserData.totalTimeSpentInMs || 0);

          logStudentActivity("login");

          const lastLogin = fetchedUserData.lastLogin
            ? new Date(fetchedUserData.lastLogin)
            : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          let currentStreak = fetchedUserData.streak || 0;
          let calculatedStreak = currentStreak;
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

        const tasksUnsubscribe = onSnapshot(
          doc(db, "tasks", "shared"),
          (tasksSnap) => {
            if (tasksSnap.exists()) {
              const fetchedTasks = tasksSnap.data().tasks || [];
              setTasks(fetchedTasks);
            } else {
              setTasks([]);
            }
          },
          (err) => {
            console.error("Error fetching tasks:", err);
            setError("Failed to load tasks: " + err.message);
          }
        );

        try {
          const goalsRef = doc(db, "students", user.uid, "goals", "list");
          const goalsSnap = await getDoc(goalsRef);
          if (goalsSnap.exists()) setGoals(goalsSnap.data().goals || []);
        } catch (goalError) {
          console.warn(
            "Could not fetch goals, check Firestore rules:",
            goalError
          );
        }

        const studentsRef = collection(db, "students");
        const studentsSnap = await getDocs(studentsRef);
        const students = studentsSnap.docs.map((sDoc) => ({
          id: sDoc.id,
          name: sDoc.data().name || "Unknown",
          streak: sDoc.data().streak || 0,
          progress: sDoc.data().progress || 0,
        }));
        setLeaderboard(students);

        const assignmentsUnsubscribe = onSnapshot(
          collection(db, "assignments"),
          (snapshot) => {
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

              // Sort by postedAt (descending) and pick top 2
              const sortedAssignments = [...fetchedAssignments].sort(
                (a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
              );
              setTopAssignments(sortedAssignments.slice(0, 2));
              setAssignmentsLoading(false);
            } catch (err) {
              console.error("Error fetching assignments:", err);
              setAssignmentsError("Failed to load assignments: " + err.message);
              setAssignmentsLoading(false);
            }
          },
          (err) => {
            console.error("Error in assignments snapshot:", err);
            setAssignmentsError(`Failed to load assignments: ${err.message}`);
            setAssignmentsLoading(false);
          }
        );

        const circularsRef = collection(db, "circulars");
        const circularsSnap = await getDocs(circularsRef);
        setCirculars(
          circularsSnap.docs.map((cDoc) => ({ id: cDoc.id, ...cDoc.data() }))
        );

        return () => {
          tasksUnsubscribe();
          assignmentsUnsubscribe();
          if (sessionStartTimeRef.current) {
            const sessionDurationMs = new Date() - sessionStartTimeRef.current;
            updateTotalTimeSpentInFirestore(sessionDurationMs);
          }
        };
      } catch (err) {
        console.error("Error in checkAuthAndFetchData:", err);
        setError(`Failed to load dashboard: ${err.message}`);
      }
    };
    checkAuthAndFetchData();
  }, [navigate, updateTotalTimeSpentInFirestore]);

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
  }, [pendingStreakUpdate, newStreakValue, userData, progress]);

  useEffect(() => {
    const staffRef = collection(db, "staff");
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

    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
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
        console.error("Error in message snapshot:", err);
        setError("Failed to load messages.");
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
      await runTransaction(db, async (transaction) => {
        const leaderboardSnap = await transaction.get(leaderboardRef);
        let students = leaderboardSnap.exists()
          ? leaderboardSnap.data().students || []
          : [];
        const studentIndex = students.findIndex((s) => s.id === uid);
        if (studentIndex !== -1) {
          students[studentIndex] = {
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
        transaction.set(leaderboardRef, { students });
      });
      setLeaderboard((prev) => {
        const newLeaderboard = [...prev];
        const studentIndex = newLeaderboard.findIndex((s) => s.id === uid);
        if (studentIndex !== -1) {
          newLeaderboard[studentIndex] = {
            id: uid,
            name,
            streak: currentStreak,
            progress: currentProgress,
          };
        } else {
          newLeaderboard.push({
            id: uid,
            name,
            streak: currentStreak,
            progress: currentProgress,
          });
        }
        return newLeaderboard.sort(
          (a, b) =>
            (b.progress || 0) - (a.progress || 0) ||
            (b.streak || 0) - (a.streak || 0)
        );
      });
    } catch (err) {
      console.error("Error updating leaderboard:", err);
    }
  };

  const calculateSelfAnalysis = useCallback(() => {
    const user = auth.currentUser;
    if (!user || !userData) return;

    const completedTasks = tasks.filter((t) =>
      t.completedBy?.includes(user.uid)
    ).length;
    const totalTasks = tasks.length;
    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const learningRate = Math.min(progress + taskCompletionRate / 5, 100);
    const communicationSkill = Math.min(
      messages.filter((m) => m.sender === "student").length * 5,
      100
    );
    const goalCompletionRate =
      goals.length > 0
        ? (goals.filter((g) => g.completed).length / goals.length) * 100
        : 0;
    const quizEngagement = Math.min(quizCount * 10, 100);

    let suggestions = [];
    if (learningRate < 60)
      suggestions.push("Focus on tasks & quizzes to boost learning.");
    if (communicationSkill < 50) suggestions.push("Interact more with staff.");
    if (goalCompletionRate < 70 && goals.length > 0)
      suggestions.push("Set & track goals for progress.");
    if (quizEngagement < 50)
      suggestions.push("Take more quizzes to test understanding.");
    if (suggestions.length === 0)
      suggestions.push("You're doing great! Keep it up.");

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

  const copyTopicAndAskAI = (topic) => {
    setCopiedTopic(topic);
    setCurrentTopic(topic);
    setQuizReady(false);
    setInQuiz(false); // Reset quiz state
    setQuizQuestions([]); // Clear any existing questions
    setShowQuizSetup(false); // Don't show quiz setup modal here

    // Go to chatbot container
    setActiveContainer("chatbot-container");
    setIsChatbotOpen(true);

    // Show notification in chatbot to start quiz
    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "quiz-start",
        message: `Ready to start a quiz on "${topic}"?`,
        topic: topic,
      },
    ]);
  };

  const startQuizForTopic = (topicContent) => {
    if (!inQuiz) {
      setCurrentTopic(topicContent);
      setQuizReady(true);
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
    setInQuiz(true);
    setQuizReady(false);

    const newQuizCount = quizCount + 1;
    setQuizCount(newQuizCount);

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

    try {
      // Update quiz count in database
      const userRef = doc(db, "students", user.uid);
      await updateDoc(userRef, { quizCount: newQuizCount });

      // Generate AI quiz questions
      const requestBody = {
        topic: currentTopic.trim(),
        count: quizNumQuestions, // Use the selected number of questions
      };

      console.log("Sending quiz request:", requestBody);

      const response = await fetch(
        process.env.NODE_ENV === "production"
          ? "https://edugen-backend-zbjr.onrender.com/api/generate-quiz"
          : "http://localhost:10000/api/generate-quiz",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setActiveContainer("tasks-container"); // Show the quiz in tasks container
        // No notification for quiz generation success
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
    }
  };

  const handleQuizComplete = async (score) => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      setInQuiz(false);
      const percentage = Math.round((score / quizQuestions.length) * 100);
      const newProgress = Math.min(progress + percentage / 10, 100);
      setProgress(newProgress);

      const userRef = doc(db, "students", user.uid);
      await updateDoc(userRef, { progress: newProgress });

      const tasksRef = doc(db, "tasks", "shared");
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) {
        const updatedTasks = (tasksSnap.data().tasks || []).map((task) =>
          task.content === currentTopic && !task.completedBy?.includes(user.uid)
            ? {
                ...task,
                completedBy: [...(task.completedBy || []), user.uid],
                completed: true,
              }
            : task
        );
        await setDoc(tasksRef, { tasks: updatedTasks });
        setTasks(updatedTasks);
      }

      await updateLeaderboard(user.uid, userData.name, streak, newProgress);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "quiz",
          message: `Quiz completed! Score: ${percentage}%`,
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

      const goalJustCompleted = updatedGoals.find(
        (g) => g.id === id
      )?.completed;
      if (goalJustCompleted) {
        const newProgress = Math.min(progress + 5, 100);
        setProgress(newProgress);
        await updateDoc(doc(db, "students", user.uid), {
          progress: newProgress,
        });
        await updateLeaderboard(user.uid, userData.name, streak, newProgress);
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

  if (!userData) {
    return (
      <div className="loading-dashboard">Loading Student Dashboard...</div>
    );
  }

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
        />
        <div
          className={`main-content ${sidebarVisible ? "sidebar-active" : ""} ${
            inQuiz ? "quiz-active" : ""
          }`}
        >
          <div className="header">
            {mobileHamburger}
            <input
              type="text"
              className="search-bar"
              placeholder="What do you want to learn today?"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div id="main-content-section">
            {!activeContainer && !inQuiz && (
              <div id="default-content" className="default-content">
                <div
                  className="profile-content"
                  onClick={() => toggleContainer("self-analysis-container")}
                >
                  <h3>Your Profile</h3>
                  <p>
                    Hi {userData?.name || "Student"}, you have completed{" "}
                    <b>{Math.round(progress)}%</b> of weekly targets. Your
                    current streak: <b>{streak}</b> days! 🔥
                  </p>
                </div>
                <h3>Your Assignments</h3>
                <div className="assignments-preview scrollable-x">
                  {assignmentsLoading && <p>Loading assignments...</p>}
                  {assignmentsError && (
                    <p className="error-message">{assignmentsError}</p>
                  )}
                  {!assignmentsLoading &&
                  !assignmentsError &&
                  topAssignments.length > 0
                    ? topAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setSelectedAssignmentSubject(
                              assignment.subject || "Uncategorized"
                            );
                            setActiveContainer("assignments-container");
                          }}
                        >
                          <AssignmentSummaryCard assignment={assignment} />
                        </div>
                      ))
                    : !assignmentsLoading &&
                      !assignmentsError && (
                        <p className="empty-message">
                          No new assignments from staff.
                        </p>
                      )}
                </div>
                <h3>Your Subjects (Tasks)</h3>
                <div className="subjects-grid assignments scrollable-x">
                  {Object.keys(tasksBySubject).length > 0 ? (
                    Object.keys(tasksBySubject).map((subject) => (
                      <div
                        key={subject}
                        className="assignment-box"
                        style={{ backgroundColor: "#c5cae9" }}
                        onClick={() => {
                          setSelectedSubject(subject);
                          setActiveContainer("tasks-container");
                        }}
                      >
                        {subject} ({tasksBySubject[subject].length})
                      </div>
                    ))
                  ) : (
                    <p className="empty-message">No tasks assigned yet.</p>
                  )}
                </div>
                <Leaderboard
                  students={leaderboard}
                  showStats={false}
                  currentUserId={auth.currentUser?.uid}
                />
              </div>
            )}
            <div
              id="tasks-container"
              className={`toggle-container ${
                activeContainer === "tasks-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                {selectedSubject ? (
                  <span>Tasks in {selectedSubject}</span>
                ) : (
                  "Posted Tasks"
                )}
              </div>
              <div className="container-body scrollable">
                {inQuiz && activeContainer === "tasks-container" ? (
                  quizQuestions.length > 0 ? (
                    <Quiz
                      topic={currentTopic}
                      questions={quizQuestions}
                      handleQuizComplete={handleQuizComplete}
                      handleQuizCancel={() => {
                        setInQuiz(false);
                        setCurrentTopic("");
                        setQuizQuestions([]);
                        setActiveContainer(null);
                        // Add notification after cancel
                        setNotifications((prev) => [
                          ...prev,
                          {
                            id: Date.now(),
                            type: "info",
                            message:
                              "Quiz generation cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                          },
                        ]);
                      }}
                    />
                  ) : (
                    <div className="quiz-loading">
                      <div className="loading-spinner">
                        <i className="fas fa-spinner fa-spin"></i>
                      </div>
                      <p>
                        Generating AI quiz questions for "{currentTopic}"...
                      </p>
                      <p>This may take a moment.</p>
                      <button
                        className="cancel-quiz-btn"
                        onClick={() => {
                          setInQuiz(false);
                          setCurrentTopic("");
                          setQuizQuestions([]);
                          setActiveContainer(null);
                          // Add notification after cancel
                          setNotifications((prev) => [
                            ...prev,
                            {
                              id: Date.now(),
                              type: "info",
                              message:
                                "Quiz generation cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                            },
                          ]);
                        }}
                        style={{
                          marginTop: "20px",
                          padding: "10px 20px",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Cancel Quiz Generation
                      </button>
                    </div>
                  )
                ) : null}
                {showQuizSetup ? (
                  <div className="quiz-setup-modal">
                    <h3>Set Up Quiz for "{currentTopic}"</h3>
                    <div className="quiz-setup-content">
                      <label htmlFor="quiz-num-questions">
                        Number of Questions (3-10):
                      </label>
                      <input
                        type="number"
                        id="quiz-num-questions"
                        min="3"
                        max="10"
                        value={quizNumQuestions}
                        onChange={(e) =>
                          setQuizNumQuestions(parseInt(e.target.value))
                        }
                        className="quiz-num-input"
                      />
                    </div>
                    <div className="quiz-setup-buttons">
                      <button
                        className="start-quiz-btn"
                        onClick={() => {
                          if (quizNumQuestions >= 3 && quizNumQuestions <= 10) {
                            setShowQuizSetup(false);
                            generateQuizQuestions();
                          } else {
                            alert("Please enter a number between 3 and 10.");
                          }
                        }}
                      >
                        Start Quiz
                      </button>
                      <button
                        className="cancel-setup-btn"
                        onClick={() => {
                          setShowQuizSetup(false);
                          setCurrentTopic("");
                          setNotifications((prev) => [
                            ...prev,
                            {
                              id: Date.now(),
                              type: "info",
                              message:
                                "Quiz setup cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                            },
                          ]);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedSubject ? (
                  <div className="subject-tasks">
                    {(tasksBySubject[selectedSubject] || []).length === 0 ? (
                      <p className="empty-message">
                        No tasks available for {selectedSubject}.
                      </p>
                    ) : (
                      tasksBySubject[selectedSubject].map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          role="student"
                          onCopy={copyTopicAndAskAI}
                          onStartQuiz={() => {
                            setPendingQuizTask(task);
                            setNotifications((prev) => [
                              ...prev,
                              {
                                id: Date.now(),
                                type: "quiz",
                                message: `Start a quiz on "${task.content}"?`,
                                task,
                              },
                            ]);
                          }}
                        />
                      ))
                    )}
                    {/* Move the back button here, at the bottom */}
                    <div style={{ marginTop: 24, textAlign: "center" }}>
                      <button
                        className="back-btn small"
                        onClick={() => setSelectedSubject(null)}
                      >
                        Back to All Subjects
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(tasksBySubject).map((subject) => (
                      <div
                        key={subject}
                        className={`subject-card ${
                          expandedSubjects[subject] ? "active" : ""
                        }`}
                        onClick={() => setSelectedSubject(subject)}
                      >
                        <h3>
                          {subject} ({tasksBySubject[subject].length})
                        </h3>
                      </div>
                    ))}
                    {Object.keys(tasksBySubject).length === 0 && (
                      <p className="empty-message">No tasks available.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              id="goals-container"
              className={`toggle-container ${
                activeContainer === "goals-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Your Goals</div>
              <div className="container-body scrollable">
                <button
                  id="show-add-goal-form"
                  className="add-goal-btn"
                  onClick={() => toggleGoalForm(true)}
                >
                  <i className="fas fa-plus"></i> Add New Goal
                </button>
                <div
                  id="add-goal-form"
                  className="add-goal-form"
                  style={{ display: "none" }}
                >
                  <h3>Add New Goal</h3>
                  <input type="text" id="goal-title" placeholder="Goal title" />
                  <select id="goal-type" className="goal-select">
                    <option value="">Select type</option>
                    <option value="academic">Academic</option>
                    <option value="extracurricular">Extracurricular</option>
                    <option value="personal">Personal</option>
                  </select>
                  <input
                    type="text"
                    id="goal-subject"
                    placeholder="Subject (optional)"
                  />
                  <input type="date" id="goal-due-date" className="goal-date" />
                  <textarea
                    id="goal-description"
                    placeholder="Description (optional)"
                    className="goal-input"
                  ></textarea>
                  <select id="goal-priority" className="goal-select">
                    <option value="">Select priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button
                    onClick={addNewGoal}
                    className="add-goal-btn"
                    id="submit-new-goal"
                  >
                    <i className="fas fa-check"></i> Set Goal
                  </button>
                  <button
                    onClick={() => toggleGoalForm(false)}
                    className="add-goal-btn cancel"
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
                {goals.length === 0 ? (
                  <p className="empty-message">No goals set yet.</p>
                ) : (
                  goals.map((goal) => (
                    <GoalItem
                      key={goal.id}
                      goal={goal}
                      onToggleComplete={toggleGoalComplete}
                      onDelete={deleteGoal}
                    />
                  ))
                )}
              </div>
            </div>
            <div
              id="streak-container"
              className={`toggle-container ${
                activeContainer === "streak-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Class Leaderboard</div>
              <div className="container-body scrollable">
                <p>Your Streak: {Math.round(streak)} days</p>
                <p>Your Progress: {Math.round(progress)}%</p>
                <Leaderboard
                  students={leaderboard}
                  showStats={true}
                  currentUserId={auth.currentUser?.uid}
                />
              </div>
            </div>
            <div
              id="assignments-container"
              className={`toggle-container ${
                activeContainer === "assignments-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                {selectedAssignmentSubject ? (
                  <span>Assignments in {selectedAssignmentSubject}</span>
                ) : (
                  "Posted Assignments (by Staff)"
                )}
              </div>
              <div className="container-body scrollable">
                {assignmentsLoading ? (
                  <p>Loading assignments...</p>
                ) : assignmentsError ? (
                  <p className="error-message">{assignmentsError}</p>
                ) : selectedAssignmentSubject ? (
                  <div className="subject-assignments">
                    {(assignmentsBySubject[selectedAssignmentSubject] || [])
                      .length === 0 ? (
                      <p className="empty-message">
                        No assignments for {selectedAssignmentSubject}.
                      </p>
                    ) : (
                      assignmentsBySubject[selectedAssignmentSubject].map(
                        (assignment) => (
                          <AssignmentItem
                            key={assignment.id}
                            assignment={assignment}
                          />
                        )
                      )
                    )}
                    {/* Add the back button at the bottom */}
                    <div style={{ marginTop: 24, textAlign: "center" }}>
                      <button
                        className="back-btn small"
                        onClick={() => setSelectedAssignmentSubject(null)}
                      >
                        Back to All Subjects
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(assignmentsBySubject).length === 0 ? (
                      <p className="empty-message">
                        No assignments posted by staff.
                      </p>
                    ) : (
                      Object.keys(assignmentsBySubject).map((subject) => (
                        <div
                          key={subject}
                          className="subject-card"
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedAssignmentSubject(subject)}
                          title="View assignments"
                        >
                          <h3>{subject}</h3>
                          <p>
                            {assignmentsBySubject[subject].length} Assignment
                            {assignmentsBySubject[subject].length > 1
                              ? "s"
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              id="circular-container"
              className={`toggle-container ${
                activeContainer === "circular-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Important Circulars</div>
              <div className="container-body scrollable">
                {circulars.length === 0 ? (
                  <p className="empty-message">No new circulars.</p>
                ) : (
                  <ul>
                    {circulars.map((circular) => (
                      <li key={circular.id}>
                        {" "}
                        <a
                          href={circular.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {circular.helptitle || circular.id}
                        </a>{" "}
                        <span>
                          {" "}
                          {" - Sent by "} <strong>{circular.sender}</strong>{" "}
                        </span>{" "}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div
              id="news-container"
              className={`toggle-container ${
                activeContainer === "news-container" ? "active" : ""
              }`}
            >
              <div className="container-header">📰 Latest News</div>
              <div className="container-body scrollable">
                {/* News Controls */}
                <div className="news-controls" style={{ marginBottom: "20px" }}>
                  {/* Category Dropdown */}
                  <div
                    className="news-categories"
                    style={{ marginBottom: "15px" }}
                  >
                    <label
                      htmlFor="news-category-select"
                      style={{
                        display: "block",
                        margin: "0 0 8px 0",
                        fontSize: "14px",
                        color: "#666",
                        fontWeight: "500",
                      }}
                    >
                      Category:
                    </label>
                    <select
                      id="news-category-select"
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                        backgroundColor: "#fff",
                        color: "#333",
                        cursor: "pointer",
                        minWidth: "150px",
                        outline: "none",
                        transition: "border-color 0.2s ease",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#1976d2";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#ddd";
                      }}
                    >
                      {newsCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={handleNewsRefresh}
                    disabled={newsLoading}
                    className="news-refresh-btn"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: newsLoading ? "#ccc" : "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: newsLoading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      opacity: newsLoading ? 0.6 : 1,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!newsLoading) {
                        e.target.style.backgroundColor = "#45a049";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!newsLoading) {
                        e.target.style.backgroundColor = "#4CAF50";
                      }
                    }}
                  >
                    <i
                      className={`fas fa-sync-alt ${
                        newsLoading ? "fa-spin" : ""
                      }`}
                    ></i>
                    {newsLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {/* News Content */}
                {newsError && (
                  <div
                    className="error-message"
                    style={{
                      marginBottom: "20px",
                      padding: "12px",
                      backgroundColor: "#ffebee",
                      color: "#c62828",
                      border: "1px solid #ffcdd2",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    {newsError}
                    <button
                      onClick={handleNewsRefresh}
                      style={{
                        marginLeft: "10px",
                        padding: "4px 8px",
                        backgroundColor: "#c62828",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {newsLoading && news.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <i
                      className="fas fa-spinner fa-spin"
                      style={{ fontSize: "24px", color: "#666" }}
                    ></i>
                    <p style={{ marginTop: "15px", color: "#666" }}>
                      Loading{" "}
                      {newsCategories
                        .find((cat) => cat.value === selectedCategory)
                        ?.label.toLowerCase()}{" "}
                      news...
                    </p>
                  </div>
                ) : news.length === 0 ? (
                  <p className="empty-message">
                    No{" "}
                    {newsCategories
                      .find((cat) => cat.value === selectedCategory)
                      ?.label.toLowerCase()}{" "}
                    news articles available.
                  </p>
                ) : (
                  <>
                    {/* News Articles with country indicators */}
                    <div className="news-list">
                      {news.map((article, index) => {
                        // Determine source country for styling
                        const isIndianSource =
                          article.source.name.toLowerCase().includes("india") ||
                          article.source.name
                            .toLowerCase()
                            .includes("times of india") ||
                          article.source.name
                            .toLowerCase()
                            .includes("hindustan") ||
                          article.source.name.toLowerCase().includes("ndtv") ||
                          article.url.includes(".in/");

                        return (
                          <div
                            key={`${article.url}-${index}`}
                            className="news-article"
                            style={{
                              border: "1px solid #e0e0e0",
                              borderRadius: "8px",
                              padding: "16px",
                              marginBottom: "16px",
                              backgroundColor: "#fff",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              transition:
                                "transform 0.2s ease, box-shadow 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 8px rgba(0,0,0,0.15)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 2px 4px rgba(0,0,0,0.1)";
                            }}
                          >
                            {article.image && (
                              <img
                                src={article.image}
                                alt={article.title}
                                style={{
                                  width: "100%",
                                  height: "200px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  marginBottom: "12px",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <h3
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: "16px",
                                lineHeight: "1.4",
                                color: "#333",
                              }}
                            >
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#1976d2",
                                  textDecoration: "none",
                                  fontWeight: "600",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.textDecoration = "underline";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.textDecoration = "none";
                                }}
                              >
                                {article.title}
                              </a>
                            </h3>
                            <p
                              style={{
                                margin: "0 0 12px 0",
                                fontSize: "14px",
                                lineHeight: "1.5",
                                color: "#666",
                              }}
                            >
                              {article.description}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "12px",
                                color: "#888",
                                borderTop: "1px solid #f0f0f0",
                                paddingTop: "8px",
                              }}
                            >
                              <span
                                className={`news-source ${
                                  isIndianSource ? "indian" : "us"
                                }`}
                                style={{
                                  fontWeight: "500",
                                  color: isIndianSource ? "#ff9800" : "#2196F3",
                                  background: isIndianSource
                                    ? "rgba(255, 152, 0, 0.1)"
                                    : "rgba(33, 150, 243, 0.1)",
                                  padding: "4px 8px",
                                  borderRadius: "12px",
                                  fontSize: "13px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {article.source.name}{" "}
                                {isIndianSource ? "🇮🇳" : "🇺🇸"}
                              </span>
                              <span>
                                {new Date(
                                  article.publishedAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasMoreNews && (
                      <div style={{ textAlign: "center", marginTop: "20px" }}>
                        <button
                          onClick={handleLoadMore}
                          disabled={newsLoading}
                          className="news-load-more-btn"
                          style={{
                            padding: "10px 20px",
                            backgroundColor: newsLoading ? "#ccc" : "#2196F3",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: newsLoading ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            opacity: newsLoading ? 0.6 : 1,
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!newsLoading) {
                              e.target.style.backgroundColor = "#1976d2";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!newsLoading) {
                              e.target.style.backgroundColor = "#2196F3";
                            }
                          }}
                        >
                          {newsLoading ? (
                            <>
                              <i
                                className="fas fa-spinner fa-spin"
                                style={{ marginRight: "8px" }}
                              ></i>
                              Loading...
                            </>
                          ) : (
                            "Load More"
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div
              id="staff-interaction-container"
              className={`toggle-container ${
                activeContainer === "staff-interaction-container"
                  ? "active"
                  : ""
              }`}
            >
              <div className="container-body">
                <ChatInterface
                  messages={messages}
                  selectedStaffId={selectedStaffId}
                  selectedStaffName={selectedStaffName}
                  staffList={staffList}
                  sendMessage={sendMessageToStaff}
                  deleteMessage={deleteMessageFromStaffChat}
                  showContactList={showContactList}
                  setShowContactList={setShowContactList}
                  setSelectedStaffId={setSelectedStaffId}
                  setSelectedStaffName={setSelectedStaffName}
                  currentUserId={auth.currentUser?.uid}
                />
              </div>
            </div>
            <div
              id="self-analysis-container"
              className={`toggle-container ${
                activeContainer === "self-analysis-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                Your Self Analysis
                <button
                  onClick={() => setActiveContainer(null)}
                  className="close-analysis-btn"
                  title="Close this section"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="container-body">
                <div className="analysis-summary">
                  <h3>Weekly Progress Summary</h3>
                  <p>
                    <b>Learning Rate:</b> {selfAnalysis.learningRate}%
                  </p>
                  <p>
                    <b>Communication Skill:</b>{" "}
                    {selfAnalysis.communicationSkill}%
                  </p>
                  <p>
                    <b>Goal Completion Rate:</b>{" "}
                    {selfAnalysis.goalCompletionRate}%
                  </p>
                  <p>
                    <b>Quiz Engagement:</b> {selfAnalysis.quizEngagement}%
                  </p>
                  <p>
                    <b>Time Spent:</b> {selfAnalysis.timeSpent}
                  </p>
                </div>
                <div className="suggestions-container">
                  <h3>Personalized Learning Tips 💡</h3>
                  <p className="suggestions-box">
                    {selfAnalysis.suggestions ||
                      "Keep engaging to get personalized tips!"}
                  </p>
                </div>
                <div className="feedback-container">
                  <h3>Feedback 🗣️</h3>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share your thoughts on your learning experience..."
                    className="goal-input"
                    style={{ height: "100px" }}
                  ></textarea>
                  <button
                    onClick={handleFeedbackSubmit}
                    className="add-goal-btn"
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
            <div
              id="settings-container"
              className={`toggle-container ${
                activeContainer === "settings-container" ? "active" : ""
              }`}
            >
              <div className="container-header">⚙️ Settings</div>
              <div className="container-body">
                <button
                  onClick={handleEditProfile}
                  className="add-goal-btn"
                  style={{ marginTop: "200px" }}
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="add-goal-btn"
                  style={{ marginBottom: "200px" }}
                >
                  Logout
                </button>
              </div>
            </div>
            <div
              id="chatbot-container"
              className={`toggle-container ${
                activeContainer === "chatbot-container" ? "active" : ""
              }`}
            >
              <div className="container-body">
                {/* Show quiz start notifications in chatbot for mobile view only */}
                {window.innerWidth <= 768 &&
                  notifications
                    .filter((notif) => notif.type === "quiz-start")
                    .map((notif, index) => (
                      <Notification
                        key={`${notif.id || "quiz-start"}-${index}`}
                        message={notif.message}
                        onClick={() => {
                          // Show quiz setup modal
                          setShowQuizSetup(true);
                          setActiveContainer("tasks-container");
                          // Remove this notification
                          setNotifications((prev) =>
                            prev.filter((_, i) => prev.indexOf(notif) !== i)
                          );
                        }}
                        onClose={() => {
                          // Remove this notification
                          setNotifications((prev) =>
                            prev.filter((_, i) => prev.indexOf(notif) !== i)
                          );
                          // Add helpful message
                          setNotifications((prev) => [
                            ...prev,
                            {
                              id: Date.now(),
                              type: "info",
                              message:
                                "Quiz start cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                            },
                          ]);
                        }}
                        isClickable={true}
                        buttonText="Start Quiz"
                      />
                    ))}
                <Chatbot
                  isVisible={window.innerWidth <= 768}
                  copiedTopic={copiedTopic}
                  clearCopiedTopic={() => setCopiedTopic("")}
                  isInContainer={true}
                  isQuizActive={inQuiz}
                />
              </div>
            </div>
            <div
              id="notes-container"
              className={`toggle-container ${
                activeContainer === "notes-container" ? "active" : ""
              }`}
            >
              <Notes
                toggleContainer={toggleContainer}
                logActivity={logStudentActivity}
                studentName={userData?.name}
              />
            </div>
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
            {notifications.map((notif, index) => {
              if (notif.type === "overdue") {
                return (
                  <OverdueTaskNotification
                    key={`${notif.id}-${index}`}
                    task={notif.task}
                    onSubmitAndNavigate={sendOverdueReason}
                    onClose={() =>
                      setNotifications((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  />
                );
              } else if (notif.type === "quiz" && notif.task) {
                return (
                  <Notification
                    key={`${notif.id || "notif"}-${index}`}
                    message={notif.message}
                    onClick={() => {
                      setCurrentTopic(notif.task.content);
                      generateQuizQuestions(); // Generate AI quiz questions
                      setNotifications((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                    }}
                    onClose={() =>
                      setNotifications((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    isClickable={true}
                    buttonText="Start Quiz"
                  />
                );
              } else if (notif.type === "quiz-start") {
                return (
                  <Notification
                    key={`${notif.id || "quiz-start"}-${index}`}
                    message={notif.message}
                    onClick={() => {
                      // Show quiz setup modal
                      setShowQuizSetup(true);
                      setActiveContainer("tasks-container");
                      // Remove this notification
                      setNotifications((prev) =>
                        prev.filter((_, i) => prev.indexOf(notif) !== i)
                      );
                    }}
                    onClose={() => {
                      // Remove this notification
                      setNotifications((prev) =>
                        prev.filter((_, i) => prev.indexOf(notif) !== i)
                      );
                      // Add helpful message
                      setNotifications((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          type: "info",
                          message:
                            "Quiz start cancelled. You can take the quiz by clicking 'Copy & Ask AI' button on the task in the task container.",
                        },
                      ]);
                    }}
                    isClickable={true}
                    buttonText="Start Quiz"
                  />
                );
              } else {
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
              }
            })}
          </div>
          {window.innerWidth > 768 && (
            <Chatbot
              isVisible={isChatbotOpen && !inQuiz}
              copiedTopic={copiedTopic}
              clearCopiedTopic={() => setCopiedTopic("")}
              isInContainer={false}
              isQuizActive={inQuiz}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;
