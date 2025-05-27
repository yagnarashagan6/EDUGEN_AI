import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  addDoc, // Added for student_activities
} from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import GoalItem from '../components/GoalItem';
import Quiz from '../components/Quiz';
import Notification from '../components/Notification';
import OverdueTaskNotification from '../components/OverdueTaskNotification';
import Chatbot from '../components/Chatbot';
import GuideModal from '../components/GuideModal';
import Notes from '../components/Notes';
import '../styles/Dashboard.css';
import '../styles/Sidebar.css';
import '../styles/Chat.css';
import '../styles/Notes.css';

// Simple TaskItem for display within subjects
const TaskItem = ({ task, role, onCopy, onStartQuiz }) => (
  <div className="task-item">
    <div className="task-header">
        <h3>{task.content}</h3>
         <div className="task-actions">
            <button className="copy-btn" onClick={() => onCopy(task.content)}>
                <i className="fas fa-copy"></i> Copy
            </button>
            <button className="quiz-btn" onClick={() => onStartQuiz(task.content)}>
                <i className="fas fa-question-circle"></i> Quiz
            </button>
        </div>
    </div>
    <p>Subject: {task.subject || 'General'}</p>
    <small>Deadline: {new Date(task.deadline).toLocaleDateString()}</small>
  </div>
);


const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  // TODO: Implement componentDidCatch if using class components or getDerivedStateFromError for functional
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

    if (messageDate.toDateString() === today.toDateString()) return 'Today';
    if (messageDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
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
              {staffList.length === 0 ? (
                <p className="empty-message">Loading staff members...</p>
              ) : (
                staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className={`contact-item ${selectedStaffId === staff.id ? 'active' : ''}`}
                    onClick={() => selectStaff(staff)}
                  >
                    <img
                      src={staff.photoURL || '/default-staff.png'}
                      alt="Staff"
                      className="contact-avatar"
                      onError={(e) => (e.target.src = '/default-staff.png')}
                    />
                    <div className="contact-info">
                      <h4>{staff.name}</h4>
                      <p>{staff.role || 'Available'}</p>
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
                    src={staffList.find((s) => s.id === selectedStaffId)?.photoURL || '/default-staff.png'}
                    alt="Staff"
                    className="recipient-avatar"
                    onError={(e) => (e.target.src = '/default-staff.png')}
                  />
                  <div className="recipient-info">
                    <h3>{selectedStaffName}</h3>
                    <p className="status">Online</p> {/* Consider making this dynamic */}
                  </div>
                </>
              )}
            </div>
            <div className="messages-container scrollable">
              {selectedStaffId ? (
                Object.keys(groupedMessages).length === 0 ? (
                  <p className="empty-message">No messages yet. Start the conversation!</p>
                ) : (
                  Object.keys(groupedMessages).map((dateKey) => ( // Renamed 'date' to 'dateKey'
                    <div key={dateKey}>
                      <div className="date-separator">{formatDate(dateKey)}</div>
                      {groupedMessages[dateKey].map((msg, index) => (
                        <div
                          key={`${msg.timestamp}-${index}`} // Ensure unique key
                          className={`message-bubble ${msg.sender === 'student' ? 'sent' : 'received'}`}
                          onClick={() => {
                            if (msg.sender === 'student' && window.confirm('Delete this message?')) {
                              deleteMessage(index);
                            }
                          }}
                        >
                          <div className="message-content">{msg.text}</div>
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {msg.sender === 'student' && (
                              <span className="message-status">{msg.read ? '✓✓' : '✓'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )
              ) : (
                <p className="empty-message">Select a staff member to start chatting.</p>
              )}
            </div>
            {selectedStaffId && (
              <div className="message-input-area">
                <input
                  type="text"
                  id="message-input" // Ensure this ID is unique if component is used multiple times or manage via ref
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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


const AssignmentItem = ({ assignment }) => {
  const openLink = () => {
    if (assignment.driveLink) {
      window.open(assignment.driveLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="task-item" // Reusing task-item style, consider a specific assignment-item style
      onClick={openLink}
      style={{ cursor: assignment.driveLink ? 'pointer' : 'default', marginBottom: '10px' }}
    >
      <div className="task-header">
        <h3>{assignment.subject}</h3>
      </div>
      <p>Posted by: {assignment.staffName || 'Unknown'}</p>
      <p>Posted on: {assignment.date ? new Date(assignment.date).toLocaleDateString() : 'N/A'}</p>
      {assignment.driveLink && <small>Click to view details</small>}
       {!assignment.driveLink && <small>No link available</small>}
    </div>
  );
};

const Leaderboard = ({ students, showStats = false, currentUserId }) => {
  const sortedStudents = [...students].sort((a, b) => {
    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;
    return (b.streak || 0) - (a.streak || 0);
  });

  return (
    <div className="leaderboard">
      <h3>Class Leaderboard</h3>
      <ul>
        {sortedStudents.map((student, index) => (
          <li key={student.id} className={student.id === currentUserId ? 'current-user-leaderboard' : ''}>
            <span>{index + 1}. {student.name} {student.id === currentUserId ? '(You)' : ''}</span>
            <span>Streak: {student.streak || 0} | Progress: {Math.round(student.progress || 0)}%</span>
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
  const [currentTopic, setCurrentTopic] = useState('');
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
      timeSpent: '0 minutes', // Added for time spent
      suggestions: '',
  });
  const [error, setError] = useState(null);
  const [quizCount, setQuizCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [copiedTopic, setCopiedTopic] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);
  const [overdueTaskReasons, setOverdueTaskReasons] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedAssignmentSubject, setSelectedAssignmentSubject] = useState(null);
  const [pendingStreakUpdate, setPendingStreakUpdate] = useState(false);
  const [newStreakValue, setNewStreakValue] = useState(0);
  
  const loginTimeRef = useRef(null);
  const [totalTimeSpentInMs, setTotalTimeSpentInMs] = useState(0);
  const sessionStartTimeRef = useRef(null); // For current session tracking

  const [mobileHamburger, setMobileHamburger] = useState(null); // Initialized later

  // Function to log student activity
  const logStudentActivity = async (activityType, subject = 'N/A') => {
    const user = auth.currentUser;
    if (!user || !userData) return;
    try {
      await addDoc(collection(db, 'student_activities'), {
        name: userData.name || 'Unknown Student',
        studentId: user.uid,
        activity: activityType,
        subject: subject,
        timestamp: new Date(), // Firestore server timestamp is better: serverTimestamp()
      });
    } catch (err) {
      console.error("Error logging student activity:", err);
    }
  };
  
  // Initialize mobileHamburger
  useEffect(() => {
    setMobileHamburger(
      <button className="mobile-hamburger" onClick={() => setSidebarVisible(true)}>
        <i className="fas fa-bars"></i>
      </button>
    );
  }, []);


  const assignmentsBySubject = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
        if(assignment.staffName) { // Only include assignments posted by staff
            const subject = assignment.subject || 'Uncategorized';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(assignment);
        }
        return acc;
    }, {});
  }, [assignments]);

  const tasksBySubject = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const subject = task.subject || 'Uncategorized';
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(task);
      return acc;
    }, {});
  }, [tasks]);

  useEffect(() => {
    const handleResize = () => setIsChatbotOpen(window.innerWidth > 768 && activeContainer !== 'chatbot-container' && !inQuiz);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeContainer, inQuiz]);

  // Format milliseconds to a readable string
  const formatTimeSpent = (ms) => {
    if (ms <= 0) return '0 minutes';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let readableTime = '';
    if (hours > 0) readableTime += `${hours} hour${hours > 1 ? 's' : ''} `;
    if (minutes > 0 || hours === 0) readableTime += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return readableTime.trim() || 'Less than a minute';
  };
  
  // Function to update total time spent in Firestore
  const updateTotalTimeSpentInFirestore = useCallback(async (timeToAddMs) => {
    const user = auth.currentUser;
    if (!user || timeToAddMs <= 0) return;
    try {
      const userRef = doc(db, 'students', user.uid);
      const currentTotalMs = totalTimeSpentInMs || 0;
      const newTotalMs = currentTotalMs + timeToAddMs;
      await updateDoc(userRef, { totalTimeSpentInMs: newTotalMs });
      setTotalTimeSpentInMs(newTotalMs); // Update local state
    } catch (err) {
      console.error("Error updating total time spent in Firestore:", err);
    }
  }, [totalTimeSpentInMs]);

  // Effect for periodic time update
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const currentTime = new Date();
        const sessionDurationMs = currentTime - sessionStartTimeRef.current;
        updateTotalTimeSpentInFirestore(sessionDurationMs);
        sessionStartTimeRef.current = currentTime; // Reset session start time for the next interval
      }
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [updateTotalTimeSpentInFirestore]);


  useEffect(() => {
    const checkAuthAndFetchData = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/student-login');
            return;
        }
        sessionStartTimeRef.current = new Date(); // Start session timer
        loginTimeRef.current = new Date(); 

      try {
        const docRef = doc(db, 'students', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          if (!docSnap.data().formFilled) {
            navigate('/student-form');
            return;
          }
          const fetchedUserData = {
            ...docSnap.data(),
            photoURL: docSnap.data().photoURL || '/default-student.png',
          };
          setUserData(fetchedUserData);
          setProgress(fetchedUserData.progress || 0);
          setQuizCount(fetchedUserData.quizCount || 0);
          setTotalTimeSpentInMs(fetchedUserData.totalTimeSpentInMs || 0); // Fetch total time spent

          logStudentActivity("login");


            const lastLogin = fetchedUserData.lastLogin ? new Date(fetchedUserData.lastLogin) : null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
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
                   await updateLeaderboard(user.uid, fetchedUserData.name, currentStreak, fetchedUserData.progress || 0);
                }
            }
        } else {
          navigate('/student-login');
          return;
        }

        const tasksRef = doc(db, 'tasks', 'shared');
        const tasksSnap = await getDoc(tasksRef);
        if (tasksSnap.exists()) setTasks(tasksSnap.data().tasks || []);
        
        try {
            const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
            const goalsSnap = await getDoc(goalsRef);
            if (goalsSnap.exists()) setGoals(goalsSnap.data().goals || []);
        } catch (goalError) {
             console.warn("Could not fetch goals, check Firestore rules:", goalError);
        }

        const studentsRef = collection(db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = studentsSnap.docs.map((sDoc) => ({ // Renamed doc to sDoc
          id: sDoc.id,
          name: sDoc.data().name || 'Unknown',
          streak: sDoc.data().streak || 0,
          progress: sDoc.data().progress || 0,
        }));
        setLeaderboard(students);

        const unsubscribeAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
          try {
            setAssignmentsLoading(true);
            const fetchedAssignments = snapshot.docs.map((aDoc) => ({ // Renamed doc to aDoc
              id: aDoc.id,
              ...aDoc.data(),
            }));
            setAssignments(fetchedAssignments);
            const staffAssignments = fetchedAssignments
                .filter(a => a.staffName) 
                .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0)); // Use postedAt for sorting
             setTopAssignments(staffAssignments.slice(0, 2));
            setAssignmentsLoading(false);
          } catch (err) {
            console.error('Error fetching assignments:', err);
            setAssignmentsError('Failed to load assignments.');
            setAssignmentsLoading(false);
          }
        }, (err) => {
             console.error('Error in assignments snapshot:', err);
             setAssignmentsError(`Failed to load assignments: ${err.message}`);
             setAssignmentsLoading(false);
        });

        const circularsRef = collection(db, 'circulars');
        const circularsSnap = await getDocs(circularsRef);
        setCirculars(circularsSnap.docs.map((cDoc) => ({ id: cDoc.id, ...cDoc.data() }))); // Renamed doc to cDoc


        // calculateSelfAnalysis will be called in its own useEffect dependent on totalTimeSpentInMs
        return () => {
            unsubscribeAssignments();
            // Save remaining session time on unmount
            if (sessionStartTimeRef.current) {
                const sessionDurationMs = new Date() - sessionStartTimeRef.current;
                updateTotalTimeSpentInFirestore(sessionDurationMs);
            }
        };
      } catch (err) {
        console.error('Error in checkAuthAndFetchData:', err);
        setError(`Failed to load dashboard: ${err.message}`);
      }
    };
    checkAuthAndFetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]); 


    // Streak Timer Effect - separate from main data fetch
    useEffect(() => {
        if (pendingStreakUpdate && loginTimeRef.current && userData) {
            const timer = setTimeout(async () => {
                const user = auth.currentUser;
                if (user && pendingStreakUpdate) { 
                    const userRef = doc(db, 'students', user.uid);
                    await updateDoc(userRef, {
                        streak: newStreakValue,
                        lastLogin: new Date().toISOString(), 
                    });
                    setStreak(newStreakValue);
                    await updateLeaderboard(user.uid, userData.name, newStreakValue, progress);
                    setPendingStreakUpdate(false);
                }
            }, 300000); // 5 minutes

            return () => clearTimeout(timer);
        }
  }, [pendingStreakUpdate, newStreakValue, userData, progress]);


    useEffect(() => {
    const staffRef = collection(db, 'staff');
    const unsubscribe = onSnapshot(
      staffRef,
      (snapshot) => {
        try {
          const staffData = snapshot.docs.map((sDoc) => ({ // Renamed doc to sDoc
            id: sDoc.id,
            ...sDoc.data(),
            photoURL: sDoc.data().photoURL || '/default-staff.png',
          }));
          setStaffList(staffData);
        } catch (err) {
          console.error('Error fetching staff list:', err);
          setError('Failed to load staff list.'); // Consider a more specific error state
        }
      },
      (err) => {
        console.error('Error in staff snapshot:', err);
        setError('Failed to load staff list.');
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedStaffId) {
        setMessages([]); // Clear messages when no staff is selected
        return;
    }
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatId = `${selectedStaffId}_${userId}`; // Staff ID first, then student ID
    const messagesRef = doc(db, 'messages', chatId);

    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const currentMessages = docSnap.data().messages || [];
          setMessages(currentMessages);
          // Mark messages from staff as read
          const updatedMessages = currentMessages.map(msg => 
            msg.sender === 'staff' && !msg.read ? { ...msg, read: true } : msg
          );
          if (updatedMessages.some((msg, i) => msg.read !== currentMessages[i].read)) {
            await setDoc(messagesRef, { messages: updatedMessages }, { merge: true });
          }
        } else {
          setMessages([]);
        }
      },
      (err) => {
        console.error('Error in message snapshot:', err);
        setError('Failed to load messages.');
      }
    );
    return () => unsubscribe();
  }, [selectedStaffId]);


  const updateLeaderboard = async (uid, name, currentStreak, currentProgress) => { // Renamed variables
    try {
      const leaderboardRef = doc(db, 'leaderboard', 'class'); // Assuming one class leaderboard
      await runTransaction(db, async (transaction) => {
        const leaderboardSnap = await transaction.get(leaderboardRef);
        let students = leaderboardSnap.exists() ? leaderboardSnap.data().students || [] : [];
        const studentIndex = students.findIndex((s) => s.id === uid);
        if (studentIndex !== -1) {
          students[studentIndex] = { id: uid, name, streak: currentStreak, progress: currentProgress };
        } else {
          students.push({ id: uid, name, streak: currentStreak, progress: currentProgress });
        }
        transaction.set(leaderboardRef, { students });
      });
       setLeaderboard(prev => { // Optimistic update for local state
           const newLeaderboard = [...prev];
           const studentIndex = newLeaderboard.findIndex(s => s.id === uid);
            if (studentIndex !== -1) {
                newLeaderboard[studentIndex] = { id: uid, name, streak: currentStreak, progress: currentProgress };
            } else {
                newLeaderboard.push({ id: uid, name, streak: currentStreak, progress: currentProgress });
            }
           return newLeaderboard.sort((a,b) => (b.progress || 0) - (a.progress || 0) || (b.streak || 0) - (a.streak || 0));
       });
    } catch (err) {
      console.error('Error updating leaderboard:', err);
      // setError('Failed to update leaderboard.'); // Avoid too many error popups
    }
  };

    const calculateSelfAnalysis = useCallback(() => {
        const user = auth.currentUser;
        if (!user || !userData) return; // Ensure userData is available

        const completedTasks = tasks.filter((t) => t.completedBy?.includes(user.uid)).length;
        const totalTasks = tasks.length;
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const learningRate = Math.min(progress + taskCompletionRate / 5, 100);
        const communicationSkill = Math.min(messages.filter((m) => m.sender === 'student').length * 5, 100);
        const goalCompletionRate = goals.length > 0 ? (goals.filter((g) => g.completed).length / goals.length) * 100 : 0;
        const quizEngagement = Math.min(quizCount * 10, 100); 

        let suggestions = [];
        if (learningRate < 60) suggestions.push("Focus on tasks & quizzes to boost learning.");
        if (communicationSkill < 50) suggestions.push("Interact more with staff.");
        if (goalCompletionRate < 70 && goals.length > 0) suggestions.push("Set & track goals for progress.");
        if (quizEngagement < 50) suggestions.push("Take more quizzes to test understanding.");
        if (suggestions.length === 0) suggestions.push("You're doing great! Keep it up.");

        setSelfAnalysis({
            learningRate,
            communicationSkill,
            goalCompletionRate,
            quizEngagement,
            timeSpent: formatTimeSpent(totalTimeSpentInMs), // Use state for totalTimeSpentInMs
            suggestions: suggestions.join(' '),
        });
    }, [progress, tasks, messages, goals, quizCount, userData, totalTimeSpentInMs]); // Added userData and totalTimeSpentInMs

    // Update Self Analysis when dependencies change
    useEffect(() => {
        if(userData) { // Ensure userData is loaded before calculating
            calculateSelfAnalysis();
        }
    }, [calculateSelfAnalysis, userData]); // Add userData here


  const toggleContainer = (containerId) => {
    setActiveContainer(prev => prev === containerId ? null : containerId);
    setIsChatbotOpen(window.innerWidth > 768 && containerId !== 'chatbot-container' && !inQuiz);
  };

  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  const copyTopicAndAskAI = (topic) => {
    setCopiedTopic(topic);
    setIsChatbotOpen(true); // Open chatbot
    setQuizReady(false); // Ensure quiz prompt is not shown unless quiz button is clicked
    setCurrentTopic(topic); // Set topic for chatbot context
    setActiveContainer('chatbot-container'); // Switch to chatbot view
  };

  const startQuizForTopic = (topicContent) => { // Renamed to avoid conflict
      if (!inQuiz) {
        setCurrentTopic(topicContent);
        setQuizReady(true); // Show quiz prompt
        setActiveContainer('tasks-container'); // Stay in tasks or define a quiz container
        logStudentActivity("quiz started", topicContent);
      } else {
        alert('A quiz is already in progress. Please complete it before starting a new one.');
      }
  };


  const generateQuizQuestions = async () => { // Renamed from startQuiz
      const user = auth.currentUser;
      if (!user) return;
    setInQuiz(true);
    setQuizReady(false); // Hide prompt once quiz starts
    // setActiveContainer('tasks-container'); // Or a dedicated quiz view
    const newQuizCount = quizCount + 1;
    setQuizCount(newQuizCount);

    if (!currentTopic) {
      console.error('No topic provided for quiz generation');
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'quiz', message: 'Error: No topic selected.' }]);
      setInQuiz(false);
      return;
    }

    try {
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'quiz', message: `Generating quiz for ${currentTopic}...` }]);
      const userRef = doc(db, 'students', user.uid);
      await updateDoc(userRef, { quizCount: newQuizCount });

      // !!! IMPORTANT: Replace with actual API call if available, or use placeholder logic
      // This is a placeholder. In a real app, you'd call your backend/AI service.
      console.warn("Using placeholder quiz questions. Integrate with a real quiz generation service.");
      const fallbackQuestions = [
        { text: `What is a key concept of ${currentTopic}?`, options: ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'], correctAnswer: 'Opt 1' },
        { text: `How does ${currentTopic} relate to X?`, options: ['Rel 1', 'Rel 2', 'Rel 3', 'Rel 4'], correctAnswer: 'Rel 2' },
        { text: `A common challenge in ${currentTopic} is:`, options: ['Chal 1', 'Chal 2', 'Chal 3', 'Chal 4'], correctAnswer: 'Chal 3' },
      ];
      setQuizQuestions(fallbackQuestions);
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'quiz', message: `Quiz on ${currentTopic} loaded!` }]);

    } catch (err) {
      console.error('Error generating quiz:', err);
      setQuizQuestions([]); // Clear questions on error
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'quiz', message: `Failed to load quiz for ${currentTopic}.` }]);
      setInQuiz(false); // Allow user to try again or select another topic
    }
  };

  const handleQuizComplete = async (score) => {
      const user = auth.currentUser;
      if (!user || !userData) return;
    try {
      setInQuiz(false);
      const percentage = Math.round((score / quizQuestions.length) * 100); // Use quizQuestions.length
      const newProgress = Math.min(progress + percentage / 10, 100); // Adjusted progress increment
      setProgress(newProgress);

      const userRef = doc(db, 'students', user.uid);
      await updateDoc(userRef, { progress: newProgress });

      const tasksRef = doc(db, 'tasks', 'shared'); // Assuming tasks are shared
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) {
        const updatedTasks = (tasksSnap.data().tasks || []).map((task) =>
          task.content === currentTopic && !task.completedBy?.includes(user.uid) // Mark complete only if not already
            ? { ...task, completedBy: [...(task.completedBy || []), user.uid], completed: true }
            : task
        );
        await setDoc(tasksRef, { tasks: updatedTasks });
        setTasks(updatedTasks);
      }

      await updateLeaderboard(user.uid, userData.name, streak, newProgress);
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'quiz', message: `Quiz completed! Score: ${percentage}%` }]);
      logStudentActivity("quiz completed", currentTopic);
      setCurrentTopic(''); // Reset current topic
      setQuizQuestions([]); // Clear questions
      setActiveContainer('tasks-container'); // Or navigate to a results summary
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to update after quiz completion.');
      setActiveContainer('tasks-container');
    }
  };

  const addNewGoal = async () => {
      const user = auth.currentUser;
      if (!user) return;
    try {
      const title = document.getElementById('goal-title')?.value.trim();
      const type = document.getElementById('goal-type')?.value;
      const subject = document.getElementById('goal-subject')?.value.trim();
      const dueDate = document.getElementById('goal-due-date')?.value;
      const description = document.getElementById('goal-description')?.value.trim();
      const priority = document.getElementById('goal-priority')?.value;

      if (!title || !dueDate) {
        alert('Please fill in at least title and due date.');
        return;
      }
      const newGoal = { id: Date.now(), type, title, subject, dueDate, priority, description, completed: false };
      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
      await setDoc(goalsRef, { goals: updatedGoals });
      logStudentActivity("goal added", subject);
      toggleGoalForm(false); // Hide form after adding
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'goal', message: `Goal "${title}" set for ${new Date(dueDate).toLocaleDateString()}` }]);
    } catch (err) {
      console.error('Error adding goal:', err);
      setError('Failed to add goal.');
    }
  };

  const toggleGoalForm = (show) => { // Pass boolean to control visibility
    const form = document.getElementById('add-goal-form');
    const button = document.getElementById('show-add-goal-form');
    if (form && button) {
      form.style.display = show ? 'block' : 'none';
      button.style.display = show ? 'none' : 'flex'; // 'flex' or 'block' depending on original style
    }
  };

  const toggleGoalComplete = async (id) => {
      const user = auth.currentUser;
      if (!user || !userData) return;
    try {
      let completedGoalTitle = '';
      const updatedGoals = goals.map((goal) => {
        if (goal.id === id) {
          completedGoalTitle = goal.title;
          return { ...goal, completed: !goal.completed };
        }
        return goal;
      });
      setGoals(updatedGoals);
      const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
      await setDoc(goalsRef, { goals: updatedGoals });

      const goalJustCompleted = updatedGoals.find((g) => g.id === id)?.completed;
      if (goalJustCompleted) {
        const newProgress = Math.min(progress + 5, 100); // Smaller increment for goal completion
        setProgress(newProgress);
        await updateDoc(doc(db, 'students', user.uid), { progress: newProgress });
        await updateLeaderboard(user.uid, userData.name, streak, newProgress);
        setNotifications((prev) => [...prev, {id: Date.now(), type: 'goal', message: `Goal "${completedGoalTitle}" marked complete!`}]);
      }
      // calculateSelfAnalysis(); // Will be called by its own useEffect
    } catch (err) {
      console.error('Error toggling goal completion:', err);
      setError('Failed to toggle goal completion.');
    }
  };

  const deleteGoal = async (id) => {
      const user = auth.currentUser;
      if (!user) return;
    try {
      if (window.confirm('Are you sure you want to delete this goal?')) {
        const deletedGoalTitle = goals.find(g => g.id === id)?.title || "Selected goal";
        const updatedGoals = goals.filter((goal) => goal.id !== id);
        setGoals(updatedGoals);
        const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
        await setDoc(goalsRef, { goals: updatedGoals });
        setNotifications((prev) => [...prev, {id: Date.now(), type: 'goal', message: `Goal "${deletedGoalTitle}" deleted.`}]);
        // calculateSelfAnalysis(); // Will be called by its own useEffect
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal.');
    }
  };


  const handleFeedbackSubmit = async () => {
       const user = auth.currentUser;
       if (!user || !userData) return;
    try {
      if (!feedbackText.trim()) {
        alert('Please enter feedback before submitting.');
        return;
      }
      // Store feedback in a subcollection for the student
      const feedbackColRef = collection(db, 'students', user.uid, 'feedback');
      await addDoc(feedbackColRef, {
        text: feedbackText,
        studentName: userData.name, // Optional: add student name for easier review
        submittedAt: new Date(),
      });
      logStudentActivity("feedback submitted");
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'feedback', message: 'Feedback submitted successfully!' }]);
      setFeedbackText('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback.');
    }
  };

  const sendOverdueReason = async (task, reason) => {
       const user = auth.currentUser;
       if (!user) return;
    try {
      if (!task.staffId) throw new Error('Staff ID missing for this task.');
      const staffMember = staffList.find((s) => s.id === task.staffId); // Renamed 'staff'
      if (!staffMember) throw new Error('Staff member not found');

      const chatId = `${task.staffId}_${user.uid}`; // Staff ID first
      const messagesRef = doc(db, 'messages', chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists() ? messagesSnap.data().messages || [] : [];
      const newMessage = { text: `Reason for not completing task "${task.content}": ${reason}`, sender: 'student', timestamp: new Date().toISOString(), read: false };
      await setDoc(messagesRef, { messages: [...existingMessages, newMessage] });
      
      setOverdueTaskReasons((prev) => ({ ...prev, [task.id]: reason }));
      setSelectedStaffId(task.staffId);
      setSelectedStaffName(staffMember.name);
      setShowContactList(false);
      setActiveContainer('staff-interaction-container');
      setNotifications((prev) => [...prev, { id: Date.now(), type: 'overdue', message: `Reason for overdue task "${task.content}" sent to ${staffMember.name}.` }]);
    } catch (err) {
      console.error('Error sending overdue reason:', err);
      setError(`Failed to send overdue reason: ${err.message}`);
    }
  };


  const sendMessageToStaff = useCallback( // Renamed from sendMessage
    async () => {
        const user = auth.currentUser;
        if (!user) return;
      try {
        if (!selectedStaffId) {
            alert("Please select a staff member to chat with.");
            return;
        }
        const input = document.getElementById('message-input'); // Ensure this ID is correct and unique
        const text = input?.value.trim();
        if (!text) return;

        const chatId = `${selectedStaffId}_${user.uid}`; // Staff ID first
        const newMessage = { text, sender: 'student', timestamp: new Date().toISOString(), read: false };
        const messagesRef = doc(db, 'messages', chatId);
        const messagesSnap = await getDoc(messagesRef);
        const existingMessages = messagesSnap.exists() ? messagesSnap.data().messages || [] : [];
        await setDoc(messagesRef, { messages: [...existingMessages, newMessage] });
        if(input) input.value = '';
        // calculateSelfAnalysis(); // Will be called by its own useEffect
      } catch (err) {
        console.error('Error sending message:', err);
        setError('Failed to send message.');
      }
    },
    [selectedStaffId] // Removed calculateSelfAnalysis from deps
  );

  const deleteMessageFromStaffChat = useCallback( // Renamed from deleteMessage
    async (indexToDelete) => { // Renamed 'index'
        const user = auth.currentUser;
        if (!user) return;
      try {
        if (!selectedStaffId) return;
        const chatId = `${selectedStaffId}_${user.uid}`; // Staff ID first
        const updatedMessages = messages.filter((_, i) => i !== indexToDelete);
        const messagesRef = doc(db, 'messages', chatId);
        await setDoc(messagesRef, { messages: updatedMessages });
      } catch (err) {
        console.error('Error deleting message:', err);
        setError('Failed to delete message.');
      }
    },
    [selectedStaffId, messages]
  );

  const handleEditProfile = () => navigate('/student-form', { state: { isEdit: true, userData } });

  const handleLogout = async () => {
    if (sessionStartTimeRef.current) {
        const sessionDurationMs = new Date() - sessionStartTimeRef.current;
        await updateTotalTimeSpentInFirestore(sessionDurationMs);
        sessionStartTimeRef.current = null; // Clear session start time
    }
    logStudentActivity("logout");
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to log out.');
    }
  };

  const toggleSubjectExpansion = (subject) => { // Renamed from toggleSubject
    setExpandedSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  if (!userData) { // Show loading screen until userData is fetched
    return <div className="loading-dashboard">Loading Student Dashboard...</div>;
  }

  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <GuideModal isOpen={!localStorage.getItem('hasSeenStudentGuide')} onClose={() => localStorage.setItem('hasSeenStudentGuide', 'true')} role="student" />
        <Sidebar
          userData={userData}
          role="student"
          toggleContainer={toggleContainer}
          isVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
          setMobileHamburger={setMobileHamburger} // Pass setter if Sidebar modifies it
          copiedTopic={copiedTopic}
          clearCopiedTopic={() => setCopiedTopic('')}
        />
        <div className={`main-content ${sidebarVisible ? 'sidebar-active' : ''} ${inQuiz ? 'quiz-active' : ''}`}>
          <div className="header">
            {mobileHamburger}
            <input type="text" className="search-bar" placeholder="What do you want to learn today?" />
          </div>
           {error && <div className="error-message">{error}</div>}
          <div id="main-content-section">
            {!activeContainer && !inQuiz && (
              <div id="default-content" className="default-content">
                <div className="profile-content" onClick={() => toggleContainer('self-analysis-container')}>
                  <h3>Your Profile</h3>
                  <p>Hi {userData?.name || 'Student'}, you have completed <b>{Math.round(progress)}%</b> of weekly targets. Your current streak: <b>{streak}</b> days! 🔥</p>
                </div>
                 <h3>Your Assignments</h3>
                 <div className="assignments-preview scrollable-x">
                    {assignmentsLoading && <p>Loading assignments...</p>}
                    {assignmentsError && <p className="error-message">{assignmentsError}</p>}
                    {!assignmentsLoading && !assignmentsError && topAssignments.length > 0 ? (
                        topAssignments.map(assignment => <AssignmentItem key={assignment.id} assignment={assignment} />)
                    ) : (
                        !assignmentsLoading && !assignmentsError && <p className="empty-message">No new assignments from staff.</p>
                    )}
                 </div>
                <h3>Your Subjects (Tasks)</h3>
                <div className="subjects-grid assignments scrollable-x">
                   {Object.keys(tasksBySubject).length > 0 ? Object.keys(tasksBySubject).map(subject => (
                     <div key={subject} className="assignment-box" style={{ backgroundColor: '#c5cae9' }} onClick={() => { setSelectedSubject(subject); setActiveContainer('tasks-container'); }}>
                       {subject} ({tasksBySubject[subject].length})
                     </div>
                   )) : <p className="empty-message">No tasks assigned yet.</p>}
                </div>
                <Leaderboard students={leaderboard} showStats={false} currentUserId={auth.currentUser?.uid} />
              </div>
            )}
            <div id="tasks-container" className={`toggle-container ${activeContainer === 'tasks-container' ? 'active' : ''}`}>
               <div className="container-header">
                {selectedSubject ? <span>Tasks in {selectedSubject}</span> : 'Posted Tasks'}
                {selectedSubject && <button className="back-btn small" onClick={() => setSelectedSubject(null)}>View All Subjects</button>}
              </div>
              <div className="container-body scrollable">
                {inQuiz && activeContainer === 'tasks-container' ? (
                  <Quiz topic={currentTopic} questions={quizQuestions} handleQuizComplete={handleQuizComplete} />
                ) : selectedSubject ? (
                  <div className="subject-tasks">
                    {(tasksBySubject[selectedSubject] || []).length === 0 ? (
                         <p className="empty-message">No tasks available for {selectedSubject}.</p>
                    ): (
                        tasksBySubject[selectedSubject].map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            role="student"
                            onCopy={copyTopicAndAskAI}
                            onStartQuiz={() => startQuizForTopic(task.content)}
                          />
                        ))
                    )}
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(tasksBySubject).map((subject) => (
                      <div key={subject} className={`subject-card ${expandedSubjects[subject] ? 'active' : ''}`} onClick={() => setSelectedSubject(subject)}>
                        <h3>{subject} ({tasksBySubject[subject].length})</h3>
                      </div>
                    ))}
                    {Object.keys(tasksBySubject).length === 0 && <p className="empty-message">No tasks available.</p>}
                  </div>
                )}
              </div>
            </div>
            <div id="goals-container" className={`toggle-container ${activeContainer === 'goals-container' ? 'active' : ''}`}>
                 <div className="container-header">Your Goals</div>
              <div className="container-body scrollable">
                <button id="show-add-goal-form" className="add-goal-btn" onClick={() => toggleGoalForm(true)}>
                  <i className="fas fa-plus"></i> Add New Goal
                </button>
                <div id="add-goal-form" className="add-goal-form" style={{ display: 'none' }}>
                  <h3>Add New Goal</h3>
                  <input type="text" id="goal-title" placeholder="Goal title" className="goal-input" />
                  <select id="goal-type" className="goal-input">
                    <option value="assignment">Assignment</option> <option value="test">Test</option> <option value="quiz">Quiz</option> <option value="other">Other</option>
                  </select>
                  <input type="text" id="goal-subject" placeholder="Subject" className="goal-input" />
                  <input type="date" id="goal-due-date" className="goal-input" />
                  <textarea id="goal-description" placeholder="Description" className="goal-input"></textarea>
                  <select id="goal-priority" className="goal-input">
                    <option value="low">Low Priority</option> <option value="medium">Medium Priority</option> <option value="high">High Priority</option>
                  </select>
                  <div className="goal-form-buttons">
                    <button onClick={addNewGoal} className="save-goal-btn">Save Goal</button>
                    <button onClick={() => toggleGoalForm(false)} className="cancel-goal-btn">Cancel</button>
                  </div>
                </div>
                <div className="goals-list">
                  {goals.length === 0 ? <p className="empty-message">No goals set yet.</p> : goals.map((goal) => (
                      <GoalItem key={goal.id} goal={goal} onToggleComplete={toggleGoalComplete} onDelete={deleteGoal} />
                  ))}
                </div>
              </div>
            </div>
            <div id="streak-container" className={`toggle-container ${activeContainer === 'streak-container' ? 'active' : ''}`}>
              <div className="container-header">Class Leaderboard</div>
              <div className="container-body scrollable">
                <p>Your Streak: {Math.round(streak)} days</p>
                <p>Your Progress: {Math.round(progress)}%</p>
                <Leaderboard students={leaderboard} showStats={true} currentUserId={auth.currentUser?.uid} />
              </div>
            </div>
            <div id="assignments-container" className={`toggle-container ${activeContainer === 'assignments-container' ? 'active' : ''}`}>
              <div className="container-header">
                {selectedAssignmentSubject ? <span>Assignments in {selectedAssignmentSubject}</span> : 'Posted Assignments (by Staff)'}
                {selectedAssignmentSubject && <button className="back-btn small" onClick={() => setSelectedAssignmentSubject(null)}>View All Subjects</button>}
              </div>
              <div className="container-body scrollable">
                {assignmentsLoading ? <p>Loading assignments...</p> : assignmentsError ? <p className="error-message">{assignmentsError}</p>
                : selectedAssignmentSubject ? (
                  <div className="subject-assignments">
                    {(assignmentsBySubject[selectedAssignmentSubject] || []).length === 0 ? <p className="empty-message">No assignments for {selectedAssignmentSubject}.</p>
                    : assignmentsBySubject[selectedAssignmentSubject].map((assignment) => <AssignmentItem key={assignment.id} assignment={assignment} />)}
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(assignmentsBySubject).length === 0 ? <p className="empty-message">No assignments posted by staff.</p>
                    : Object.keys(assignmentsBySubject).map((subject) => (
                        <div key={subject} className="subject-card" onClick={() => setSelectedAssignmentSubject(subject)}>
                            <h3>{subject}</h3> <p>{assignmentsBySubject[subject].length} Assignment(s)</p>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div id="circular-container" className={`toggle-container ${activeContainer === 'circular-container' ? 'active' : ''}`}>
              <div className="container-header">Important Circulars</div>
              <div className="container-body scrollable">
                {circulars.length === 0 ? <p className="empty-message">No new circulars.</p> : <ul>
                    {circulars.map((circular) => ( <li key={circular.id}> <a href={circular.url} target="_blank" rel="noopener noreferrer">{circular.helptitle || circular.id}</a> <span> {' - Sent by '} <strong>{circular.sender}</strong> </span> </li> ))}
                  </ul>}
              </div>
            </div>
            <div id="staff-interaction-container" className={`toggle-container ${activeContainer === 'staff-interaction-container' ? 'active' : ''}`}>
              <div className="container-header">Staff Interaction</div>
              <div className="container-body"> {/* Ensure this container allows ChatInterface to fill space */}
                <ChatInterface messages={messages} selectedStaffId={selectedStaffId} selectedStaffName={selectedStaffName} staffList={staffList} sendMessage={sendMessageToStaff} deleteMessage={deleteMessageFromStaffChat} showContactList={showContactList} setShowContactList={setShowContactList} setSelectedStaffId={setSelectedStaffId} setSelectedStaffName={setSelectedStaffName} currentUserId={auth.currentUser?.uid} />
              </div>
            </div>
            <div id="self-analysis-container" className={`toggle-container ${activeContainer === 'self-analysis-container' ? 'active' : ''}`}>
              <div className="container-header">Self Analysis 📈</div>
              <div className="container-body scrollable">
                <h3>Your Learning Snapshot</h3>
                <div className="progress-chart">
                  <div className="chart-bar"><label>Learning Rate (Tasks & Progress)</label><div className="bar" style={{ width: `${selfAnalysis.learningRate}%`, backgroundColor: '#4CAF50' }}><span>{Math.round(selfAnalysis.learningRate)}%</span></div></div>
                  <div className="chart-bar"><label>Communication Skill (Chat)</label><div className="bar" style={{ width: `${selfAnalysis.communicationSkill}%`, backgroundColor: '#2196F3' }}><span>{Math.round(selfAnalysis.communicationSkill)}%</span></div></div>
                  <div className="chart-bar"><label>Goal Completion</label><div className="bar" style={{ width: `${selfAnalysis.goalCompletionRate}%`, backgroundColor: '#FF9800' }}><span>{Math.round(selfAnalysis.goalCompletionRate)}%</span></div></div>
                  <div className="chart-bar"><label>Quiz Engagement</label><div className="bar" style={{ width: `${selfAnalysis.quizEngagement}%`, backgroundColor: '#9C27B0' }}><span>{Math.round(selfAnalysis.quizEngagement)}%</span></div></div>
                  <div className="chart-bar"><label>Total Time Spent</label><div className="bar" style={{ width: `100%`, backgroundColor: '#795548', justifyContent: 'center' }}><span>{selfAnalysis.timeSpent}</span></div></div>
                </div>
                <h3>Personalized Learning Tips 💡</h3>
                <p className="suggestions-box">{selfAnalysis.suggestions || "Keep engaging to get personalized tips!"}</p>
                <h3>Feedback 🗣️</h3>
                <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Share your thoughts on your learning experience..." className="goal-input" style={{ height: '100px' }}></textarea>
                <button onClick={handleFeedbackSubmit} className="add-goal-btn">Submit Feedback</button>
              </div>
            </div>
            <div id="settings-container" className={`toggle-container ${activeContainer === 'settings-container' ? 'active' : ''}`}>
               <div className="container-header">Settings</div>
              <div className="container-body">
                <h3>Profile Options</h3>
                <button onClick={handleEditProfile} className="add-goal-btn">Edit Profile</button>
                <button onClick={handleLogout} className="add-goal-btn" style={{ marginTop: '10px' }}>Logout</button>
              </div>
            </div>
            <div id="chatbot-container" className={`toggle-container ${activeContainer === 'chatbot-container' ? 'active' : ''}`}>
               <div className="container-header">EduGen AI Chatbot <button className="back-btn small" onClick={() => setActiveContainer(null)}>Close Chatbot</button></div>
              <div className="container-body"> <Chatbot isVisible={true} copiedTopic={copiedTopic} clearCopiedTopic={() => setCopiedTopic('')} isInContainer={true} isQuizActive={inQuiz} /> </div>
            </div>
            <div id="notes-container" className={`toggle-container ${activeContainer === 'notes-container' ? 'active' : ''}`}>
              <Notes toggleContainer={toggleContainer} logActivity={logStudentActivity} />
            </div>
            {quizReady && !inQuiz && ( // Show prompt only if quiz is ready and not already in quiz
              <div className="quiz-prompt">
                <p>Start a quiz on "{currentTopic}"?</p>
                <button onClick={generateQuizQuestions}>Start Quiz</button> {/* Changed from startQuiz to generateQuizQuestions */}
                <button onClick={() => { setQuizReady(false); setCurrentTopic(''); }}>Cancel</button>
              </div>
            )}
          </div>
          <div className="notifications">
           {notifications.map((notif, index) => (
              notif.type === 'overdue' ? ( <OverdueTaskNotification key={`${notif.id}-${index}`} task={notif.task} onSubmitAndNavigate={sendOverdueReason} onClose={() => setNotifications((prev) => prev.filter((_, i) => i !== index))} /> )
              : ( <Notification key={`${notif.id || 'notif'}-${index}`} message={notif.message} onClose={() => setNotifications((prev) => prev.filter((_, i) => i !== index))} /> )
            ))}
          </div>
          {window.innerWidth > 768 && ( <Chatbot isVisible={isChatbotOpen && !inQuiz} copiedTopic={copiedTopic} clearCopiedTopic={() => setCopiedTopic('')} isInContainer={false} isQuizActive={inQuiz} /> )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;
