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
            <div className="contact-list-header">🧑‍🏫 Staff Members</div>
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
  // ...existing code...

  // Add this useEffect to fetch news when news container is activated
  useEffect(() => {
    if (
      activeContainer === "news-container" &&
      news.length === 0 &&
      !newsLoading
    ) {
      fetchNews(selectedCategory, 1, false);
    }
  }, [activeContainer, news.length, newsLoading, selectedCategory]);

  // ...existing code...

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

  // Fetch news function with better image handling
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
            // Process articles to ensure images are included with better fallbacks
            const processedArticles = data.articles.map((article) => {
              let imageUrl = article.image;

              // Check if image URL is valid and accessible
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

              // Ensure HTTPS for images
              if (imageUrl && imageUrl.startsWith("http://")) {
                imageUrl = imageUrl.replace("http://", "https://");
              }

              return {
                ...article,
                image: imageUrl,
                imageAlt: article.title || "News Article",
                country: country, // Add country for source identification
              };
            });
            allArticles = [...allArticles, ...processedArticles];
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

  const copyTopicAndAskAI = (topic, taskId = null) => {
    setCopiedTopic(topic);
    setCurrentTopic(topic);
    setQuizReady(false);
    setInQuiz(false);
    setQuizQuestions([]);
    setShowQuizSetup(false);

    // Track progress for copy and ask AI step
    if (taskId) {
      updateTaskProgress(taskId, "copyAndAsk");
    }

    // Don't change the active container - keep tasks visible
    // setActiveContainer("chatbot-container"); // Remove this line

    // For mobile, open chatbot container, for desktop keep current view
    if (window.innerWidth <= 768) {
      setActiveContainer("chatbot-container");
    }

    setIsChatbotOpen(true);

    // Show notification to start quiz (but don't change container)
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
        "https://edugen-backend-zbjr.onrender.com/api/generate-quiz",
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

  // Add new state for tracking task progress
  const [taskProgress, setTaskProgress] = useState({});
  const [overdueNotifications, setOverdueNotifications] = useState([]);

  // Track task progress in localStorage and Firestore
  const updateTaskProgress = async (taskId, step) => {
    const user = auth.currentUser;
    if (!user) return;

    const progressKey = `taskProgress_${user.uid}_${taskId}`;
    const currentProgress = JSON.parse(
      localStorage.getItem(progressKey) || "{}"
    );

    const updatedProgress = {
      ...currentProgress,
      [step]: Date.now(),
    };

    // Save to localStorage
    localStorage.setItem(progressKey, JSON.stringify(updatedProgress));

    // Update state
    setTaskProgress((prev) => ({
      ...prev,
      [taskId]: updatedProgress,
    }));

    // Save to Firestore
    try {
      const userRef = doc(db, "students", user.uid);
      await updateDoc(userRef, {
        [`taskProgress.${taskId}`]: updatedProgress,
      });
    } catch (error) {
      console.error("Error updating task progress:", error);
    }
  };

  // Check for overdue tasks

  const checkOverdueTasks = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || tasks.length === 0) return;

    const now = Date.now();
    const overdueThreshold = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

    const overdueTasks = [];

    for (const task of tasks) {
      const taskPostedTime = new Date(task.date).getTime();
      const timeSincePosted = now - taskPostedTime;

      if (timeSincePosted >= overdueThreshold) {
        const progressKey = `taskProgress_${user.uid}_${task.id}`;
        const progress = JSON.parse(localStorage.getItem(progressKey) || "{}");

        // Check if all required steps are completed
        const hasCompletedAll =
          progress.copyAndAsk && progress.chatbotSend && progress.startQuiz;

        // Check if reason already submitted
        const reasonKey = `overdueReason_${user.uid}_${task.id}`;
        const reasonSubmitted = localStorage.getItem(reasonKey);

        if (!hasCompletedAll && !reasonSubmitted) {
          // Find the staff member who posted this task and get their name
          const taskStaff = staffList.find(
            (staff) => staff.id === task.staffId
          );
          const staffName = taskStaff ? taskStaff.name : "Unknown Staff";

          overdueTasks.push({
            ...task,
            staffName, // Add staff name to the task object
            progress,
            timeSincePosted,
          });
        }
      }
    }

    setOverdueNotifications(overdueTasks);
  }, [tasks, staffList]); // Add staffList as dependency

  // Check for overdue tasks every minute
  useEffect(() => {
    const interval = setInterval(checkOverdueTasks, 60000); // Check every minute
    checkOverdueTasks(); // Initial check

    return () => clearInterval(interval);
  }, [checkOverdueTasks]);

  // Load existing task progress on component mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || tasks.length === 0) return;

    const allProgress = {};
    tasks.forEach((task) => {
      const progressKey = `taskProgress_${user.uid}_${task.id}`;
      const progress = JSON.parse(localStorage.getItem(progressKey) || "{}");
      if (Object.keys(progress).length > 0) {
        allProgress[task.id] = progress;
      }
    });

    setTaskProgress(allProgress);
  }, [tasks]);

  // Handle overdue reason submission
  const handleOverdueReasonSubmit = async (task, reason) => {
    const user = auth.currentUser;
    if (!user || !reason.trim()) return;

    try {
      // Find the staff member who posted this task - FIXED: use task.staffId instead of task.postedBy
      const taskStaff = staffList.find((staff) => staff.id === task.staffId);

      if (taskStaff) {
        // Create message to staff - FIXED: use task.staffId instead of task.postedBy
        const chatId = [user.uid, task.staffId].sort().join("_");
        const messageData = {
          messages: [
            {
              sender: "student",
              senderId: user.uid, // Add senderId for proper message handling
              text: `Overdue Task Reason - "${task.content}" (${
                task.subject || "No Subject"
              }): ${reason}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
          ],
        };

        // Save message to Firestore
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

        // Mark reason as submitted
        const reasonKey = `overdueReason_${user.uid}_${task.id}`;
        localStorage.setItem(
          reasonKey,
          JSON.stringify({
            reason,
            submittedAt: Date.now(),
          })
        );

        // Remove from overdue notifications
        setOverdueNotifications((prev) => prev.filter((t) => t.id !== task.id));

        // Log activity
        logStudentActivity(
          "overdue_reason_submitted",
          task.subject || "Unknown"
        );

        // Show success notification
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "success",
            message: `Overdue reason submitted successfully to ${taskStaff.name}.`,
          },
        ]);
      } else {
        // If staff member not found, show error
        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: "error",
            message: "Could not find the staff member who posted this task.",
          },
        ]);
        console.error("Staff member not found for task:", task);
      }
    } catch (error) {
      console.error("Error submitting overdue reason:", error);
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "error",
          message: "Failed to submit reason. Please try again.",
        },
      ]);
    }
  };

  // Add this function to close overdue notifications
  const closeOverdueNotification = (taskId) => {
    setOverdueNotifications((prev) =>
      prev.filter((task) => task.id !== taskId)
    );
  };

  // Add this function to handle when a message is sent to the chatbot
  const handleChatbotMessageSent = () => {
    // Find the current task based on the copied topic
    const currentTask = tasks.find((task) => task.content === copiedTopic);
    if (currentTask) {
      updateTaskProgress(currentTask.id, "chatbotSend");
    }
  };

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
          activeContainer={activeContainer} // Pass the current active container
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
            {/* All container divs */}
            <div
              id="tasks-container"
              className={`toggle-container ${
                activeContainer === "tasks-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                {inQuiz && activeContainer === "tasks-container" ? (
                  <span>Quiz: {currentTopic}</span>
                ) : selectedSubject ? (
                  <span>Tasks in {selectedSubject}</span>
                ) : (
                  "📝 Tasks"
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
                      isInContainer={true}
                    />
                  ) : (
                    <div className="quiz-loading-container">
                      <div className="quiz-loading-spinner">
                        <i className="fas fa-spinner fa-spin"></i>
                      </div>
                      <p>
                        Generating AI quiz questions for "{currentTopic}"...
                      </p>
                      <button
                        className="cancel-quiz-generation-btn"
                        onClick={() => {
                          setInQuiz(false);
                          setCurrentTopic("");
                          setQuizQuestions([]);
                          setActiveContainer(null);
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
                      >
                        Cancel Quiz Generation
                      </button>
                    </div>
                  )
                ) : showQuizSetup ? (
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
              <div className="container-header">🎯 Your Goals</div>
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
              <div className="container-header">🏆 Streak </div>
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
                  "📚 Assignments"
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
              <div className="container-header">School Circulars</div>
              <div className="container-body scrollable">
                {circulars.length === 0 ? (
                  <p className="empty-message">No circulars available.</p>
                ) : (
                  <ul className="circular-list">
                    {circulars.map((circular) => (
                      <li key={circular.id} className="circular-item">
                        <a
                          href={circular.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {circular.helptitle || circular.id}
                        </a>{" "}
                        <span>
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
              <div className="container-header">📰 News </div>
              <div className="container-body scrollable">
                <div className="news-controls">
                  <div className="news-categories">
                    <label htmlFor="news-category-select">Category:</label>
                    <select
                      id="news-category-select"
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      {newsCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleNewsRefresh}
                    disabled={newsLoading}
                    className="news-refresh-btn"
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
                      <>
                        <i
                          className="fas fa-sync-alt"
                          style={{ marginRight: "8px" }}
                        ></i>
                        Refresh News
                      </>
                    )}
                  </button>
                </div>

                {/* News Articles Section - Updated for better display */}
                {newsLoading ? (
                  <div className="news-loading">
                    <i
                      className="fas fa-spinner fa-spin"
                      style={{ fontSize: "24px", color: "#0438af" }}
                    ></i>
                    <p style={{ marginTop: "16px", color: "#666" }}>
                      Loading latest news...
                    </p>
                  </div>
                ) : newsError ? (
                  <div className="news-error-message">
                    <i
                      className="fas fa-exclamation-triangle"
                      style={{ marginRight: "8px" }}
                    ></i>
                    {newsError}
                  </div>
                ) : (
                  <>
                    <div className="news-list">
                      {news.length === 0 ? (
                        <div className="news-empty-message">
                          <i
                            className="fas fa-newspaper"
                            style={{
                              fontSize: "48px",
                              color: "#dee2e6",
                              marginBottom: "16px",
                            }}
                          ></i>
                          <p
                            style={{
                              margin: 0,
                              color: "#6c757d",
                              fontSize: "16px",
                            }}
                          >
                            No news articles found for this category.
                          </p>
                        </div>
                      ) : (
                        news.map((article, index) => {
                          const isIndianSource = article.country === "in";

                          return (
                            <div
                              key={article.url || index}
                              className="news-article"
                              onClick={() => {
                                window.open(
                                  article.url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }}
                            >
                              <img
                                src={article.image}
                                alt={article.title || "News Article"}
                                className="news-article-image"
                                onError={(e) => {
                                  e.target.src = `https://via.placeholder.com/400x220/f8f9fa/6c757d?text=${encodeURIComponent(
                                    "News Image"
                                  )}`;
                                }}
                                loading="lazy"
                              />
                              <div className="news-article-content">
                                <h3>{article.title}</h3>
                                <p className="news-article-description">
                                  {article.description ||
                                    "No description available."}
                                </p>
                                <div className="news-article-footer">
                                  <span
                                    className={`news-source ${
                                      isIndianSource ? "indian" : "us"
                                    }`}
                                  >
                                    {article.source?.name || "Unknown Source"}
                                    <span style={{ marginLeft: "4px" }}>
                                      {isIndianSource ? "🇮🇳" : "🇺🇸"}
                                    </span>
                                  </span>
                                  <span className="news-date">
                                    {new Date(
                                      article.publishedAt
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {hasMoreNews && news.length > 0 && (
                      <div className="news-load-more-container">
                        <button
                          onClick={handleLoadMore}
                          disabled={newsLoading}
                          className="news-load-more-btn"
                        >
                          {newsLoading ? (
                            <>
                              <i
                                className="fas fa-spinner fa-spin"
                                style={{ marginRight: "8px" }}
                              ></i>
                              Loading More...
                            </>
                          ) : (
                            <>
                              <i
                                className="fas fa-plus"
                                style={{ marginRight: "8px" }}
                              ></i>
                              Load More Articles
                            </>
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
              <div className="container-header">🧠 Self Analysis</div>
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
                  style={{ marginTop: "20px", marginBottom: "10px" }}
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setActiveContainer("about-container")}
                  className="add-goal-btn"
                  style={{ marginBottom: "10px" }}
                >
                  About the App
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
              id="about-container"
              className={`toggle-container ${
                activeContainer === "about-container" ? "active" : ""
              }`}
            >
              <div className="container-header"> 📱 About the App</div>
              <div className="container-body">
                <div className="about-content">
                  <h3> EDUGEN AI </h3>
                  <p>
                    EduGen AI is an innovative educational platform developed by{" "}
                    <strong>Yagnarashagan</strong> that bridges the gap between
                    students and educators using smart automation. This app is
                    designed to enhance academic performance, engagement, and
                    communication in an intuitive and interactive way.
                  </p>

                  <h4>✨ It features:</h4>
                  <ul className="features-list">
                    <li>
                      🤖 <strong>Smart Chatbot Assistance</strong> for real-time
                      academic help
                    </li>
                    <li>
                      🧠 <strong>AI-Generated Quizzes</strong> to test knowledge
                      based on selected topics
                    </li>
                    <li>
                      🎯 <strong>Goal Setting and Self Analysis</strong> to
                      boost productivity
                    </li>
                    <li>
                      📊 <strong>Interactive Dashboard</strong> for both
                      students and staff to manage tasks, assignments, and
                      performance
                    </li>
                  </ul>

                  <p>
                    EduGen AI empowers students to learn effectively and helps
                    staff monitor, guide, and support learners efficiently. With
                    built-in chat functionality, assignment distribution, and
                    performance tracking, EduGen AI is your all-in-one
                    AI-powered education assistant.
                  </p>

                  <div className="contact-section">
                    <h4>📧 Need Help?</h4>
                    <p>For any queries about the app, please contact us at:</p>
                    <a
                      href="mailto:edugenai7@gmail.com"
                      className="contact-email"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      edugenai7@gmail.com
                    </a>
                  </div>

                  <div style={{ marginTop: "30px", textAlign: "center" }}>
                    <button
                      onClick={() => setActiveContainer("settings-container")}
                      className="back-btn"
                    >
                      Back to Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              id="chatbot-container"
              className={`toggle-container ${
                activeContainer === "chatbot-container" ? "active" : ""
              }`}
            >
              <div className="container-body">
                <Chatbot
                  isVisible={window.innerWidth <= 768}
                  copiedTopic={copiedTopic}
                  clearCopiedTopic={() => setCopiedTopic("")}
                  isInContainer={true}
                  isQuizActive={inQuiz}
                  onMessageSent={handleChatbotMessageSent}
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
            {/* Overdue task notifications */}
            {overdueNotifications.map((task) => (
              <OverdueTaskNotification
                key={`overdue-${task.id}`}
                task={task}
                onSubmitReason={handleOverdueReasonSubmit}
                onClose={() => closeOverdueNotification(task.id)}
              />
            ))}

            {/* Regular notifications - FIXED: Remove duplicates */}
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
                      generateQuizQuestions();
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
                      setShowQuizSetup(true);
                      setActiveContainer("tasks-container");
                      setNotifications((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                    }}
                    onClose={() => {
                      setNotifications((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
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
              onMessageSent={handleChatbotMessageSent}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;
