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
} from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
// Removed TaskItem to use a simplified version below or assume its usage is fine
// import TaskItem from '../components/TaskItem';
import GoalItem from '../components/GoalItem';
import Quiz from '../components/Quiz';
// Removed Leaderboard to use a modified version below
// import Leaderboard from '../components/Leaderboard';
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
    <small>Deadline: {task.deadline}</small>
  </div>
);


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

  const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date);

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
                    <p className="status">Online</p>
                  </div>
                </>
              )}
            </div>
            <div className="messages-container scrollable">
              {selectedStaffId ? (
                Object.keys(groupedMessages).length === 0 ? (
                  <p className="empty-message">No messages yet. Start the conversation!</p>
                ) : (
                  Object.keys(groupedMessages).map((date) => (
                    <div key={date}>
                      <div className="date-separator">{formatDate(date)}</div>
                      {groupedMessages[date].map((msg, index) => (
                        <div
                          key={`${msg.timestamp}-${index}`}
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
                  id="message-input"
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


// Modified AssignmentItem - No Copy/Quiz, Clickable for View
const AssignmentItem = ({ assignment }) => {
  const openLink = () => {
    if (assignment.driveLink) {
      window.open(assignment.driveLink, '_blank');
    }
  };

  return (
    <div
      className="task-item"
      onClick={openLink}
      style={{ cursor: assignment.driveLink ? 'pointer' : 'default', marginBottom: '10px' }}
    >
      <div className="task-header">
        <h3>{assignment.subject}</h3>
      </div>
      <p>Posted by: {assignment.staffName || 'Unknown'}</p>
      <p>Posted on: {assignment.date}</p>
      {assignment.driveLink && <small>Click to view details</small>}
       {!assignment.driveLink && <small>No link available</small>}
    </div>
  );
};

// New Leaderboard Component (No Images, Sorted)
const Leaderboard = ({ students, showStats = false }) => {
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
          <li key={student.id}>
            <span>{index + 1}. {student.name}</span>
            {showStats ? (
                 <span>Streak: {student.streak} | Progress: {Math.round(student.progress)}%</span>
            ) : (
                 <span>Streak: {student.streak} | Progress: {Math.round(student.progress)}%</span>
            )}
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
        quizEngagement: 0, // Added
        suggestions: '',
    });
  const [error, setError] = useState(null);
  const [quizCount, setQuizCount] = useState(0);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingAssignment, setSendingAssignment] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [copiedTopic, setCopiedTopic] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);
  const [overdueTaskReasons, setOverdueTaskReasons] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null); // Keep for Tasks
  const [selectedAssignmentSubject, setSelectedAssignmentSubject] = useState(null); // New state for Assignments
    const [pendingStreakUpdate, setPendingStreakUpdate] = useState(false);
    const [newStreakValue, setNewStreakValue] = useState(0);
    const loginTimeRef = useRef(null); // To store login time
  const [mobileHamburger, setMobileHamburger] = useState(
    <button className="mobile-hamburger" onClick={() => setSidebarVisible(true)}>
      <i className="fas fa-bars"></i>
    </button>
  );

  const assignmentsBySubject = useMemo(() => {
    return assignments.reduce((acc, assignment) => {
        // Only include assignments posted by staff
        if(assignment.staffName) {
            const subject = assignment.subject || 'Uncategorized';
            if (!acc[subject]) {
                acc[subject] = [];
            }
            acc[subject].push(assignment);
        }
        return acc;
    }, {});
  }, [assignments]);

  const tasksBySubject = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const subject = task.subject || 'Uncategorized';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(task);
      return acc;
    }, {});
  }, [tasks]);

  useEffect(() => {
    const handleResize = () => {
      setIsChatbotOpen(window.innerWidth > 768 && activeContainer !== 'chatbot-container' && !inQuiz);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeContainer, inQuiz]);

  // Streak Timer Effect
    useEffect(() => {
        if (pendingStreakUpdate && loginTimeRef.current && userData) {
            console.log("Streak update pending, starting 5-minute timer.");
            const timer = setTimeout(async () => {
                const user = auth.currentUser;
                if (user && pendingStreakUpdate) { // Check again in case it updated elsewhere
                    console.log("5 minutes passed, updating streak now.");
                    const userRef = doc(db, 'students', user.uid);
                    await updateDoc(userRef, {
                        streak: newStreakValue,
                        lastLogin: new Date().toISOString(), // Update lastLogin only when streak updates
                    });
                    setStreak(newStreakValue);
                    await updateLeaderboard(user.uid, userData.name, newStreakValue, progress);
                    setPendingStreakUpdate(false);
                }
            }, 300000); // 5 minutes

            return () => {
                console.log("Clearing streak timer.");
                clearTimeout(timer);
            }
        }
  }, [pendingStreakUpdate, newStreakValue, userData, progress]); // Ensure all needed deps are here


  useEffect(() => {
    const checkAuthAndFetchData = async () => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/student-login');
            return;
        }

        loginTimeRef.current = new Date(); // Record login time

      try {
        const docRef = doc(db, 'students', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          if (!docSnap.data().formFilled) {
            navigate('/student-form');
            return;
          }
          const userDataValue = { // Use a different name to avoid conflict
            ...docSnap.data(),
            photoURL: docSnap.data().photoURL || '/default-student.png',
          };
          setUserData(userDataValue);
          setProgress(docSnap.data().progress || 0);
          setQuizCount(docSnap.data().quizCount || 0);

           // Streak Logic - Revised
            const lastLogin = docSnap.data().lastLogin ? new Date(docSnap.data().lastLogin) : null;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            let currentStreak = docSnap.data().streak || 0;
            let calculatedStreak = currentStreak;
            let shouldWaitFiveMinutes = false;

            if (!lastLogin) { // First login ever
                calculatedStreak = 1;
                shouldWaitFiveMinutes = true;
            } else if (lastLogin.toDateString() === today.toDateString()) {
                // Already logged in today, keep current streak, don't wait.
                calculatedStreak = currentStreak;
            } else if (lastLogin.toDateString() === yesterday.toDateString()) {
                // Logged in yesterday, increment and wait.
                calculatedStreak = currentStreak + 1;
                shouldWaitFiveMinutes = true;
            } else {
                // Logged in before yesterday, reset to 1 and wait.
                calculatedStreak = 1;
                shouldWaitFiveMinutes = true;
            }

            if (shouldWaitFiveMinutes) {
                setNewStreakValue(calculatedStreak);
                setPendingStreakUpdate(true);
                setStreak(currentStreak); // Show current streak until 5 mins pass
            } else {
                setStreak(currentStreak); // Show current streak
                // If not waiting, but streak needs updating (e.g., initial load), update leaderboard
                if (currentStreak !== (docSnap.data().streak || 0)) {
                   await updateLeaderboard(user.uid, userDataValue.name, currentStreak, docSnap.data().progress || 0);
                }
            }


        } else {
          navigate('/student-login');
          return;
        }

        // ... (rest of the fetching code)
        const tasksRef = doc(db, 'tasks', 'shared');
        const tasksSnap = await getDoc(tasksRef);
        if (tasksSnap.exists()) {
          const fetchedTasks = tasksSnap.data().tasks || [];
          setTasks(fetchedTasks);
        }

        try {
            const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
            const goalsSnap = await getDoc(goalsRef);
            if (goalsSnap.exists()) setGoals(goalsSnap.data().goals || []);
        } catch (goalError) {
             console.warn("Could not fetch goals, check Firestore rules:", goalError);
        }

        const studentsRef = collection(db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = studentsSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || 'Unknown',
          streak: doc.data().streak || 0,
          progress: doc.data().progress || 0, // Need progress for sorting
          // photoURL: doc.data().photoURL || '/default-student.png', // Removed as per request
        }));
        setLeaderboard(students);

        const unsubscribeAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
          try {
            setAssignmentsLoading(true);
            const fetchedAssignments = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setAssignments(fetchedAssignments);

            // Set Top 2 Assignments
             const staffAssignments = fetchedAssignments
                .filter(a => a.staffName) // Only staff assignments
                .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date desc
             setTopAssignments(staffAssignments.slice(0, 2));


            setAssignmentsLoading(false);
          } catch (err) {
            console.error('Error fetching assignments:', err);
            setAssignmentsError('Failed to load assignments.');
            setAssignmentsLoading(false);
          }
        }, (err) => {
             console.error('Error fetching assignments:', err);
             setAssignmentsError(`Failed to load assignments: ${err.message}`);
             setAssignmentsLoading(false);
        });

        const circularsRef = collection(db, 'circulars');
        const circularsSnap = await getDocs(circularsRef);
        setCirculars(circularsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));


        calculateSelfAnalysis(); // Call calculateSelfAnalysis here

        return () => unsubscribeAssignments();
      } catch (err) {
        console.error('Error in checkAuthAndFetchData:', err);
        setError(`Failed to load dashboard: ${err.message}`);
      }
    };
    checkAuthAndFetchData();
  }, [navigate]); // Reduced dependencies


    useEffect(() => {
    const staffRef = collection(db, 'staff');
    const unsubscribe = onSnapshot(
      staffRef,
      (snapshot) => {
        try {
          const staffData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            photoURL: doc.data().photoURL || '/default-staff.png',
          }));
          setStaffList(staffData);
        } catch (err) {
          console.error('Error fetching staff list:', err);
          setError('Failed to load staff list.');
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
    if (!selectedStaffId) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatId = `${selectedStaffId}_${userId}`;
    const messagesRef = doc(db, 'messages', chatId);

    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const currentMessages = docSnap.data().messages || [];
          setMessages(currentMessages);
          // ... (rest of message handling)
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

   // Update Self Analysis when dependencies change
    useEffect(() => {
        calculateSelfAnalysis();
    }, [progress, tasks, messages, goals, quizCount]);


  const updateLeaderboard = async (uid, name, streak, progress) => {
    try {
      const leaderboardRef = doc(db, 'leaderboard', 'class');
      await runTransaction(db, async (transaction) => {
        const leaderboardSnap = await transaction.get(leaderboardRef);
        let students = leaderboardSnap.exists()
          ? leaderboardSnap.data().students || []
          : [];
        const studentIndex = students.findIndex((s) => s.id === uid);
        if (studentIndex !== -1) {
          students[studentIndex] = { id: uid, name, streak, progress };
        } else {
          students.push({ id: uid, name, streak, progress });
        }
        transaction.set(leaderboardRef, { students });
      });
      // Update local leaderboard state as well for immediate reflection
       setLeaderboard(prev => {
           const newLeaderboard = [...prev];
           const studentIndex = newLeaderboard.findIndex(s => s.id === uid);
            if (studentIndex !== -1) {
                newLeaderboard[studentIndex] = { id: uid, name, streak, progress };
            } else {
                newLeaderboard.push({ id: uid, name, streak, progress });
            }
           return newLeaderboard;
       });

    } catch (err) {
      console.error('Error updating leaderboard:', err);
      setError('Failed to update leaderboard.');
    }
  };

    const calculateSelfAnalysis = useCallback(() => {
        const user = auth.currentUser;
        if (!user) return;

        const completedTasks = tasks.filter((t) => t.completedBy?.includes(user.uid)).length;
        const totalTasks = tasks.length;
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        const learningRate = Math.min(progress + taskCompletionRate / 5, 100);
        const communicationSkill = Math.min(messages.filter((m) => m.sender === 'student').length * 5, 100);
        const goalCompletionRate = goals.length > 0 ? (goals.filter((g) => g.completed).length / goals.length) * 100 : 0;
        const quizEngagement = Math.min(quizCount * 10, 100); // Simple measure based on # quizzes

        let suggestions = [];
        if (learningRate < 60) {
            suggestions.push("Focus on completing tasks and engaging with quizzes to boost your learning rate.");
        }
        if (communicationSkill < 50) {
            suggestions.push("Try interacting more with staff. Ask questions and discuss topics to improve communication.");
        }
        if (goalCompletionRate < 70) {
            suggestions.push("Set clear, achievable goals and track their completion. This will significantly boost your progress.");
        }
        if (quizEngagement < 50) {
             suggestions.push("Quizzes are a great way to test your understanding. Try taking more quizzes on different topics.");
        }
        if (suggestions.length === 0) {
            suggestions.push("You're doing great! Keep up the consistent effort. Consider exploring advanced topics or helping peers.");
        }

        setSelfAnalysis({
            learningRate,
            communicationSkill,
            goalCompletionRate,
            quizEngagement,
            suggestions: suggestions.join(' '),
        });
    }, [progress, tasks, messages, goals, quizCount]); // Added quizCount



  const toggleContainer = (containerId) => {
    if (activeContainer === containerId) {
      setActiveContainer(null);
      setIsChatbotOpen(window.innerWidth > 768 && !inQuiz);
    } else {
      setActiveContainer(containerId);
      setIsChatbotOpen(window.innerWidth > 768 && containerId !== 'chatbot-container' && !inQuiz);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const copyTopicAndAskAI = (topic) => {
    setCopiedTopic(topic);
    setIsChatbotOpen(true);
    setQuizReady(true);
    setCurrentTopic(topic);
    setActiveContainer('chatbot-container');
  };

  const startQuiz = async () => {
      const user = auth.currentUser;
      if (!user) return;
    setInQuiz(true);
    setQuizReady(false);
    setActiveContainer('tasks-container');
    const newQuizCount = quizCount + 1;
    setQuizCount(newQuizCount);

    if (!currentTopic) {
      console.error('No topic provided for quiz generation');
      setNotifications((prev) => [
        ...prev,
        { type: 'quiz', message: 'Error: No topic selected. Please try again.' },
      ]);
      setInQuiz(false);
      return;
    }

    try {
      setNotifications((prev) => [
        ...prev,
        { type: 'quiz', message: `Generating quiz for ${currentTopic}...` },
      ]);

      const userRef = doc(db, 'students', user.uid);
      await updateDoc(userRef, { quizCount: newQuizCount });

      const payload = { topic: currentTopic };
      console.log('Sending quiz request with payload:', payload);

      const response = await fetch('http://localhost:5000/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.questions) {
        throw new Error(result.error || 'Failed to fetch quiz');
      }

      setQuizQuestions(result.questions);
      setNotifications((prev) => [
        ...prev,
        { type: 'quiz', message: `Quiz on ${currentTopic} loaded successfully!` },
      ]);
    } catch (err) {
      console.error('Error fetching quiz:', err);
      const fallbackQuestions = [
        {
          text: `What is a fundamental concept of ${currentTopic}?`,
          options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
          correctAnswer: 'Concept A',
        },
        {
          text: `Which area is closely related to ${currentTopic}?`,
          options: ['Area A', 'Area B', 'Area C', 'Area D'],
          correctAnswer: 'Area B',
        },
        {
          text: `What is a common application of ${currentTopic}?`,
          options: ['Application A', 'Application B', 'Application C', 'Application D'],
          correctAnswer: 'Application C',
        },
      ];

      setQuizQuestions(fallbackQuestions);
      setNotifications((prev) => [
        ...prev,
        { type: 'quiz', message: `Failed to load quiz for ${currentTopic}. Using placeholder questions.` },
      ]);
    }
  };

  const handleQuizComplete = async (score) => {
      const user = auth.currentUser;
      if (!user) return;
    try {
      setInQuiz(false);
      const percentage = Math.round((score / 3) * 100);
      const newProgress = Math.min(progress + percentage / 5, 100);
      setProgress(newProgress);

      const userRef = doc(db, 'students', user.uid);
      await updateDoc(userRef, { progress: newProgress });

      const tasksRef = doc(db, 'tasks', 'shared');
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) {
        const updatedTasks = tasksSnap.data().tasks.map((task) =>
          task.content === currentTopic
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
      setNotifications((prev) => [...prev, { type: 'quiz', message: `Quiz completed! Score: ${percentage}%` }]);
      setActiveContainer('tasks-container');
      setCurrentTopic('');
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to complete quiz.');
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
        alert('Please fill in at least title and due date');
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
      const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
      await setDoc(goalsRef, { goals: updatedGoals });
      toggleGoalForm();
      setNotifications((prev) => [...prev, { type: 'goal', message: `Goal "${title}" set for ${dueDate}` }]);
    } catch (err) {
      console.error('Error adding goal:', err);
      setError('Failed to add goal.');
    }
  };

  const toggleGoalForm = () => {
    const form = document.getElementById('add-goal-form');
    const button = document.getElementById('show-add-goal-form');
    if (form && button) {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      button.style.display = form.style.display === 'none' ? 'flex' : 'none';
    }
  };

  const toggleGoalComplete = async (id) => {
      const user = auth.currentUser;
      if (!user) return;
    try {
      const updatedGoals = goals.map((goal) =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      );
      setGoals(updatedGoals);
      const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
      await setDoc(goalsRef, { goals: updatedGoals });
      if (updatedGoals.find((g) => g.id === id).completed) {
        const newProgress = Math.min(progress + 10, 100);
        setProgress(newProgress);
        await updateLeaderboard(user.uid, userData.name, streak, newProgress);
      }
      calculateSelfAnalysis();
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
        const updatedGoals = goals.filter((goal) => goal.id !== id);
        setGoals(updatedGoals);
        const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
        await setDoc(goalsRef, { goals: updatedGoals });
        calculateSelfAnalysis();
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal.');
    }
  };

  const handleFileUpload = async (e) => {
       const user = auth.currentUser;
       if (!user) return;
    try {
      const file = e.target.files[0];
      if (file) {
        // ... (File upload logic remains same, but won't be displayed in main assignments)
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(`Failed to upload assignment: ${err.message}`);
    }
  };


  const handleFeedbackSubmit = async () => {
       const user = auth.currentUser;
       if (!user) return;
    try {
      if (!feedbackText.trim()) {
        alert('Please enter feedback before submitting.');
        return;
      }
      const feedbackRef = doc(db, 'students', user.uid, 'feedback', Date.now().toString());
      await setDoc(feedbackRef, {
        feedback: feedbackText,
        submittedAt: new Date().toISOString(),
      });
      setNotifications((prev) => [...prev, { type: 'feedback', message: 'Feedback submitted successfully!' }]);
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
      if (!task.staffId) {
        throw new Error('Staff ID missing for this task.');
      }

      const staff = staffList.find((s) => s.id === task.staffId);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const chatId = `${task.staffId}_${user.uid}`;
      const messagesRef = doc(db, 'messages', chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists()
        ? messagesSnap.data().messages || []
        : [];

      const newMessage = {
        text: `Reason for not completing task "${task.content}": ${reason}`,
        sender: 'student',
        timestamp: new Date().toISOString(),
        read: false,
      };

      await setDoc(messagesRef, { messages: [...existingMessages, newMessage] });
      setOverdueTaskReasons((prev) => ({ ...prev, [task.id]: reason }));

      setSelectedStaffId(task.staffId);
      setSelectedStaffName(staff.name);
      setShowContactList(false);
      setActiveContainer('staff-interaction-container');

      setNotifications((prev) => [
        ...prev,
        { type: 'overdue', message: `Reason for overdue task "${task.content}" sent to ${staff.name}.` },
      ]);
    } catch (err) {
      console.error('Error sending overdue reason:', err);
      setError(`Failed to send overdue reason: ${err.message}`);
    }
  };


  const sendMessage = useCallback(
    async () => {
        const user = auth.currentUser;
        if (!user) return;
      try {
        if (!selectedStaffId) return;

        const input = document.getElementById('message-input');
        const text = input?.value.trim();
        if (!text) return;

        const chatId = `${selectedStaffId}_${user.uid}`;
        const newMessage = {
          text,
          sender: 'student',
          timestamp: new Date().toISOString(),
          read: false,
        };

        const messagesRef = doc(db, 'messages', chatId);
        const messagesSnap = await getDoc(messagesRef);
        const existingMessages = messagesSnap.exists()
          ? messagesSnap.data().messages || []
          : [];

        await setDoc(messagesRef, { messages: [...existingMessages, newMessage] });
        input.value = '';
        calculateSelfAnalysis();
      } catch (err) {
        console.error('Error sending message:', err);
        setError('Failed to send message.');
      }
    },
    [selectedStaffId, calculateSelfAnalysis]
  );

  const deleteMessage = useCallback(
    async (index) => {
        const user = auth.currentUser;
        if (!user) return;
      try {
        if (!selectedStaffId) return;

        const chatId = `${selectedStaffId}_${user.uid}`;
        const updatedMessages = messages.filter((_, i) => i !== index);
        const messagesRef = doc(db, 'messages', chatId);

        await setDoc(messagesRef, { messages: updatedMessages });
      } catch (err) {
        console.error('Error deleting message:', err);
        setError('Failed to delete message.');
      }
    },
    [selectedStaffId, messages]
  );

  const handleEditProfile = () => {
    navigate('/student-form', { state: { isEdit: true, userData } });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to log out.');
    }
  };

  const toggleSubject = (subject) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject],
    }));
  };


  return (
    <ErrorBoundary>
      <div className="dashboard-container">
        <Sidebar
          userData={userData}
          role="student"
          toggleContainer={toggleContainer}
          isVisible={sidebarVisible}
          toggleSidebar={toggleSidebar}
          setMobileHamburger={setMobileHamburger}
          copiedTopic={copiedTopic}
          clearCopiedTopic={() => setCopiedTopic('')}
        />
        <div className={`main-content ${sidebarVisible ? 'active-container' : ''}${inQuiz ? 'quiz-active' : ''}`}>
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
                  onClick={() => toggleContainer('self-analysis-container')}
                >
                  <h3>Your Profile</h3>
                  <p>
                    Hi {userData?.name || 'Student'}, you have completed{' '}
                    <b>{Math.round(progress)}%</b> of your weekly targets.
                     Your current streak: <b>{streak}</b> days! 🔥
                  </p>
                </div>

                {/* Your Assignments Section */}
                 <h3>Your Assignments</h3>
                 <div className="assignments-preview">
                    {topAssignments.length > 0 ? (
                        topAssignments.map(assignment => (
                           <AssignmentItem key={assignment.id} assignment={assignment} />
                        ))
                    ) : (
                        <p className="empty-message">No new assignments from staff.</p>
                    )}
                 </div>


                <h3>Your Subjects</h3>
                <div className="subjects-grid assignments">
                   {/* ... (subject boxes remain same) ... */}
                   <div className="assignment-box" style={{ backgroundColor: '#c5cae9' }} onClick={() => { setSelectedSubject('Cyber Security'); setActiveContainer('tasks-container'); }}>
                    Cyber Security
                  </div>
                  <div className="assignment-box" style={{ backgroundColor: '#e0f7fa' }} onClick={() => { setSelectedSubject('Embedded System & IOT'); setActiveContainer('tasks-container'); }}>
                    Embedded System & IOT
                  </div>
                  <div className="assignment-box" style={{ backgroundColor: '#dcedc8' }} onClick={() => { setSelectedSubject('Software Testing'); setActiveContainer('tasks-container'); }}>
                    Software Testing
                  </div>
                </div>
                <Leaderboard students={leaderboard} showStats={false} /> {/* Show basic leaderboard */}
              </div>
            )}
            <div
              id="tasks-container"
              className={`toggle-container ${activeContainer === 'tasks-container' ? 'active' : ''}`}
            >
             {/* ... (Task container remains largely same, uses original TaskItem) ... */}
               <div className="container-header">
                {selectedSubject ? (
                  <span>{selectedSubject}</span>
                ) : (
                  'Posted Tasks'
                )}
              </div>
              <div className="container-body">
                {inQuiz && activeContainer === 'tasks-container' ? (
                  <Quiz
                    topic={currentTopic}
                    questions={quizQuestions}
                    handleQuizComplete={handleQuizComplete}
                  />
                ) : selectedSubject ? (
                  <div className="subject-tasks">
                    <h3>Topics in {selectedSubject}</h3>
                    {(tasksBySubject[selectedSubject] || []).length === 0 ? (
                         <p className="empty-message">No tasks available for this subject.</p>
                    ): (
                        tasksBySubject[selectedSubject].map((task) => (
                          <TaskItem // Make sure TaskItem is defined or imported
                            key={task.id}
                            task={task}
                            role="student"
                            onCopy={copyTopicAndAskAI} // Kept for tasks as per original code
                            onStartQuiz={() => {
                              if (!inQuiz) {
                                setCurrentTopic(task.content);
                                setQuizReady(true);
                              } else {
                                alert('A quiz is already in progress. Please complete it before starting a new one.');
                              }
                            }}
                          />
                        ))
                    )}
                     {!inQuiz && (
                      <div className="back-container">
                        <button
                          className="back-btn"
                          onClick={() => setSelectedSubject(null)}
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(tasksBySubject).map((subject) => (
                      <div
                        key={subject}
                        className={`subject-card ${expandedSubjects[subject] ? 'active' : ''}`}
                        onClick={() => setSelectedSubject(subject)}
                      >
                        <h3>{subject}</h3>
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
              className={`toggle-container ${activeContainer === 'goals-container' ? 'active' : ''}`}
            >
              {/* ... (Goals container remains same) ... */}
                 <div className="container-header">Your Goals</div>
              <div className="container-body">
                <button
                  id="show-add-goal-form"
                  className="add-goal-btn"
                  onClick={toggleGoalForm}
                >
                  <i className="fas fa-plus"></i> Add New Goal
                </button>
                <div id="add-goal-form" className="add-goal-form" style={{ display: 'none' }}>
                  <h3>Add New Goal</h3>
                  <input
                    type="text"
                    id="goal-title"
                    placeholder="Goal title"
                    className="goal-input"
                  />
                  <select id="goal-type" className="goal-input">
                    <option value="assignment">Assignment</option>
                    <option value="test">Test</option>
                    <option value="quiz">Quiz</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    id="goal-subject"
                    placeholder="Subject"
                    className="goal-input"
                  />
                  <input type="date" id="goal-due-date" className="goal-input" />
                  <textarea
                    id="goal-description"
                    placeholder="Description"
                    className="goal-input"
                  ></textarea>
                  <select id="goal-priority" className="goal-input">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <div className="goal-form-buttons">
                    <button onClick={addNewGoal} className="save-goal-btn">
                      Save Goal
                    </button>
                    <button onClick={toggleGoalForm} className="cancel-goal-btn">
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="goals-list">
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
            </div>
            <div
              id="streak-container"
              className={`toggle-container ${activeContainer === 'streak-container' ? 'active' : ''}`}
            >
              <div className="container-header">Class Leaderboard</div>
              <div className="container-body">
                <p>Your Streak: {Math.round(streak)} days</p>
                <p>Your Progress: {Math.round(progress)}%</p>
                 {/* Use the new Leaderboard component */}
                <Leaderboard students={leaderboard} showStats={true} />
              </div>
            </div>
             {/* Assignments Container - Modified */}
            <div
              id="assignments-container"
              className={`toggle-container ${activeContainer === 'assignments-container' ? 'active' : ''}`}
            >
              <div className="container-header">
                {selectedAssignmentSubject ? (
                  <span>{selectedAssignmentSubject}</span>
                ) : (
                  'Posted Assignments'
                )}
              </div>
              <div className="container-body">
                {assignmentsLoading ? (
                  <p>Loading assignments...</p>
                ) : assignmentsError ? (
                  <p className="error-message">{assignmentsError}</p>
                ) : selectedAssignmentSubject ? (
                  <div className="subject-assignments">
                    <h3>Assignments in {selectedAssignmentSubject}</h3>
                    {(assignmentsBySubject[selectedAssignmentSubject] || []).length === 0 ? (
                        <p className="empty-message">No assignments available for this subject.</p>
                    ) : (
                       assignmentsBySubject[selectedAssignmentSubject].map((assignment) => (
                          // Use the new AssignmentItem - only shows staff assignments
                          <AssignmentItem
                              key={assignment.id}
                              assignment={assignment}
                          />
                       ))
                    )}
                    <div className="back-container">
                        <button
                          className="back-btn"
                          onClick={() => setSelectedAssignmentSubject(null)}
                        >
                          Back
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="subjects-grid">
                    {Object.keys(assignmentsBySubject).map((subject) => (
                        <div
                            key={subject}
                            className={`subject-card`} // Removed active state for simplicity
                            onClick={() => setSelectedAssignmentSubject(subject)}
                        >
                            <h3>{subject}</h3>
                            <p>{assignmentsBySubject[subject].length} Assignment(s)</p>
                        </div>
                    ))}
                    {Object.keys(assignmentsBySubject).length === 0 && (
                      <p className="empty-message">No assignments available.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              id="circular-container"
              className={`toggle-container ${activeContainer === 'circular-container' ? 'active' : ''}`}
            >
             {/* ... (Circulars container remains same) ... */}
              <div className="container-header">Important Circulars</div>
              <div className="container-body">
                {circulars.length === 0 ? (
                  <p className="empty-message">No new circulars.</p>
                ) : (
                  <ul>
                    {circulars.map((circular) => (
                      <li key={circular.id}>
                        <a href={circular.url} target="_blank" rel="noopener noreferrer">
                          {circular.helptitle || circular.id}
                        </a>
                        <span>
                          {' - Sent by '}
                          <strong>{circular.sender}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div
              id="staff-interaction-container"
              className={`toggle-container ${activeContainer === 'staff-interaction-container' ? 'active' : ''}`}
            >
             {/* ... (Staff Interaction container remains same) ... */}
              <div className="container-header">Staff Interaction</div>
              <div className="container-body">
                <ChatInterface
                  messages={messages}
                  selectedStaffId={selectedStaffId}
                  selectedStaffName={selectedStaffName}
                  staffList={staffList}
                  sendMessage={sendMessage}
                  deleteMessage={deleteMessage}
                  showContactList={showContactList}
                  setShowContactList={setShowContactList}
                  setSelectedStaffId={setSelectedStaffId}
                  setSelectedStaffName={setSelectedStaffName}
                  currentUserId={auth.currentUser?.uid}
                />
              </div>
            </div>
            {/* Self Analysis Container - Improved */}
            <div
              id="self-analysis-container"
              className={`toggle-container ${activeContainer === 'self-analysis-container' ? 'active' : ''}`}
            >
              <div className="container-header">Self Analysis 📈</div>
              <div className="container-body">
                <h3>Your Learning Snapshot</h3>
                <div className="progress-chart">
                  <div className="chart-bar">
                    <label>Learning Rate (Tasks & Progress)</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.learningRate}%`, backgroundColor: '#4CAF50' }}
                    >
                      <span>{Math.round(selfAnalysis.learningRate)}%</span>
                    </div>
                  </div>
                  <div className="chart-bar">
                    <label>Communication Skill (Chat)</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.communicationSkill}%`, backgroundColor: '#2196F3' }}
                    >
                      <span>{Math.round(selfAnalysis.communicationSkill)}%</span>
                    </div>
                  </div>
                  <div className="chart-bar">
                    <label>Goal Completion</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.goalCompletionRate}%`, backgroundColor: '#FF9800' }}
                    >
                       <span>{Math.round(selfAnalysis.goalCompletionRate)}%</span>
                    </div>
                  </div>
                   <div className="chart-bar">
                    <label>Quiz Engagement</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.quizEngagement}%`, backgroundColor: '#9C27B0' }}
                    >
                       <span>{Math.round(selfAnalysis.quizEngagement)}%</span>
                    </div>
                  </div>
                </div>
                <h3>Personalized Learning Tips 💡</h3>
                <p style={{ fontStyle: 'italic', background: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
                    {selfAnalysis.suggestions || "Keep engaging to get personalized tips!"}
                </p>
                <h3>Feedback 🗣️</h3>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts on your learning experience..."
                  className="goal-input"
                  style={{ height: '100px' }}
                ></textarea>
                <button onClick={handleFeedbackSubmit} className="add-goal-btn">
                  Submit Feedback
                </button>
              </div>
            </div>
            <div
              id="settings-container"
              className={`toggle-container ${activeContainer === 'settings-container' ? 'active' : ''}`}
            >
              {/* ... (Settings container remains same) ... */}
               <div className="container-header">Settings</div>
              <div className="container-body">
                <h3>Profile Options</h3>
                <button onClick={handleEditProfile} className="add-goal-btn">
                  Edit Profile
                </button>
                <button onClick={handleLogout} className="add-goal-btn" style={{ marginTop: '10px' }}>
                  Logout
                </button>
              </div>
            </div>
            <div
              id="chatbot-container"
              className={`toggle-container ${activeContainer === 'chatbot-container' ? 'active' : ''}`}
            >
              {/* ... (Chatbot container remains same) ... */}
               <div className="container-header">
                EduGen AI Chatbot
              </div>
              <div className="container-body">
                <Chatbot
                  isVisible={true}
                  copiedTopic={copiedTopic}
                  clearCopiedTopic={() => setCopiedTopic('')}
                  isInContainer={true}
                  isQuizActive={inQuiz}
                />
              </div>
            </div>
            <div
              id="notes-container"
              className={`toggle-container ${activeContainer === 'notes-container' ? 'active' : ''}`}
            >
              <Notes toggleContainer={toggleContainer} studentName={userData?.name || ''} />
            </div>
            {quizReady && (
             // ... (Quiz prompt remains same) ...
              <div className="quiz-prompt">
                <p>Start a quiz on {currentTopic}?</p>
                <button onClick={startQuiz}>Start Quiz</button>
                <button
                  onClick={() => {
                    setQuizReady(false);
                    setCurrentTopic('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="notifications">
           {/* ... (Notifications remain same) ... */}
           {notifications.map((notif, index) => (
              notif.type === 'overdue' ? (
                <OverdueTaskNotification
                  key={`${notif.id}-${index}`} // Ensure key is unique
                  task={notif.task}
                  onSubmitAndNavigate={sendOverdueReason}
                  onClose={() =>
                    setNotifications((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              ) : (
                <Notification
                  key={`${notif.id || 'notif'}-${index}`} // Ensure key is unique
                  message={notif.message}
                  onClose={() =>
                    setNotifications((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              )
            ))}
          </div>
           {error && <div className="error-message">{error}</div>}
          {window.innerWidth > 768 && (
            <Chatbot
              isVisible={isChatbotOpen && !inQuiz}
              copiedTopic={copiedTopic}
              clearCopiedTopic={() => setCopiedTopic('')}
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