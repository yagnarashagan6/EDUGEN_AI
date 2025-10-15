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
import {
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  getDocsFromServer,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
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

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <div className="error-fullpage">
        Something went wrong. Please refresh the page.
      </div>
    );
  }
  return children;
};

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

const ChatInterface = ({
  messages,
  sendMessage,
  deleteMessage,
  showContactList,
  setShowContactList,
  setSelectedStudentId,
  setSelectedStudentName,
  currentUserId,
  studentList,
  selectedStudentName,
  userNames,
  selectedStudentId,
  unreadMessageCounts,
  selectStudentAndMarkAsRead, // Add this prop
}) => {
  const messagesEndRef = useRef(null);

  // UPDATED: Use the new function that marks messages as read
  const selectStudent = useCallback(
    (student) => {
      if (selectStudentAndMarkAsRead) {
        selectStudentAndMarkAsRead(student);
      } else {
        // Fallback to original behavior
        setSelectedStudentId(student.id);
        setSelectedStudentName(student.name);
        setShowContactList(false);
      }
    },
    [
      selectStudentAndMarkAsRead,
      setSelectedStudentId,
      setSelectedStudentName,
      setShowContactList,
    ]
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

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, message, index) => {
      const date = new Date(message.timestamp).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push({ ...message, originalIndex: index });
      return acc;
    }, {});
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-interface">
      {showContactList ? (
        <div className="contact-list full-container">
          <div className="contact-list-body scrollable">
            {studentList.length === 0 ? (
              <p className="empty-message">No students available.</p>
            ) : (
              studentList.map((student) => (
                <div
                  key={`student-${student.id}`}
                  className={`contact-item ${
                    selectedStudentId === student.id ? "active" : ""
                  }`}
                  onClick={() => selectStudent(student)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) =>
                    e.key === "Enter" && selectStudent(student)
                  }
                >
                  <div className="contact-info">
                    <h4>{student.name || "Anonymous"}</h4>
                    <p>{student.role || "Student"}</p>
                  </div>
                  {/* Add unread message indicator */}
                  {unreadMessageCounts[student.id] &&
                    unreadMessageCounts[student.id] > 0 && (
                      <div className="unread-indicator">
                        <span className="unread-count">
                          {unreadMessageCounts[student.id]}
                        </span>
                      </div>
                    )}
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
              aria-label="Back to contact list"
            >
              Back to List
            </button>
            {selectedStudentName && (
              <div className="recipient-info" style={{ marginLeft: "auto" }}>
                <h3>{selectedStudentName}</h3>
                <p className="status">Online</p>
              </div>
            )}
          </div>
          <div className="messages-container scrollable" ref={messagesEndRef}>
            {selectedStudentId && Object.keys(groupedMessages).length === 0 ? (
              <p className="empty-message">
                No messages yet. Start the conversation!
              </p>
            ) : !selectedStudentId ? (
              <p className="empty-message">
                Select a student to view messages.
              </p>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={`date-${date}`}>
                  <div className="date-separator">{formatDate(date)}</div>
                  {dateMessages.map((msg) => (
                    <div
                      key={`msg-${msg.timestamp}-${msg.originalIndex}`}
                      className={`message-bubble ${
                        msg.sender === "staff" ? "sent" : "received"
                      }`}
                      onClick={() => {
                        if (
                          msg.sender === "staff" &&
                          window.confirm("Delete this message?")
                        ) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (
                          e.key === "Enter" &&
                          msg.sender === "staff" &&
                          window.confirm("Delete this message?")
                        ) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                    >
                      <div
                        className="message-sender"
                        style={{
                          fontSize: "0.8em",
                          color: "#777",
                          marginBottom: "2px",
                        }}
                      >
                        {msg.sender === "staff"
                          ? userNames[currentUserId] || "You"
                          : userNames[msg.senderId] ||
                            selectedStudentName ||
                            "Student"}
                      </div>
                      <div className="message-content">{msg.text}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.sender === "staff" && (
                          <span className="message-status">
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          {selectedStudentId && selectedStudentName && (
            <div className="message-input-area">
              <input
                type="text"
                id="staff-message-input"
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="message-input-field"
                aria-label="Message input"
              />
              <button
                onClick={sendMessage}
                className="send-message-button"
                aria-label="Send message"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ChatInterface.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string,
      sender: PropTypes.string,
      senderId: PropTypes.string,
      timestamp: PropTypes.string,
      read: PropTypes.bool,
      unreadMessageCounts: PropTypes.object,
    })
  ).isRequired,
  sendMessage: PropTypes.func.isRequired,
  deleteMessage: PropTypes.func.isRequired,
  showContactList: PropTypes.bool.isRequired,
  setShowContactList: PropTypes.func.isRequired,
  setSelectedStudentId: PropTypes.func.isRequired,
  setSelectedStudentName: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
  studentList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      photoURL: PropTypes.string,
      role: PropTypes.string,
    })
  ).isRequired,
  selectedStudentName: PropTypes.string,
  userNames: PropTypes.object.isRequired,
  selectedStudentId: PropTypes.string,
  selectStudentAndMarkAsRead: PropTypes.func,
};

// Place this OUTSIDE the StaffDashboard component
const loadingIcons = [
  "fas fa-book",
  "fas fa-flask",
  "fas fa-calculator",
  "fas fa-lightbulb",
  "fas fa-brain",
  "fas fa-atom",
  "fas fa-graduation-cap",
  "fas fa-laptop-code",
  "fas fa-globe",
  "fas fa-microscope",
];

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [mobileHamburger, setMobileHamburger] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState({
    dashboard: true,
    assignments: true,
    tasks: true,
    students: true,
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
  // Cache of task completion statuses per student for real-time updates
  const [taskStatusByStudent, setTaskStatusByStudent] = useState({});
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
  const [unreadMessageCounts, setUnreadMessageCounts] = useState({}); // Add this line

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

      const promises = allIds.map((id) => {
        return getDoc(doc(db, "students", id));
      });

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
    [addNotification]
  );

  // Add new function to count unread messages - UPDATED VERSION
  const countUnreadMessages = useCallback(async () => {
    try {
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) return;

      const unreadCounts = {};

      // Check messages with all students
      for (const student of studentStats) {
        const chatId = [staffUserId, student.id].sort().join("_");
        const messagesRef = doc(db, "messages", chatId);
        const messagesSnap = await getDoc(messagesRef);

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
        if (!userNames[user.uid]) {
          fetchUserNames([], user.uid);
        }

        const studentsRef = collection(db, "students");
        const studentSnapshot = await getDocsFromServer(studentsRef);
        const studentsData = studentSnapshot.docs.map((sDoc) => ({
          id: sDoc.id,
          ...sDoc.data(),
          streak: sDoc.data().streak || 0,
          progress: sDoc.data().progress || 0,
          photoURL: sDoc.data().photoURL || "./assets/student.png",
        }));
        setStudentStats(studentsData.sort((a, b) => b.streak - a.streak));
        setLoading((prev) => ({ ...prev, students: false }));

        const studentIds = studentsData.map((s) => s.id);
        if (studentIds.length > 0) {
          await fetchUserNames(studentIds, user.uid);
        }

        // Only count students with a valid name (not "Unknown User")
        const totalStudents = studentsData.filter(
          (student) =>
            student.name &&
            student.name !== "Anonymous" &&
            student.name !== "Unknown" &&
            student.name !== "Unknown User"
        ).length;

        const today = new Date();
        const activeStudents = studentsData.filter((student) => {
          const lastLoginDate = student.lastLogin?.toDate
            ? student.lastLogin.toDate()
            : student.lastLogin
            ? new Date(student.lastLogin)
            : null;
          return (
            lastLoginDate &&
            (today.getTime() - lastLoginDate.getTime()) /
              (1000 * 60 * 60 * 24) <=
              7
          );
        }).length;
        const overallPerformance =
          totalStudents > 0
            ? Math.round(
                studentsData.reduce((sum, s) => sum + (s.progress || 0), 0) /
                  totalStudents
              )
            : 0;
        setQuickStats({ totalStudents, activeStudents, overallPerformance });
      } catch (err) {
        console.error("Error fetching initial dashboard data:", err);
        addNotification(
          "Failed to load dashboard data: " + err.message,
          "error"
        );
      } finally {
        setLoading((prev) => ({ ...prev, dashboard: false }));
      }
    };

    fetchInitialDashboardData();
  }, [navigate, addNotification, fetchUserNames]);

  useEffect(() => {
    setLoading((prev) => ({ ...prev, tasks: true }));
    const tasksRef = doc(db, "tasks", "shared");
    const unsubscribe = onSnapshot(
      tasksRef,
      (tasksSnap) => {
        const allTasks = tasksSnap.exists() ? tasksSnap.data().tasks || [] : [];
        const currentStaffId = auth.currentUser?.uid;

        if (!currentStaffId) {
          console.warn("No authenticated user found");
          setTasks([]);
          setLoading((prev) => ({ ...prev, tasks: false }));
          return;
        }

        // Filter tasks to show only the ones posted by the current staff member
        const staffTasks = allTasks
          .filter((task) => {
            return task.staffId === currentStaffId;
          })
          .map((task) => ({
            ...task,
            // Ensure date is formatted properly for display
            date:
              task.date ||
              (task.postedAt?.toDate
                ? task.postedAt.toDate().toLocaleDateString()
                : new Date().toLocaleDateString()),
            // Ensure subject is available
            subject: task.subject || "General",
          }));

        console.log(
          "Filtered tasks for current staff:",
          staffTasks.length,
          "out of",
          allTasks.length
        );
        setTasks(staffTasks);
        setLoading((prev) => ({ ...prev, tasks: false }));
      },
      (error) => {
        console.error("Error fetching tasks:", error);
        addNotification("Failed to load tasks: " + error.message, "error");
        setLoading((prev) => ({ ...prev, tasks: false }));
      }
    );
    return () => unsubscribe();
  }, [addNotification]);

  // Listen in real-time to each student's task_status so results update when students complete tasks
  useEffect(() => {
    // Only attach listeners when we have students and tasks loaded
    if (loading.students || loading.tasks) return;
    if (!studentStats || studentStats.length === 0) return;

    const unsubs = [];
    try {
      studentStats.forEach((student) => {
        const statusColRef = collection(
          db,
          "students",
          student.id,
          "task_status"
        );
        const unsub = onSnapshot(
          statusColRef,
          (snap) => {
            const map = {};
            snap.forEach((d) => {
              map[d.id] = d.data();
            });
            setTaskStatusByStudent((prev) => ({ ...prev, [student.id]: map }));
          },
          (err) => {
            console.warn(
              "task_status listener error for",
              student.id,
              err?.message || err
            );
          }
        );
        unsubs.push(unsub);
      });
    } catch (e) {
      console.warn("Failed to attach task_status listeners:", e?.message || e);
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u && u();
        } catch (_) {}
      });
    };
  }, [studentStats, loading.students, loading.tasks]);

  const fetchAssignments = useCallback(() => {
    setLoading((prev) => ({ ...prev, assignments: true }));
    const user = auth.currentUser;
    if (!user) {
      addNotification("User not authenticated for assignments.", "error");
      setLoading((prev) => ({ ...prev, assignments: false }));
      return () => {};
    }
    const q = query(collection(db, "assignments"), orderBy("postedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
      },
      (err) => {
        console.error("Error fetching assignments snapshot:", err);
        addNotification("Failed to load assignments: " + err.message, "error");
        setLoading((prev) => ({ ...prev, assignments: false }));
      }
    );
    return unsubscribe;
  }, [addNotification]);

  useEffect(() => {
    const unsubscribe = fetchAssignments();
    return () => unsubscribe();
  }, [fetchAssignments]);
  // ...existing code...

  useEffect(() => {
    if (loading.students || loading.tasks) return;

    const compute = () => {
      const resultsData = studentStats.map((student) => {
        let completedCount = 0;

        for (const task of tasks) {
          const status = taskStatusByStudent[student.id]?.[task.id];
          const isCompleted =
            (status && status.completed === true) ||
            (Array.isArray(task.completedBy) &&
              task.completedBy.includes(student.id));
          if (isCompleted) completedCount++;
        }

        return {
          id: student.id,
          name: student.name || "Anonymous",
          completedTasks: completedCount,
          totalTasks: tasks.length,
        };
      });

      setResults(resultsData);
    };

    compute();
  }, [
    tasks,
    studentStats,
    taskStatusByStudent,
    loading.students,
    loading.tasks,
  ]);

  // ...existing code...

  useEffect(() => {
    // Temporarily disable fetching latest activity from Firebase
    setLatestActivity("Monitor fetch is temporarily disabled.");
    // If you want to re-enable, restore the code below:
    /*
    const fetchLatestActivity = async () => {
      try {
        const activitiesRef = collection(db, 'student_activities');
        const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
          let studentName = userNames[data.studentId] || data.name || 'A student';
          if (!userNames[data.studentId] && data.studentId) {
            await fetchUserNames([data.studentId], auth.currentUser?.uid);
            studentName = userNames[data.studentId] || data.name || 'A student';
          }
          setLatestActivity(`${studentName} - ${data.activity} at ${timestamp.toLocaleTimeString()}`);
        } else {
          setLatestActivity('No recent activity.');
        }
      } catch (err) {
        console.error('Error fetching latest activity:', err);
        setLatestActivity('Error fetching activity.');
      }
    };
    fetchLatestActivity();
    */
  }, [addNotification, fetchUserNames, userNames]);

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
      setIsChatbotOpen(!mobile); // Show chatbot on desktop, hide on mobile
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // UPDATED: useEffect for handling message reading and real-time unread counting
  useEffect(() => {
    if (!selectedStudentId) {
      setMessages([]);
      return;
    }
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId) return;

    const chatId = [staffUserId, selectedStudentId].sort().join("_");
    const messagesRef = doc(db, "messages", chatId);
    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const currentMessages = docSnap.data().messages || [];
            setMessages(currentMessages);

            // Only mark messages as read if this chat is currently open/selected
            // This ensures messages are only marked as read when the chat is actually viewed
            const unreadStudentMessages = currentMessages.filter(
              (msg) => msg.sender === "student" && !msg.read
            );

            if (unreadStudentMessages.length > 0) {
              // Mark student messages as read since we're viewing this chat
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

              // Update unread counts after marking as read
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

  // ADD: New useEffect to listen for real-time message changes across all chats
  useEffect(() => {
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId || studentStats.length === 0) return;

    const unsubscribes = [];

    // Listen to each student's chat for real-time updates
    studentStats.forEach((student) => {
      const chatId = [staffUserId, student.id].sort().join("_");
      const messagesRef = doc(db, "messages", chatId);

      const unsubscribe = onSnapshot(messagesRef, (docSnap) => {
        // Only update unread counts, don't mark as read unless chat is open
        countUnreadMessages();
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [studentStats, countUnreadMessages]);

  // UPDATED: Remove the periodic interval, rely on real-time updates instead
  useEffect(() => {
    if (studentStats.length > 0) {
      countUnreadMessages();
    }
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

      // Send notification to student
      try {
        const studentNotifRef = collection(
          db,
          "students",
          selectedStudentId,
          "notifications"
        );
        await addDoc(studentNotifRef, {
          message: `New message from staff: ${text.substring(0, 50)}${
            text.length > 50 ? "..." : ""
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
      if (!newAssignmentSubject.trim() || !newAssignmentLink.trim()) {
        addNotification(
          "Please enter assignment subject and Google Drive link.",
          "warning"
        );
        return;
      }
      if (!isValidDriveLink(newAssignmentLink)) {
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

    // Move this line here so it's available in both try blocks
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

    // Try sending notification, but don't show error if it fails
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
      // Optionally: addNotification('Failed to send notification to student.', 'warning');
    }
  };

  const handleEditProfile = () => {
    navigate("/staff-form", { state: { isEdit: true, userData } });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Error logging out:", err);
      addNotification("Failed to log out.", "error");
    }
  };

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  const isDashboardLoading = loading.dashboard || loading.students;

  const [currentIcon, setCurrentIcon] = React.useState(0);
  const [iconDirection, setIconDirection] = React.useState(1); // For bounce effect

  React.useEffect(() => {
    if (!isDashboardLoading) return;
    // Slow down the icon transition (e.g., 240ms instead of 120ms)
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % loadingIcons.length);
      setIconDirection((prev) => -prev);
    }, 240);
    return () => clearInterval(interval);
  }, [isDashboardLoading]);

  // Add missing toggleContainer function
  const toggleContainer = useCallback(
    (containerId, filterType = null) => {
      setActiveContainer(activeContainer === containerId ? null : containerId);
      if (filterType) {
        setFilterType(filterType);
      }

      // Close sidebar on mobile after selection
      if (isMobile && sidebarVisible) {
        setSidebarVisible(false);
      }
    },
    [activeContainer, isMobile, sidebarVisible]
  );

  // Add missing toggleSidebar function
  const toggleSidebar = useCallback(() => {
    setSidebarVisible((prev) => !prev);
  }, []);

  // Add missing postTask function
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
        subject: staffData.subject || "General", // Add subject from staff profile
        staffId: user.uid,
        staffName: staffData.name || "Staff",
        postedAt: Timestamp.now(),
        date: new Date().toLocaleDateString(), // Add formatted date for display
        completedBy: [],
      };

      const tasksRef = doc(db, "tasks", "shared");
      const tasksSnap = await getDoc(tasksRef);
      const existingTasks = tasksSnap.exists()
        ? tasksSnap.data().tasks || []
        : [];

      await setDoc(
        tasksRef,
        {
          tasks: [...existingTasks, newTask],
        },
        { merge: true }
      );

      // Notify all students about the new task
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

  // Add missing deleteTask function
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

        // Check if the current staff member owns this task
        if (taskToDelete.staffId !== user.uid) {
          addNotification("You can only delete your own tasks.", "error");
          return;
        }

        const updatedTasks = existingTasks.filter((task) => task.id !== taskId);

        await setDoc(
          tasksRef,
          {
            tasks: updatedTasks,
          },
          { merge: true }
        );

        addNotification("Task deleted successfully!", "success");
      } catch (err) {
        console.error("Error deleting task:", err);
        addNotification("Failed to delete task: " + err.message, "error");
      }
    },
    [addNotification]
  );

  // Add missing filteredStudents computed value
  const filteredStudents = useMemo(() => {
    if (!filterType) return studentStats;

    const today = new Date();

    switch (filterType) {
      case "total":
        return studentStats;
      case "active":
        return studentStats.filter((student) => {
          const lastLoginDate = student.lastLogin?.toDate
            ? student.lastLogin.toDate()
            : student.lastLogin
            ? new Date(student.lastLogin)
            : null;
          return (
            lastLoginDate &&
            (today.getTime() - lastLoginDate.getTime()) /
              (1000 * 60 * 60 * 24) <=
              7
          );
        });
      case "performance":
        // Show all students sorted by progress (high to low) instead of filtering by threshold
        return [...studentStats].sort(
          (a, b) => (b.progress || 0) - (a.progress || 0)
        );
      default:
        return studentStats;
    }
  }, [studentStats, filterType]);

  // ADD: selectStudentAndMarkAsRead function - UPDATED VERSION
  const selectStudentAndMarkAsRead = useCallback(
    async (student) => {
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) return;

      // Set the selected student
      setSelectedStudentId(student.id);
      setSelectedStudentName(student.name);
      setShowContactList(false);

      // Immediately mark messages as read when opening the chat
      try {
        const chatId = [staffUserId, student.id].sort().join("_");
        const messagesRef = doc(db, "messages", chatId);
        const messagesSnap = await getDoc(messagesRef);

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

            // Update unread counts
            countUnreadMessages();
          }
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [countUnreadMessages]
  );

  if (isDashboardLoading) {
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
          unreadMessageCounts={unreadMessageCounts} // Add this line
        />
        <div
          className={`main-content ${sidebarVisible ? "sidebar-active" : ""}`}
        >
          {/* Place hamburger in the header, like StudentDashboard */}
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
              <div id="default-content" className="quick-stats">
                <h2>Quick Stats</h2>
                <div className="stats-container">
                  <div
                    className="stat-box"
                    onClick={() =>
                      toggleContainer("quick-stats-container", "total")
                    }
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      toggleContainer("quick-stats-container", "total")
                    }
                  >
                    <i className="fas fa-users"></i>
                    <h3>Total Students</h3>
                    <p>{quickStats.totalStudents}</p>
                  </div>
                  <div
                    className="stat-box"
                    onClick={() =>
                      toggleContainer("quick-stats-container", "active")
                    }
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      toggleContainer("quick-stats-container", "active")
                    }
                  >
                    <i className="fas fa-user-check"></i>
                    <h3>Active Students</h3>
                    <p>{quickStats.activeStudents}</p>
                  </div>
                  <div
                    className="stat-box"
                    onClick={() => toggleContainer("tasks-container")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) =>
                      e.key === "Enter" && toggleContainer("tasks-container")
                    }
                  >
                    <i className="fas fa-tasks"></i>
                    <h3>Tasks</h3>
                    <p>
                      {loading.tasks ? "Loading..." : `${tasks.length} Active`}
                    </p>
                  </div>
                  <div
                    className="stat-box"
                    onClick={() =>
                      toggleContainer("quick-stats-container", "performance")
                    }
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      toggleContainer("quick-stats-container", "performance")
                    }
                  >
                    <i className="fas fa-chart-line"></i>
                    <h3>Overall Performance</h3>
                    <p>{quickStats.overallPerformance}%</p>
                  </div>
                  <div
                    className="stat-box"
                    onClick={() => toggleContainer("monitor-container")}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) =>
                      e.key === "Enter" && toggleContainer("monitor-container")
                    }
                  >
                    <i className="fas fa-history"></i>
                    <h3>Latest Activity</h3>
                    <p
                      style={{
                        fontSize: "0.8em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {latestActivity || "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Only show chatbot container on mobile */}
            {isMobile && (
              <div
                id="chatbot-container"
                className={`toggle-container ${
                  activeContainer === "chatbot-container" ? "active" : ""
                }`}
              >
                <div
                  className="container-body"
                  style={{
                    height: "calc(100vh - 200px)",
                    display: "flex",
                    flexDirection: "column",
                    padding: "0",
                  }}
                >
                  <Chatbot
                    role="staff"
                    isMinimized={false}
                    isVisible={true}
                    toggleChatbot={() => setActiveContainer(null)}
                  />
                </div>
              </div>
            )}

            <div
              id="tasks-container"
              className={`toggle-container ${
                activeContainer === "tasks-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Tasks Management</div>
              <div className="container-body">
                <div className="task-form">
                  <h3>Post a New Task/Topic</h3>
                  <input
                    type="text"
                    id="task-content"
                    placeholder="Enter task description or topic..."
                    className="goal-input"
                    aria-label="Task content"
                  />
                  <button
                    onClick={postTask}
                    className="add-goal-btn"
                    aria-label="Post task"
                  >
                    Post Task
                  </button>
                </div>
                {loading.tasks ? (
                  <p>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="empty-message">
                    No tasks posted yet. Add one above!
                  </p>
                ) : (
                  <div
                    className="tasks-list scrollable"
                    style={{ maxHeight: "300px", marginBottom: "20px" }}
                  >
                    {tasks.map((task) => (
                      <TaskItem
                        key={`task-item-${task.id}`}
                        task={task}
                        role="staff"
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div
              id="assignments-container"
              className={`toggle-container ${
                activeContainer === "assignments-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Assignments</div>
              <div className="container-body">
                <div className="assignment-form post-new-assignment">
                  <h3>Post a New Assignment</h3>
                  <input
                    type="text"
                    value={newAssignmentSubject}
                    onChange={(e) => setNewAssignmentSubject(e.target.value)}
                    placeholder="Assignment Subject Name"
                    className="goal-input"
                    aria-label="New assignment subject"
                  />
                  <input
                    type="url"
                    value={newAssignmentLink}
                    onChange={(e) => setNewAssignmentLink(e.target.value)}
                    placeholder="Google Drive Link (https://...)"
                    className="goal-input"
                    aria-label="New assignment Google Drive link"
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="date"
                      value={newAssignmentDeadline}
                      onChange={(e) => setNewAssignmentDeadline(e.target.value)}
                      className="goal-input"
                      style={{ flex: 1 }}
                      title="Set deadline date for the assignment"
                      aria-label="New assignment deadline date"
                    />
                    <input
                      type="time"
                      value={newAssignmentDeadlineTime}
                      onChange={(e) =>
                        setNewAssignmentDeadlineTime(e.target.value)
                      }
                      className="goal-input"
                      style={{ flex: 1 }}
                      title="Set deadline time for the assignment"
                      aria-label="New assignment deadline time"
                    />
                  </div>
                  <button
                    onClick={postAssignment}
                    className="add-goal-btn"
                    aria-label="Post new assignment button"
                  >
                    Post Assignment
                  </button>
                </div>
                <div
                  className="assignment-form marking-ui"
                  style={{ marginTop: "30px" }}
                >
                  <h3>Mark Student Assignment</h3>
                  <select
                    value={selectedStudentForMarking}
                    onChange={(e) =>
                      setSelectedStudentForMarking(e.target.value)
                    }
                    className="goal-input"
                    aria-label="Select student for marking"
                  >
                    <option value="">-- Select Student --</option>
                    {studentStats
                      .filter(
                        (student) =>
                          student.name &&
                          student.name !== "Anonymous" &&
                          student.name !== "Unknown" &&
                          student.name !== "Unknown User"
                      )
                      .map((student) => (
                        <option
                          key={`mark-student-option-${student.id}`}
                          value={student.id}
                        >
                          {student.name} ({student.id.substring(0, 5)})
                        </option>
                      ))}
                  </select>
                  <select
                    value={selectedAssignmentForMarking}
                    onChange={(e) =>
                      setSelectedAssignmentForMarking(e.target.value)
                    }
                    className="goal-input"
                    aria-label="Select assignment for marking"
                  >
                    <option value="">-- Select Assignment --</option>
                    {assignments.map((assignment) => (
                      <option
                        key={`mark-assignment-option-${assignment.id}`}
                        value={assignment.id}
                      >
                        {assignment.subject}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={assignmentMarks}
                    onChange={(e) => setAssignmentMarks(e.target.value)}
                    placeholder="Enter Marks (e.g., A+, 85/100)"
                    className="goal-input"
                    aria-label="Assignment marks input"
                  />
                  <button
                    onClick={handleSendMarks}
                    className="add-goal-btn"
                    aria-label="Send marks button"
                  >
                    Send Marks
                  </button>
                </div>
                <h4 style={{ marginTop: "30px" }}>Your Posted Assignments:</h4>
                {loading.assignments ? (
                  <p>Loading your assignments...</p>
                ) : assignments.length === 0 ? (
                  <p className="empty-message">
                    You have not posted any assignments yet.
                  </p>
                ) : (
                  <div
                    className="assignment-list scrollable"
                    style={{ maxHeight: "400px" }}
                  >
                    {assignments.map((assignment) => {
                      // Check if assignment deadline has expired
                      const isExpired =
                        assignment.deadline &&
                        new Date(assignment.deadline) < new Date();

                      return (
                        <div
                          key={`posted-assignment-${assignment.id}`}
                          className={`assignment-card ${
                            isExpired ? "expired" : ""
                          }`}
                          style={{
                            background: isExpired ? "#f8f9fa" : "#ffffff",
                            border: `1px solid ${
                              isExpired ? "#dee2e6" : "#e3f2fd"
                            }`,
                            borderRadius: "12px",
                            padding: "16px",
                            marginBottom: "16px",
                            boxShadow: isExpired
                              ? "0 2px 4px rgba(0,0,0,0.05)"
                              : "0 2px 8px rgba(25, 118, 210, 0.1)",
                            transition: "all 0.3s ease",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* Status Badge */}
                          {isExpired && (
                            <div
                              style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                background: "#ff5252",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                              }}
                            >
                              Expired
                            </div>
                          )}

                          {/* Assignment Header */}
                          <div style={{ marginBottom: "12px" }}>
                            <h3
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: "18px",
                                fontWeight: "600",
                                color: isExpired ? "#6c757d" : "#1976d2",
                                paddingRight: isExpired ? "80px" : "0",
                              }}
                            >
                              {assignment.subject}
                            </h3>
                          </div>

                          {/* Assignment Details */}
                          <div style={{ marginBottom: "16px" }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection:
                                  window.innerWidth <= 768 ? "column" : "row",
                                gap: window.innerWidth <= 768 ? "8px" : "16px",
                                fontSize: "14px",
                                color: "#666",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <i
                                  className="fas fa-calendar-plus"
                                  style={{ color: "#28a745", fontSize: "12px" }}
                                ></i>
                                <span>
                                  <strong>Posted:</strong>{" "}
                                  {assignment.postedAt?.toLocaleDateString
                                    ? assignment.postedAt.toLocaleDateString(
                                        "en-US",
                                        {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        }
                                      )
                                    : "N/A"}
                                </span>
                              </div>

                              {assignment.deadline && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <i
                                    className="fas fa-clock"
                                    style={{
                                      color: isExpired ? "#ff5252" : "#ff9800",
                                      fontSize: "12px",
                                    }}
                                  ></i>
                                  <span
                                    style={{
                                      color: isExpired ? "#ff5252" : "#666",
                                    }}
                                  >
                                    <strong>Deadline:</strong>{" "}
                                    {assignment.deadline?.toLocaleDateString
                                      ? `${assignment.deadline.toLocaleDateString(
                                          "en-US",
                                          {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                          }
                                        )} at ${assignment.deadline.toLocaleTimeString(
                                          "en-US",
                                          {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          }
                                        )}`
                                      : "N/A"}
                                    {isExpired && (
                                      <span
                                        style={{
                                          marginLeft: "8px",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        (Expired)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection:
                                window.innerWidth <= 768 ? "column" : "row",
                              gap: "8px",
                              justifyContent: "flex-end",
                            }}
                          >
                            {!isExpired ? (
                              <button
                                className="assignment-action-btn view-btn"
                                onClick={() =>
                                  window.open(
                                    assignment.driveLink,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                aria-label={`Open assignment ${assignment.subject}`}
                                style={{
                                  background: "#1976d2",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 16px",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  transition: "background-color 0.2s ease",
                                  minWidth:
                                    window.innerWidth <= 768 ? "100%" : "auto",
                                  justifyContent: "center",
                                }}
                                onMouseOver={(e) =>
                                  (e.target.style.backgroundColor = "#1565c0")
                                }
                                onMouseOut={(e) =>
                                  (e.target.style.backgroundColor = "#1976d2")
                                }
                              >
                                <i className="fas fa-external-link-alt"></i>
                                Open Assignment
                              </button>
                            ) : (
                              <div
                                style={{
                                  background: "#e0e0e0",
                                  color: "#757575",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 16px",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  minWidth:
                                    window.innerWidth <= 768 ? "100%" : "auto",
                                  justifyContent: "center",
                                }}
                                title="Assignment link unavailable - deadline expired"
                              >
                                <i className="fas fa-lock"></i>
                                Link Expired
                              </div>
                            )}

                            {assignment.staffId === auth.currentUser?.uid && (
                              <button
                                className="assignment-action-btn delete-btn"
                                onClick={() => deleteAssignment(assignment.id)}
                                aria-label={`Delete assignment ${assignment.subject}`}
                                style={{
                                  background: "#f44336",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 16px",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  transition: "background-color 0.2s ease",
                                  minWidth:
                                    window.innerWidth <= 768 ? "100%" : "auto",
                                  justifyContent: "center",
                                }}
                                onMouseOver={(e) =>
                                  (e.target.style.backgroundColor = "#d32f2f")
                                }
                                onMouseOut={(e) =>
                                  (e.target.style.backgroundColor = "#f44336")
                                }
                              >
                                <i className="fas fa-trash"></i>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div
              id="results-container"
              className={`toggle-container ${
                activeContainer === "results-container" ? "active" : ""
              }`}
            >
              <div className="container-header">Student Results Overview</div>
              <div className="container-body scrollable">
                {results.length === 0 ? (
                  <p className="empty-message">
                    No student results to display yet. Ensure tasks and student
                    data are loaded.
                  </p>
                ) : (
                  <ul className="leaderboard">
                    {results
                      .filter(
                        (r) =>
                          r.name &&
                          r.name !== "Anonymous" &&
                          r.name !== "Unknown" &&
                          r.name !== "Unknown User"
                      )
                      .map((result) => {
                        // Calculate percentage
                        const percent =
                          result.totalTasks > 0
                            ? Math.round(
                                (result.completedTasks / result.totalTasks) *
                                  100
                              )
                            : 0;
                        // Determine color
                        let percentColor = "#e53935"; // red for 0
                        if (percent === 100) percentColor = "#43a047"; // green
                        else if (percent >= 50) percentColor = "#fb8c00"; // orange

                        return (
                          <li
                            key={`result-item-${result.id}`}
                            className="result-item"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "4px",
                              padding: "10px 0",
                              borderBottom: "1px solid #eee",
                              wordBreak: "break-word",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#222" }}>
                              {result.name}
                            </span>
                            <span style={{ fontSize: 15, color: "#555" }}>
                              {result.completedTasks} / {result.totalTasks}{" "}
                              tasks completed
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 16,
                                color: percentColor,
                                background: "#f4f7fc",
                                borderRadius: 8,
                                padding: "0px",
                                marginTop: 2,
                                display: "inline-block",
                              }}
                            >
                              Progress: {percent}%
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
            <div
              id="monitor-container"
              className={`toggle-container ${
                activeContainer === "monitor-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                <h2 style={{ alignItems: "center", color: "black" }}>
                  Student Activity Monitor
                </h2>
                <button
                  onClick={() => setActiveContainer(null)}
                  className="back-btn small"
                  style={{ float: "right" }}
                  aria-label="Back to dashboard from monitor"
                >
                  Back to Dashboard
                </button>
              </div>
              <div
                className="container-body scrollable"
                style={{ padding: 10 }}
              >
                <div className="latest-activity-details">
                  <span style={{ alignItems: "center" }}>Latest Activity:</span>
                  <div style={{ marginTop: "6px", color: "#333" }}>
                    {latestActivity || "No recent activity."}
                  </div>
                </div>
                <StudentMonitor />
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
              <div className="contact-list-header">Student Chat</div>
              <div
                className="contact-list-body"
                style={{
                  height: "calc(100vh - 200px)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "0",
                }}
              >
                <ChatInterface
                  messages={messages}
                  sendMessage={sendMessage}
                  deleteMessage={deleteMessage}
                  showContactList={showContactList}
                  setShowContactList={setShowContactList}
                  setSelectedStudentId={setSelectedStudentId}
                  setSelectedStudentName={setSelectedStudentName}
                  currentUserId={auth.currentUser?.uid}
                  studentList={studentStats.filter(
                    (student) =>
                      student.name &&
                      student.name !== "Anonymous" &&
                      student.name !== "Unknown" &&
                      student.name !== "Unknown User"
                  )}
                  selectedStudentName={selectedStudentName}
                  selectedStudentId={selectedStudentId}
                  userNames={userNames}
                  unreadMessageCounts={unreadMessageCounts}
                  selectStudentAndMarkAsRead={selectStudentAndMarkAsRead} // This function is now defined
                />
              </div>
            </div>
            <div
              id="quick-stats-container"
              className={`toggle-container ${
                activeContainer === "quick-stats-container" ? "active" : ""
              }`}
            >
              <div className="container-header">
                Student List ({filterType || "All Students"})
                <button
                  onClick={() => setActiveContainer(null)}
                  className="back-btn small"
                  style={{ float: "right" }}
                  aria-label="Back to dashboard from student list"
                >
                  Back to Dashboard
                </button>
              </div>
              <div className="container-body scrollable">
                {loading.students ? (
                  <p>Loading students...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="empty-message">
                    No students match the current filter.
                  </p>
                ) : (
                  <div className="leaderboard">
                    {filteredStudents
                      .filter(
                        (student) =>
                          student.name &&
                          student.name !== "Anonymous" &&
                          student.name !== "Unknown" &&
                          student.name !== "Unknown User"
                      )
                      .map((student) => (
                        <div
                          key={`filtered-student-${student.id}`}
                          className="contact-list-body"
                        >
                          <div className="contact-body">
                            <h4>{student.name || "Anonymous"}</h4>
                            <p>
                              <strong>Streak:</strong> {student.streak || 0}{" "}
                              days
                            </p>
                            <p>
                              <strong>Progress:</strong> {student.progress || 0}
                              %
                            </p>
                            <p>
                              <strong>Last Login:</strong>{" "}
                              {student.lastLogin?.toDate
                                ? student.lastLogin
                                    .toDate()
                                    .toLocaleDateString()
                                : "N/A"}
                            </p>
                            {/* Removed the "Chat with student" button here */}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
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
                <h3>Profile Options</h3>
                <button
                  onClick={handleEditProfile}
                  className="add-goal-btn"
                  aria-label="Edit profile"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="add-goal-btn logout-btn"
                  aria-label="Logout"
                >
                  Logout
                </button>

                <h3 style={{ marginTop: "30px" }}>App Information</h3>
                <button
                  onClick={() => setActiveContainer("about-container")}
                  className="add-goal-btn"
                  aria-label="About the app"
                  style={{ backgroundColor: "#17a2b8", color: "white" }}
                >
                  About the App
                </button>
              </div>
            </div>
            <div
              id="about-container"
              className={`toggle-container ${
                activeContainer === "about-container" ? "active" : ""
              }`}
            >
              <div className="container-header">📱 About the App</div>
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
              id="timetable-creator-container"
              className={`toggle-container ${
                activeContainer === "timetable-creator-container"
                  ? "active"
                  : ""
              }`}
            >
              <div className="container-body scrollable">
                <Timetable isContainer={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Only show floating chatbot on desktop */}
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
