// StaffDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
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
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import TaskItem from '../components/TaskItem';
import GuideModal from '../components/GuideModal';
import StudentMonitor from '../components/StudentMonitor';
import Notification from '../components/Notification';
import '../styles/Dashboard.css';
import '../styles/StaffInteraction.css';
import '../styles/Chat.css';

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return <div className="error-fullpage">Something went wrong. Please refresh the page.</div>;
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
}) => {
  const selectStudent = useCallback(
    (student) => {
      setSelectedStudentId(student.id);
      setSelectedStudentName(student.name);
      setShowContactList(false);
    },
    [setSelectedStudentId, setSelectedStudentName, setShowContactList]
  );

  const formatDate = (dateString) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(dateString);

    if (messageDate.toDateString() === today.toDateString()) return 'Today';
    if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const groupedMessages = useMemo(() => {
    return messages.reduce((acc, message, index) => {
      const date = new Date(message.timestamp).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push({ ...message, originalIndex: index });
      return acc;
    }, {});
  }, [messages]);

  return (
    <div className="chat-interface">
      {showContactList ? (
        <div className="contact-list full-container">
          <div className="contact-list-header">Students</div>
          <div className="contact-list-body scrollable">
            {studentList.length === 0 ? (
              <p className="empty-message">No students available.</p>
            ) : (
              studentList.map((student) => (
                <div
                  key={`student-${student.id}`}
                  className={`contact-item ${selectedStudentId === student.id ? 'active' : ''}`}
                  onClick={() => selectStudent(student)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && selectStudent(student)}
                >
                  <div className="contact-info">
                    <h4>{student.name || 'Anonymous'}</h4>
                    <p>{student.role || 'Student'}</p>
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
              aria-label="Back to contact list"
            >
              Back to List
            </button>
            {selectedStudentName && (
              <div className="recipient-info" style={{ marginLeft: 'auto' }}>
                <h3>{selectedStudentName}</h3>
                <p className="status">Online</p>
              </div>
            )}
          </div>
          <div className="messages-container scrollable">
            {selectedStudentId && Object.keys(groupedMessages).length === 0 ? (
              <p className="empty-message">No messages yet. Start the conversation!</p>
            ) : !selectedStudentId ? (
              <p className="empty-message">Select a student to view messages.</p>
            ) : (
              Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={`date-${date}`}>
                  <div className="date-separator">{formatDate(date)}</div>
                  {dateMessages.map((msg) => (
                    <div
                      key={`msg-${msg.timestamp}-${msg.originalIndex}`}
                      className={`message-bubble ${msg.sender === 'staff' ? 'sent' : 'received'}`}
                      onClick={() => {
                        if (msg.sender === 'staff' && window.confirm('Delete this message?')) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && msg.sender === 'staff' && window.confirm('Delete this message?')) {
                          deleteMessage(msg.originalIndex);
                        }
                      }}
                    >
                      <div className="message-sender" style={{ fontSize: '0.8em', color: '#777', marginBottom: '2px' }}>
                        {msg.sender === 'staff'
                          ? (userNames[currentUserId] || 'You')
                          : (userNames[msg.senderId] || selectedStudentName || 'Student')}
                      </div>
                      <div className="message-content">{msg.text}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {msg.sender === 'staff' && (
                          <span className="message-status">{msg.read ? '✓✓' : '✓'}</span>
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
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="message-input-field"
                aria-label="Message input"
              />
              <button onClick={sendMessage} className="send-message-button" aria-label="Send message">
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
};

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
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [results, setResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quickStats, setQuickStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    overallPerformance: 0,
  });
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);
  const [filterType, setFilterType] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [newAssignmentSubject, setNewAssignmentSubject] = useState('');
  const [newAssignmentLink, setNewAssignmentLink] = useState('');
  const [newAssignmentDeadline, setNewAssignmentDeadline] = useState('');
  const [latestActivity, setLatestActivity] = useState(null);
  const [showMarkingUI, setShowMarkingUI] = useState(false);
  const [selectedStudentForMarking, setSelectedStudentForMarking] = useState('');
  const [selectedAssignmentForMarking, setSelectedAssignmentForMarking] = useState('');
  const [assignmentMarks, setAssignmentMarks] = useState('');
  const [userNames, setUserNames] = useState({});

  const addNotification = useCallback((message, type = 'info') => {
    setNotifications((prev) => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const isValidDriveLink = (url) => {
    return /^https:\/\/(drive\.google\.com|docs\.google\.com)/.test(url);
  };

  const fetchUserNames = useCallback(async (idsToFetch, currentStaffId) => {
    const newNamesMap = {};
    const allIds = [...new Set(idsToFetch)];

    const promises = allIds.map(id => {
      return getDoc(doc(db, 'students', id));
    });

    try {
      const docSnaps = await Promise.all(promises);
      docSnaps.forEach((docSnap, index) => {
        const id = allIds[index];
        if (docSnap.exists()) {
          newNamesMap[id] = docSnap.data().name || 'Anonymous';
        } else {
          newNamesMap[id] = 'Unknown User';
        }
      });

      if (currentStaffId && !userNames[currentStaffId]) {
        const staffDoc = await getDoc(doc(db, 'staff', currentStaffId));
        if (staffDoc.exists()) {
          newNamesMap[currentStaffId] = staffDoc.data().name || 'Staff';
        } else {
          newNamesMap[currentStaffId] = 'Staff';
        }
      }
      setUserNames(prevNames => ({ ...prevNames, ...newNamesMap }));
    } catch (e) {
      console.error('Error fetching user names:', e);
      addNotification('Failed to load some user names.', 'error');
    }
  }, [addNotification]);

  useEffect(() => {
    const fetchInitialDashboardData = async () => {
      setLoading(prev => ({ ...prev, dashboard: true, students: true }));
      try {
        const user = auth.currentUser;
        if (!user) {
          addNotification('No authenticated user. Redirecting to login.', 'error');
          navigate('/staff-login');
          return;
        }

        const staffDocRef = doc(db, 'staff', user.uid);
        const staffDocSnap = await getDoc(staffDocRef);
        if (!staffDocSnap.exists()) {
          addNotification('Staff profile not found. Redirecting to form.', 'error');
          navigate('/staff-form');
          return;
        }
        if (!staffDocSnap.data().formFilled) {
          navigate('/staff-form');
          return;
        }
        setUserData(staffDocSnap.data());
        if (!userNames[user.uid]) {
          fetchUserNames([], user.uid);
        }

        const studentsRef = collection(db, 'students');
        const studentSnapshot = await getDocsFromServer(studentsRef);
        const studentsData = studentSnapshot.docs.map((sDoc) => ({
          id: sDoc.id,
          ...sDoc.data(),
          streak: sDoc.data().streak || 0,
          progress: sDoc.data().progress || 0,
          photoURL: sDoc.data().photoURL || '/default-student.png',
        }));
        setStudentStats(studentsData.sort((a, b) => b.streak - a.streak));
        setLoading(prev => ({ ...prev, students: false }));

        const studentIds = studentsData.map(s => s.id);
        if (studentIds.length > 0) {
          await fetchUserNames(studentIds, user.uid);
        }

        const totalStudents = studentsData.length;
        const today = new Date();
        const activeStudents = studentsData.filter((student) => {
          const lastLoginDate = student.lastLogin?.toDate ? student.lastLogin.toDate() : (student.lastLogin ? new Date(student.lastLogin) : null);
          return lastLoginDate && (today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
        }).length;
        const overallPerformance = totalStudents > 0
          ? Math.round(studentsData.reduce((sum, s) => sum + (s.progress || 0), 0) / totalStudents)
          : 0;
        setQuickStats({ totalStudents, activeStudents, overallPerformance });

      } catch (err) {
        console.error('Error fetching initial dashboard data:', err);
        addNotification('Failed to load dashboard data: ' + err.message, 'error');
      } finally {
        setLoading(prev => ({ ...prev, dashboard: false }));
      }
    };

    fetchInitialDashboardData();
  }, [navigate, addNotification, fetchUserNames]);

  useEffect(() => {
    setLoading(prev => ({ ...prev, tasks: true }));
    const tasksRef = doc(db, 'tasks', 'shared');
    const unsubscribe = onSnapshot(tasksRef, (tasksSnap) => {
      setTasks(tasksSnap.exists() ? tasksSnap.data().tasks || [] : []);
      setLoading(prev => ({ ...prev, tasks: false }));
    }, (error) => {
      console.error("Error fetching tasks:", error);
      addNotification('Failed to load tasks: ' + error.message, 'error');
      setLoading(prev => ({ ...prev, tasks: false }));
    });
    return () => unsubscribe();
  }, [addNotification]);

  const fetchAssignments = useCallback(() => {
    setLoading((prev) => ({ ...prev, assignments: true }));
    const user = auth.currentUser;
    if (!user) {
      addNotification('User not authenticated for assignments.', 'error');
      setLoading((prev) => ({ ...prev, assignments: false }));
      return () => {};
    }
    const q = query(collection(db, 'assignments'), orderBy('postedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffAssignments = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          postedAt: doc.data().postedAt?.toDate ? doc.data().postedAt.toDate() : new Date(),
          deadline: doc.data().deadline?.toDate ? doc.data().deadline.toDate() : null,
        }))
        .filter((assignment) => assignment.staffId === user.uid);
      setAssignments(staffAssignments);
      setLoading((prev) => ({ ...prev, assignments: false }));
    }, (err) => {
      console.error('Error fetching assignments snapshot:', err);
      addNotification('Failed to load assignments: ' + err.message, 'error');
      setLoading((prev) => ({ ...prev, assignments: false }));
    });
    return unsubscribe;
  }, [addNotification]);

  useEffect(() => {
    const unsubscribe = fetchAssignments();
    return () => unsubscribe();
  }, [fetchAssignments]);

  useEffect(() => {
    if (!loading.students && !loading.tasks) {
      const resultsData = studentStats.map((student) => ({
        id: student.id,
        name: student.name || 'Anonymous',
        completedTasks: tasks.filter((task) => task.completedBy?.includes(student.id)).length,
        totalTasks: tasks.length,
      }));
      setResults(resultsData);
    }
  }, [tasks, studentStats, loading.students, loading.tasks]);

  useEffect(() => {
    // Temporarily disable fetching latest activity from Firebase
    setLatestActivity('Monitor fetch is temporarily disabled.');
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
    const hasSeenGuide = localStorage.getItem('hasSeenStaffGuide');
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem('hasSeenStaffGuide', 'true');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsChatbotOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedStudentId) {
      setMessages([]);
      return;
    }
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId) return;

    const chatId = `${staffUserId}_${selectedStudentId}`;
    const messagesRef = doc(db, 'messages', chatId);
    const unsubscribe = onSnapshot(messagesRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          const currentMessages = docSnap.data().messages || [];
          setMessages(currentMessages);
          const updatedMessages = currentMessages.map((msg) =>
            msg.sender === 'student' && !msg.read ? { ...msg, read: true } : msg
          );
          if (JSON.stringify(currentMessages) !== JSON.stringify(updatedMessages)) {
            await setDoc(messagesRef, { messages: updatedMessages }, { merge: true });
          }
          const senderIds = currentMessages.map(msg => msg.senderId).filter(id => id && !userNames[id]);
          if (senderIds.length > 0) {
            fetchUserNames(senderIds, staffUserId);
          }
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error processing message snapshot:', err);
        addNotification('Failed to load messages.', 'error');
      }
    }, (err) => {
      console.error('Error subscribing to messages:', err);
      addNotification('Failed to load messages: ' + err.message, 'error');
    });
    return () => unsubscribe();
  }, [selectedStudentId, addNotification, fetchUserNames, userNames]);

  useEffect(() => {
    setMobileHamburger(
      <button className="mobile-hamburger" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <i className="fas fa-bars"></i>
      </button>
    );
  }, []);

  const filteredStudents = useMemo(() => {
    if (!activeContainer || !filterType) return studentStats;
    const today = new Date();
    switch (filterType) {
      case 'total':
        return studentStats;
      case 'active':
        return studentStats.filter((student) => {
          const lastLogin = student.lastLogin?.toDate ? student.lastLogin.toDate() : (student.lastLogin ? new Date(student.lastLogin) : null);
          return lastLogin && (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24) <= 7;
        });
      case 'performance':
        return studentStats.filter((student) => (student.progress || 0) >= 50);
      default:
        return studentStats;
    }
  }, [filterType, studentStats, activeContainer]);

  const toggleContainer = useCallback((containerId, filter = null) => {
    setActiveContainer((prev) => (prev === containerId && filter === filterType ? null : containerId));
    setFilterType(filter);
  }, [filterType]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const postTask = async () => {
    try {
      const contentInput = document.getElementById('task-content');
      const content = contentInput?.value.trim();
      if (!content) {
        addNotification('Please enter a topic for the task.', 'warning');
        return;
      }
      const newTask = {
        id: Date.now().toString(),
        content,
        date: new Date().toLocaleDateString(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
        completedBy: [],
        subject: userData?.subject || 'General',
        staffId: auth.currentUser?.uid,
      };
      const tasksRef = doc(db, 'tasks', 'shared');
      const tasksSnap = await getDoc(tasksRef);
      const existingTasks = tasksSnap.exists() ? tasksSnap.data().tasks || [] : [];
      await setDoc(tasksRef, { tasks: [...existingTasks, newTask] });

      if (contentInput) contentInput.value = '';
      addNotification('Task posted successfully!', 'success');
    } catch (err) {
      console.error('Error posting task:', err);
      addNotification('Failed to post task: ' + err.message, 'error');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this task?')) return;
      const tasksRef = doc(db, 'tasks', 'shared');
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) {
        const existingTasks = tasksSnap.data().tasks || [];
        const updatedTasks = existingTasks.filter((task) => task.id !== taskId);
        await setDoc(tasksRef, { tasks: updatedTasks });
        addNotification('Task deleted successfully!', 'success');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      addNotification('Failed to delete task: ' + err.message, 'error');
    }
  };

  const sendMessage = useCallback(async () => {
    try {
      const input = document.getElementById('staff-message-input');
      const text = input?.value.trim();
      if (!text || !selectedStudentId) {
        addNotification('Please select a student and type a message.', 'warning');
        return;
      }
      const staffUserId = auth.currentUser?.uid;
      if (!staffUserId) {
        addNotification('User not authenticated to send message.', 'error');
        return;
      }
      const chatId = `${staffUserId}_${selectedStudentId}`;
      const newMessage = {
        text,
        sender: 'staff',
        senderId: staffUserId,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const messagesRef = doc(db, 'messages', chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists() ? messagesSnap.data().messages || [] : [];
      await setDoc(messagesRef, { messages: [...existingMessages, newMessage] }, { merge: true });

      if (input) input.value = '';
    } catch (err) {
      console.error('Error sending message:', err);
      addNotification('Failed to send message: ' + err.message, 'error');
    }
  }, [selectedStudentId, addNotification]);

  const deleteMessage = useCallback(
    async (originalIndex) => {
      try {
        if (!selectedStudentId) return;
        const staffUserId = auth.currentUser?.uid;
        if (!staffUserId) {
          addNotification('User not authenticated to delete message.', 'error');
          return;
        }
        const chatId = `${staffUserId}_${selectedStudentId}`;
        const updatedMessages = messages.filter((_, i) => i !== originalIndex);
        const messagesRef = doc(db, 'messages', chatId);
        await setDoc(messagesRef, { messages: updatedMessages });
        addNotification('Message deleted.', 'info');
      } catch (err) {
        console.error('Error deleting message:', err);
        addNotification('Failed to delete message: ' + err.message, 'error');
      }
    },
    [selectedStudentId, messages, addNotification]
  );

  const postAssignment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        addNotification('No authenticated user. Cannot post assignment.', 'error');
        return;
      }
      const staffDocSnap = await getDoc(doc(db, 'staff', user.uid));
      if (!staffDocSnap.exists() || !staffDocSnap.data().formFilled) {
        addNotification('Staff profile incomplete or not found.', 'error');
        return;
      }
      if (!newAssignmentSubject.trim() || !newAssignmentLink.trim()) {
        addNotification('Please enter assignment subject and Google Drive link.', 'warning');
        return;
      }
      if (!isValidDriveLink(newAssignmentLink)) {
        addNotification('Please enter a valid Google Drive or Google Docs link.', 'warning');
        return;
      }

      let deadlineTimestamp = null;
      if (newAssignmentDeadline) {
        const deadlineDate = new Date(newAssignmentDeadline + "T23:59:59");
        if (isNaN(deadlineDate.getTime())) {
          addNotification('Invalid deadline date provided.', 'warning');
          return;
        }
        deadlineTimestamp = Timestamp.fromDate(deadlineDate);
      }

      const newAssignmentData = {
        subject: newAssignmentSubject.trim(),
        driveLink: newAssignmentLink.trim(),
        staffId: user.uid,
        staffName: staffDocSnap.data().name || 'Staff',
        postedAt: Timestamp.now(),
        deadline: deadlineTimestamp,
        isPublic: true,
      };
      const assignmentRef = await addDoc(collection(db, 'assignments'), newAssignmentData);
      addNotification('Assignment posted successfully!', 'success');

      const studentsRef = collection(db, 'students');
      const studentSnapshot = await getDocs(studentsRef);
      studentSnapshot.forEach(async (studentDoc) => {
        const studentNotifRef = collection(db, 'students', studentDoc.id, 'notifications');
        await addDoc(studentNotifRef, {
          message: `New assignment posted: ${newAssignmentSubject}`,
          type: 'assignment',
          assignmentId: assignmentRef.id,
          timestamp: Timestamp.now(),
        });
      });

      setNewAssignmentSubject('');
      setNewAssignmentLink('');
      setNewAssignmentDeadline('');
    } catch (err) {
      console.error('Error posting assignment:', err);
      addNotification('Failed to post assignment: ' + err.message, 'error');
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) return;
      await deleteDoc(doc(db, 'assignments', assignmentId));
      addNotification('Assignment deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting assignment:', err);
      addNotification('Failed to delete assignment: ' + err.message, 'error');
    }
  };

  const handleSendMarks = async () => {
    if (!selectedStudentForMarking || !selectedAssignmentForMarking || !assignmentMarks.trim()) {
      addNotification('Please select student, assignment, and enter marks.', 'warning');
      return;
    }
    const staffUserId = auth.currentUser?.uid;
    if (!staffUserId) {
      addNotification('User not authenticated to send marks.', 'error');
      return;
    }

    // Move this line here so it's available in both try blocks
    const selectedAssignmentDetails = assignments.find((a) => a.id === selectedAssignmentForMarking);

    try {
      const marksPath = `students/${selectedStudentForMarking}/marks/${selectedAssignmentForMarking}`;
      const marksRef = doc(db, marksPath);

      await setDoc(marksRef, {
        marks: assignmentMarks.trim(),
        assignmentSubject: selectedAssignmentDetails?.subject || 'N/A',
        assignmentId: selectedAssignmentForMarking,
        staffId: staffUserId,
        staffName: userData?.name || userNames[staffUserId] || 'Staff',
        markedAt: Timestamp.now(),
      }, { merge: true });

      addNotification('Marks sent successfully!', 'success');
      setSelectedStudentForMarking('');
      setSelectedAssignmentForMarking('');
      setAssignmentMarks('');
    } catch (err) {
      console.error('Error sending marks:', err);
      addNotification(`Failed to send marks: ${err.message}`, 'error');
      return;
    }

    // Try sending notification, but don't show error if it fails
    try {
      const studentNotifRef = collection(db, 'students', selectedStudentForMarking, 'notifications');
      await addDoc(studentNotifRef, {
        message: `Marks received for assignment "${selectedAssignmentDetails?.subject}": ${assignmentMarks}`,
        type: 'marks',
        assignmentId: selectedAssignmentForMarking,
        timestamp: Timestamp.now(),
      });
    } catch (err) {
      console.warn('Failed to send notification to student:', err);
      // Optionally: addNotification('Failed to send notification to student.', 'warning');
    }
  };

  const handleEditProfile = () => {
    navigate('/staff-form', { state: { isEdit: true, userData } });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
      addNotification('Failed to log out.', 'error');
    }
  };

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  const isDashboardLoading = loading.dashboard || loading.students;

  if (isDashboardLoading) {
    return <div className="loading-dashboard text-center p-8">Loading Staff Dashboard...</div>;
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
        />
        <div className={`main-content ${sidebarVisible ? 'sidebar-active' : ''}`}>
          <div className="header">
            {mobileHamburger}
            <input
              type="text"
              className="search-bar"
              placeholder="Search students, assignments..."
              aria-label="Search"
            />
          </div>
          <div className="notifications-area">
            {notifications.map((notif) => (
              <Notification
                key={`notif-area-${notif.id}`}
                message={notif.message}
                type={notif.type}
                onClose={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
              />
            ))}
          </div>
          <div id="main-content-section">
            {!activeContainer && (
              <div id="default-content" className="quick-stats">
                <h2>Quick Stats</h2>
                <div className="stats-container">
                  <div className="stat-box" onClick={() => toggleContainer('quick-stats-container', 'total')} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleContainer('quick-stats-container', 'total')}>
                    <i className="fas fa-users"></i>
                    <h3>Total Students</h3>
                    <p>{quickStats.totalStudents}</p>
                  </div>
                  <div className="stat-box" onClick={() => toggleContainer('quick-stats-container', 'active')} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleContainer('quick-stats-container', 'active')}>
                    <i className="fas fa-user-check"></i>
                    <h3>Active Students</h3>
                    <p>{quickStats.activeStudents}</p>
                  </div>
                  <div className="stat-box" onClick={() => toggleContainer('tasks-container')} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleContainer('tasks-container')}>
                    <i className="fas fa-tasks"></i>
                    <h3>Tasks</h3>
                    <p>{loading.tasks ? 'Loading...' : `${tasks.length} Active`}</p>
                  </div>
                  <div className="stat-box" onClick={() => toggleContainer('quick-stats-container', 'performance')} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleContainer('quick-stats-container', 'performance')}>
                    <i className="fas fa-chart-line"></i>
                    <h3>Overall Performance</h3>
                    <p>{quickStats.overallPerformance}%</p>
                  </div>
                  <div className="stat-box" onClick={() => toggleContainer('monitor-container')} role="button" tabIndex={0} onKeyPress={(e) => e.key === 'Enter' && toggleContainer('monitor-container')}>
                    <i className="fas fa-history"></i>
                    <h3>Latest Activity</h3>
                    <p style={{ fontSize: '0.8em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {latestActivity || 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div id="tasks-container" className={`toggle-container ${activeContainer === 'tasks-container' ? 'active' : ''}`}>
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
                  <button onClick={postTask} className="add-goal-btn" aria-label="Post task">
                    Post Task
                  </button>
                </div>
                {loading.tasks ? (
                  <p>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="empty-message">No tasks posted yet. Add one above!</p>
                ) : (
                  <div className="tasks-list scrollable" style={{ maxHeight: '300px', marginBottom: '20px' }}>
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
            <div id="assignments-container" className={`toggle-container ${activeContainer === 'assignments-container' ? 'active' : ''}`}>
              <div className="container-header">
                Assignments
              </div>
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
                  <input
                    type="date"
                    value={newAssignmentDeadline}
                    onChange={(e) => setNewAssignmentDeadline(e.target.value)}
                    className="goal-input"
                    title="Optional: Set a deadline for the assignment"
                    aria-label="New assignment deadline"
                  />
                  <button onClick={postAssignment} className="add-goal-btn" aria-label="Post new assignment button">
                    Post Assignment
                  </button>
                </div>
                <div className="assignment-form marking-ui" style={{ marginTop: '30px' }}>
                  <h3>Mark Student Assignment</h3>
                  <select
                    value={selectedStudentForMarking}
                    onChange={(e) => setSelectedStudentForMarking(e.target.value)}
                    className="goal-input"
                    aria-label="Select student for marking"
                  >
                    <option value="">-- Select Student --</option>
                    {studentStats.map((student) => (
                      <option key={`mark-student-option-${student.id}`} value={student.id}>
                        {student.name || 'Anonymous'} ({student.id.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedAssignmentForMarking}
                    onChange={(e) => setSelectedAssignmentForMarking(e.target.value)}
                    className="goal-input"
                    aria-label="Select assignment for marking"
                  >
                    <option value="">-- Select Assignment --</option>
                    {assignments.map((assignment) => (
                      <option key={`mark-assignment-option-${assignment.id}`} value={assignment.id}>
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
                  <button onClick={handleSendMarks} className="add-goal-btn" aria-label="Send marks button">
                    Send Marks
                  </button>
                </div>
                <h4 style={{ marginTop: '30px' }}>Your Posted Assignments:</h4>
                {loading.assignments ? (
                  <p>Loading your assignments...</p>
                ) : assignments.length === 0 ? (
                  <p className="empty-message">You have not posted any assignments yet.</p>
                ) : (
                  <div className="assignment-list scrollable" style={{ maxHeight: '300px' }}>
                    {assignments.map((assignment) => (
                      <div key={`posted-assignment-${assignment.id}`} className="assignment-item task-item">
                        <p style={{ flexGrow: 1 }}>
                          {assignment.subject}
                          <small className="assignment-meta">
                            {' '}
                            (Posted:{' '}
                            {assignment.postedAt?.toDate
                              ? assignment.postedAt.toLocaleDateString()
                              : 'N/A'})
                          </small>
                          {assignment.deadline && (
                            <small className="assignment-meta" style={{ color: new Date(assignment.deadline) < new Date() ? 'red' : 'darkorange' }}>
                              {' '}
                              (Deadline:{' '}
                              {assignment.deadline?.toDate
                                ? assignment.deadline.toLocaleDateString()
                                : 'N/A'})
                              {new Date(assignment.deadline) < new Date() ? ' - Expired' : ''}
                            </small>
                          )}
                        </p>
                        <div className="assignment-actions">
                          <button
                            className="action-btn view-btn"
                            onClick={() => window.open(assignment.driveLink, '_blank', 'noopener,noreferrer')}
                            aria-label={`Open assignment ${assignment.subject}`}
                          >
                            <i className="fas fa-external-link-alt"></i> Open
                          </button>
                          {assignment.staffId === auth.currentUser?.uid && (
                            <button
                              className="action-btn delete-btn"
                              onClick={() => deleteAssignment(assignment.id)}
                              aria-label={`Delete assignment ${assignment.subject}`}
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div id="results-container" className={`toggle-container ${activeContainer === 'results-container' ? 'active' : ''}`}>
              <div className="container-header">Student Results Overview</div>
              <div className="container-body scrollable">
                {results.length === 0 ? (
                  <p className="empty-message">No student results to display yet. Ensure tasks and student data are loaded.</p>
                ) : (
                  <ul className="results-list">
                    {results.map((result) => (
                      <li key={`result-item-${result.id}`} className="result-item">
                        <strong>{result.name || 'Anonymous'}:</strong> {result.completedTasks} / {result.totalTasks} tasks completed.
                        (Progress: {result.totalTasks > 0 ? Math.round((result.completedTasks / result.totalTasks) * 100) : 0}%)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div id="monitor-container" className={`toggle-container ${activeContainer === 'monitor-container' ? 'active' : ''}`}>
              <div className="container-header">
                Student Activity Monitor
                <button
                  onClick={() => setActiveContainer(null)}
                  className="back-btn small"
                  style={{ float: 'right' }}
                  aria-label="Back to dashboard from monitor"
                >
                  Back to Dashboard
                </button>
              </div>
              <div className="container-body scrollable" style={{ padding: 0 }}>
                <div className="latest-activity-details" style={{ padding: '16px', borderBottom: '1px solid #eee', background: '#f9fafb' }}>
                  <strong>Latest Activity:</strong>
                  <div style={{ marginTop: '6px', color: '#333' }}>
                    {latestActivity || 'No recent activity.'}
                  </div>
                </div>
                <StudentMonitor />
              </div>
            </div>
            <div id="staff-interaction-container" className={`toggle-container ${activeContainer === 'staff-interaction-container' ? 'active' : ''}`}>
              <div className="container-header">Student Chat</div>
              <div className="container-body" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', padding: '0' }}>
                <ChatInterface
                  messages={messages}
                  sendMessage={sendMessage}
                  deleteMessage={deleteMessage}
                  showContactList={showContactList}
                  setShowContactList={setShowContactList}
                  setSelectedStudentId={setSelectedStudentId}
                  setSelectedStudentName={setSelectedStudentName}
                  currentUserId={auth.currentUser?.uid}
                  studentList={studentStats}
                  selectedStudentName={selectedStudentName}
                  selectedStudentId={selectedStudentId}
                  userNames={userNames}
                />
              </div>
            </div>
            <div id="quick-stats-container" className={`toggle-container ${activeContainer === 'quick-stats-container' ? 'active' : ''}`}>
              <div className="container-header">
                Student List ({filterType || 'All Students'})
                <button
                  onClick={() => setActiveContainer(null)}
                  className="back-btn small"
                  style={{ float: 'right' }}
                  aria-label="Back to dashboard from student list"
                >
                  Back to Dashboard
                </button>
              </div>
              <div className="container-body scrollable">
                {loading.students ? <p>Loading students...</p> :
                filteredStudents.length === 0 ? (
                  <p className="empty-message">No students match the current filter.</p>
                ) : (
                  <div className="student-list detailed-student-list">
                    {filteredStudents.map((student) => (
                      <div key={`filtered-student-${student.id}`} className="student-item-detailed">
                        <img
                          src={student.photoURL || '/default-student.png'}
                          alt={student.name || 'Student'}
                          className="student-avatar-large"
                          onError={(e) => (e.target.src = '/default-student.png')}
                        />
                        <div className="student-info-detailed">
                          <h4>{student.name || 'Anonymous'}</h4>
                          <p><strong>ID:</strong> {student.id.substring(0,8)}...</p>
                          <p><strong>Streak:</strong> {student.streak || 0} days</p>
                          <p><strong>Progress:</strong> {student.progress || 0}%</p>
                          <p><strong>Last Login:</strong> {student.lastLogin?.toDate ? student.lastLogin.toDate().toLocaleDateString() : 'N/A'}</p>
                          <button onClick={() => {
                            setSelectedStudentId(student.id);
                            setSelectedStudentName(student.name || 'Anonymous');
                            setShowContactList(false);
                            setActiveContainer('staff-interaction-container');
                          }} className="chat-with-student-btn">Chat with {student.name || 'Student'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div id="settings-container" className={`toggle-container ${activeContainer === 'settings-container' ? 'active' : ''}`}>
              <div className="container-header">Settings</div>
              <div className="container-body">
                <h3>Profile Options</h3>
                <button onClick={handleEditProfile} className="add-goal-btn" aria-label="Edit profile">
                  Edit Profile
                </button>
                <button onClick={handleLogout} className="add-goal-btn logout-btn" aria-label="Logout" style={{ backgroundColor: '#dc3545', color: 'white' }}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        {window.innerWidth <= 768 && (
          <button className="chat-toggle-btn mobile-chat-toggle" onClick={toggleChatbot} aria-label="Toggle chatbot">
            <i className="fas fa-comment-dots"></i>
          </button>
        )}
        <Chatbot
          role="staff"
          isMinimized={window.innerWidth <= 768 && !isChatbotOpen}
          isVisible={isChatbotOpen}
          toggleChatbot={toggleChatbot}
        />
      </div>
    </ErrorBoundary>
  );
};

export default StaffDashboard;