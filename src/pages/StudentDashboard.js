import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
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
import TaskItem from '../components/TaskItem';
import GoalItem from '../components/GoalItem';
import Quiz from '../components/Quiz';
import Leaderboard from '../components/Leaderboard';
import Notification from '../components/Notification';
import OverdueTaskNotification from '../components/OverdueTaskNotification';
import Chatbot from '../components/Chatbot';
import GuideModal from '../components/GuideModal'; 
import '../styles/Dashboard.css';
import '../styles/Sidebar.css';
import '../styles/Chat.css';

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
                      src="/default-staff.png"
                      alt="Staff"
                      className="contact-avatar"
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
                    src="/default-staff.png"
                    alt="Staff"
                    className="recipient-avatar"
                    onLoad={(e) => {
                      const staff = staffList.find((s) => s.id === selectedStaffId);
                      if (staff?.photoURL) {
                        const img = new Image();
                        img.src = staff.photoURL;
                        img.onload = () => (e.target.src = staff.photoURL);
                        img.onerror = () => (e.target.src = '/default-staff.png');
                      }
                    }}
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

const AssignmentSender = ({ staffList, onSend }) => {
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [showStaffList, setShowStaffList] = useState(true);

  const selectStaff = (staff) => {
    setSelectedStaffId(staff.id);
    setShowStaffList(false);
  };

  return (
    <div className="assignment-sender">
      {showStaffList ? (
        <div className="contact-list full-container">
          <div className="contact-list-header">
            <h3>Select Staff</h3>
          </div>
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
                    src="/default-staff.png"
                    alt="Staff"
                    className="contact-avatar"
                    onLoad={(e) => {
                      if (staff.photoURL) {
                        const img = new Image();
                        img.src = staff.photoURL;
                        img.onload = () => (e.target.src = staff.photoURL);
                        img.onerror = () => (e.target.src = '/default-staff.png');
                      }
                    }}
                  />
                  <div className="contact-info">
                    <h4>{staff.name}</h4>
                    <p>Available</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="send-assignment-container">
          <button
            onClick={() => setShowStaffList(true)}
            className="toggle-contact-btn"
          >
            Back to Staff List
          </button>
          <button
            onClick={() => onSend(selectedStaffId)}
            className="send-assignment-btn"
          >
            Send to {staffList.find((s) => s.id === selectedStaffId)?.name}
          </button>
        </div>
      )}
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
  const [selfAnalysis, setSelfAnalysis] = useState({
    learningRate: 0,
    communicationSkill: 0,
    suggestions: '',
    goalCompletionRate: 0,
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
  const [mobileHamburger, setMobileHamburger] = useState(
    <button className="mobile-hamburger" onClick={() => setSidebarVisible(true)}>
      <i className="fas fa-bars"></i>
    </button>
  );

  useEffect(() => {
    const handleResize = () => {
      setIsChatbotOpen(window.innerWidth > 768 && activeContainer !== 'chatbot-container');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeContainer]);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/student-login');
          return;
        }

        const docRef = doc(db, 'students', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          if (!docSnap.data().formFilled) {
            navigate('/student-form');
            return;
          }
          const userData = {
            ...docSnap.data(),
            photoURL: docSnap.data().photoURL || '/default-student.png',
          };
          setUserData(userData);
          setStreak(docSnap.data().streak || 0);
          setProgress(docSnap.data().progress || 0);
          setQuizCount(docSnap.data().quizCount || 0);
        } else {
          navigate('/student-login');
          return;
        }

        const container = document.querySelector('#staff-interaction-container .messages-container');
        if (container) container.scrollTop = container.scrollHeight;

        const tasksRef = doc(db, 'tasks', 'shared');
        const tasksSnap = await getDoc(tasksRef);
        if (tasksSnap.exists()) {
          const fetchedTasks = tasksSnap.data().tasks || [];
          setTasks(fetchedTasks);

          const overdueTasks = fetchedTasks
            .filter((task) => {
              const deadline = new Date(task.deadline);
              const now = new Date();
              const timeDiff = (now - deadline) / (1000 * 60 * 60);
              return (
                timeDiff >= 48 &&
                !task.completedBy?.includes(user.uid) &&
                !overdueTaskReasons[task.id]
              );
            })
            .slice(0, 2);
          overdueTasks.forEach((task) =>
            setNotifications((prev) => [
              ...prev,
              {
                id: task.id,
                type: 'overdue',
                message: `Task "${task.content}" is overdue by 48 hours!`,
                task,
              },
            ])
          );
        }

        const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
        const goalsSnap = await getDoc(goalsRef);
        if (goalsSnap.exists()) setGoals(goalsSnap.data().goals || []);

        const studentsRef = collection(db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = studentsSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || 'Unknown',
          streak: doc.data().streak || 0,
          photoURL: doc.data().photoURL || '/default-student.png',
        }));
        setLeaderboard(students);

        const assignmentsRef = collection(db, 'students', user.uid, 'assignments');
        const assignmentsSnap = await getDocs(assignmentsRef);
        setAssignments(assignmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const circularsRef = collection(db, 'circulars');
        const circularsSnap = await getDocs(circularsRef);
        setCirculars(circularsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const overdueGoals = goals
          .filter((goal) => new Date(goal.dueDate) < new Date() && !goal.completed)
          .slice(0, 2);
        overdueGoals.forEach((goal) =>
          setNotifications((prev) => [...prev, { type: 'goal', message: `Goal "${goal.title}" is overdue!` }])
        );

        const lastLogin = docSnap.data().lastLogin
          ? new Date(docSnap.data().lastLogin)
          : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        let newStreak = docSnap.data().streak || 0;
        if (!lastLogin) {
          newStreak = 1;
        } else if (lastLogin.toDateString() === today.toDateString()) {
          newStreak = newStreak;
        } else if (lastLogin.toDateString() === yesterday.toDateString()) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        if (newStreak !== docSnap.data().streak || !lastLogin) {
          await updateDoc(docRef, {
            streak: newStreak,
            lastLogin: today.toISOString(),
            quizCount,
          });
          setStreak(newStreak);
          await updateLeaderboard(user.uid, docSnap.data().name, newStreak, progress);
        }

        calculateSelfAnalysis();
      } catch (err) {
        console.error('Error in checkAuthAndFetchData:', err);
        setError(`Failed to load dashboard: ${err.message}`);
      }
    };
    checkAuthAndFetchData();
  }, [navigate, progress, quizCount, overdueTaskReasons]);

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

          const updatedMessages = currentMessages.map((msg) =>
            msg.sender === 'staff' && !msg.read ? { ...msg, read: true } : msg
          );

          if (
            currentMessages.some(
              (msg, i) => msg.read !== updatedMessages[i].read
            )
          ) {
            await setDoc(messagesRef, { messages: updatedMessages });
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
    } catch (err) {
      console.error('Error updating leaderboard:', err);
      setError('Failed to update leaderboard.');
    }
  };

  const calculateSelfAnalysis = () => {
    const learningRate = Math.min(
      progress +
        (tasks.length > 0
          ? (tasks.filter((t) => t.completedBy?.includes(auth.currentUser.uid)).length /
              tasks.length) *
            20
          : 0),
      100
    );
    const communicationSkill = Math.min(messages.filter((m) => m.sender === 'student').length * 10, 100);
    const goalCompletionRate = goals.length > 0 ? (goals.filter((g) => g.completed).length / goals.length) * 100 : 0;
    const suggestions =
      learningRate < 50
        ? 'Focus on completing more tasks and engaging with quiz content.'
        : communicationSkill < 50
        ? 'Interact more with staff to improve communication skills.'
        : goalCompletionRate < 50
        ? 'Work on completing your set goals to boost your progress.'
        : 'Great job! Keep maintaining your streak and engagement.';
    setSelfAnalysis({ learningRate, communicationSkill, suggestions, goalCompletionRate });
  };

  const toggleContainer = (containerId) => {
    if (activeContainer === containerId) {
      setActiveContainer(null);
      setIsChatbotOpen(window.innerWidth > 768);
    } else {
      setActiveContainer(containerId);
      setIsChatbotOpen(window.innerWidth > 768 && containerId !== 'chatbot-container');
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

    const userRef = doc(db, 'students', auth.currentUser.uid);
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
    try {
      setInQuiz(false);
      const percentage = Math.round((score / 3) * 100);
      const newProgress = Math.min(progress + percentage / 5, 100);
      setProgress(newProgress);

      const userRef = doc(db, 'students', auth.currentUser.uid);
      await updateDoc(userRef, { progress: newProgress });

      const tasksRef = doc(db, 'tasks', 'shared');
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) {
        const updatedTasks = tasksSnap.data().tasks.map((task) =>
          task.content === currentTopic
            ? {
                ...task,
                completedBy: [...(task.completedBy || []), auth.currentUser.uid],
                completed: true,
              }
            : task
        );
        await setDoc(tasksRef, { tasks: updatedTasks });
        setTasks(updatedTasks);
      }

      await updateLeaderboard(auth.currentUser.uid, userData.name, streak, newProgress);
      setNotifications((prev) => [...prev, { type: 'quiz', message: `Quiz completed! Score: ${percentage}%` }]);
      setActiveContainer('tasks-container');
      setCurrentTopic(''); // Reset topic after quiz completion
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to complete quiz.');
      setActiveContainer('tasks-container');
    }
  };

  const addNewGoal = async () => {
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
      const goalsRef = doc(db, 'students', auth.currentUser.uid, 'goals', 'list');
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
    try {
      const updatedGoals = goals.map((goal) =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      );
      setGoals(updatedGoals);
      const goalsRef = doc(db, 'students', auth.currentUser.uid, 'goals', 'list');
      await setDoc(goalsRef, { goals: updatedGoals });
      if (updatedGoals.find((g) => g.id === id).completed) {
        const newProgress = Math.min(progress + 10, 100);
        setProgress(newProgress);
        await updateLeaderboard(auth.currentUser.uid, userData.name, streak, newProgress);
      }
      calculateSelfAnalysis();
    } catch (err) {
      console.error('Error toggling goal completion:', err);
      setError('Failed to toggle goal completion.');
    }
  };

  const deleteGoal = async (id) => {
    try {
      if (window.confirm('Are you sure you want to delete this goal?')) {
        const updatedGoals = goals.filter((goal) => goal.id !== id);
        setGoals(updatedGoals);
        const goalsRef = doc(db, 'students', auth.currentUser.uid, 'goals', 'list');
        await setDoc(goalsRef, { goals: updatedGoals });
        calculateSelfAnalysis();
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal.');
    }
  };

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (file) {
        const storageRef = ref(storage, `assignments/${auth.currentUser.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        const assignmentRef = doc(
          db,
          'students',
          auth.currentUser.uid,
          'assignments',
          file.name
        );
        await setDoc(assignmentRef, {
          url,
          uploadedAt: new Date().toISOString(),
          name: file.name,
        });
        setAssignments((prev) => [
          ...prev,
          { id: file.name, url, uploadedAt: new Date().toISOString(), name: file.name },
        ]);
        setNotifications((prev) => [
          ...prev,
          { type: 'assignment', message: `Assignment "${file.name}" uploaded successfully!` },
        ]);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload assignment.');
    }
  };

  const sendAssignment = async (assignmentId, staffId) => {
    try {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      const assignmentRef = doc(db, 'assignments', `${auth.currentUser.uid}_${assignmentId}`);
      await setDoc(assignmentRef, {
        url: assignment.url,
        name: assignment.name,
        studentId: auth.currentUser.uid,
        studentName: userData.name,
        staffId,
        uploadedAt: new Date().toISOString(),
      });
      setNotifications((prev) => [
        ...prev,
        { type: 'assignment', message: `Assignment "${assignment.name}" sent to staff!` },
      ]);
      setSendingAssignment(null);
    } catch (err) {
      console.error('Error sending assignment:', err);
      setError('Failed to send assignment.');
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      if (window.confirm('Are you sure you want to delete this assignment?')) {
        const assignmentRef = doc(
          db,
          'students',
          auth.currentUser.uid,
          'assignments',
          assignmentId
        );
        const storageRef = ref(storage, `assignments/${auth.currentUser.uid}/${assignmentId}`);
        await deleteDoc(assignmentRef);
        await deleteObject(storageRef);
        setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
        setNotifications((prev) => [
          ...prev,
          { type: 'assignment', message: `Assignment "${assignmentId}" deleted successfully!` },
        ]);
      }
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment.');
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      if (!feedbackText.trim()) {
        alert('Please enter feedback before submitting.');
        return;
      }
      const feedbackRef = doc(db, 'students', auth.currentUser.uid, 'feedback', Date.now().toString());
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
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !task.staffId) {
        throw new Error('Invalid user ID or staff ID');
      }

      const staff = staffList.find((s) => s.id === task.staffId);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const chatId = `${task.staffId}_${userId}`;
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

  const selectStaff = useCallback(
    async (staff) => {
      if (staff.id === selectedStaffId) return;
      setSelectedStaffId(staff.id);
      setSelectedStaffName(staff.name);
      setShowContactList(false);
    },
    [selectedStaffId]
  );

  const sendMessage = useCallback(
    async () => {
      try {
        if (!selectedStaffId) return;

        const input = document.getElementById('message-input');
        const text = input?.value.trim();
        if (!text) return;

        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const chatId = `${selectedStaffId}_${userId}`;
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
      try {
        if (!selectedStaffId) return;

        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const chatId = `${selectedStaffId}_${userId}`;
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

  const tasksBySubject = tasks.reduce((acc, task) => {
    const subject = task.subject || 'Uncategorized';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(task);
    return acc;
  }, {});

  const [selectedSubject, setSelectedSubject] = useState(null);

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
        <div className={`main-content ${sidebarVisible ? 'active-container' : ''}`}>
          <div className="header">
            {mobileHamburger}
            <input
              type="text"
              className="search-bar"
              placeholder="What do you want to learn today?"
            />
          </div>
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
                  </p>
                </div>
                <h3>Your Subjects</h3>
                <div className="subjects-grid assignments">
                  <div className="assignment-box">Cyber Security</div>
                  <div className="assignment-box">Embedded System & IOT</div>
                  <div className="assignment-box">Software Testing</div>
                </div>
                <h3>Your Assignments</h3>
                <div className="assignments-grid lessons">
                  <div className="lesson-box" style={{ backgroundColor: '#ffd700' }}>
                    Food And Nutrition
                  </div>
                  <div className="lesson-box" style={{ backgroundColor: '#ff6347' }}>
                    Image And Video Analytics
                  </div>
                </div>
                <Leaderboard students={leaderboard} />
              </div>
            )}
            <div
              id="tasks-container"
              className={`toggle-container ${activeContainer === 'tasks-container' ? 'active' : ''}`}
            >
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
                    {tasksBySubject[selectedSubject]?.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        role="student"
                        onCopy={copyTopicAndAskAI}
                        onStartQuiz={() => {
                          if (!inQuiz) {
                            setCurrentTopic(task.content);
                            setQuizReady(true);
                          } else {
                            alert('A quiz is already in progress. Please complete it before starting a new one.');
                          }
                        }}
                      />
                    ))}
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
                  </div>
                )}
                {!inQuiz && selectedSubject && (
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
            </div>
            <div
              id="goals-container"
              className={`toggle-container ${activeContainer === 'goals-container' ? 'active' : ''}`}
            >
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
                <Leaderboard students={leaderboard} showStats={true} />
              </div>
            </div>
            <div
              id="assignments-container"
              className={`toggle-container ${activeContainer === 'assignments-container' ? 'active' : ''}`}
            >
              <div className="container-header">Your Assignments</div>
              <div className="container-body">
                <input type="file" onChange={handleFileUpload} className="goal-input" />
                {sendingAssignment ? (
                  <AssignmentSender
                    staffList={staffList}
                    onSend={(staffId) => sendAssignment(sendingAssignment, staffId)}
                  />
                ) : (
                  <>
                    {assignments.length === 0 ? (
                      <p className="empty-message">No assignments uploaded.</p>
                    ) : (
                      <ul>
                        {assignments.map((assignment) => (
                          <li key={assignment.id}>
                            <a
                              href={assignment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {assignment.name}
                            </a>
                            <span>
                              {' - Uploaded on '}
                              {new Date(assignment.uploadedAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => setSendingAssignment(assignment.id)}
                              className="send-assignment-btn"
                              style={{ marginLeft: '10px' }}
                            >
                              Send
                            </button>
                            <button
                              onClick={() => deleteAssignment(assignment.id)}
                              className="delete-btn"
                              style={{ marginLeft: '10px' }}
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
            <div
              id="circular-container"
              className={`toggle-container ${activeContainer === 'circular-container' ? 'active' : ''}`}
            >
              <div className="container-header">Important Circulars</div>
              <div className="container-body">
                {circulars.length === 0 ? (
                  <p className="empty-message">No new circulars.</p>
                ) : (
                  <ul>
                    {circulars.map((circular) => (
                      <li key={circular.id}>
                        <a href={circular.url} target="_blank" rel="noopener noreferrer">
                          {circular.helptitle}
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
            <div
              id="self-analysis-container"
              className={`toggle-container ${activeContainer === 'self-analysis-container' ? 'active' : ''}`}
            >
              <div className="container-header">Self Analysis</div>
              <div className="container-body">
                <h3>Your Learning Progress</h3>
                <div className="progress-chart">
                  <div className="chart-bar">
                    <label>Learning Rate</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.learningRate}%`, backgroundColor: '#4CAF50' }}
                    ></div>
                    <span>{selfAnalysis.learningRate}%</span>
                  </div>
                  <div className="chart-bar">
                    <label>Communication Skill</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.communicationSkill}%`, backgroundColor: '#2196F3' }}
                    ></div>
                    <span>{selfAnalysis.communicationSkill}%</span>
                  </div>
                  <div className="chart-bar">
                    <label>Goal Completion</label>
                    <div
                      className="bar"
                      style={{ width: `${selfAnalysis.goalCompletionRate}%`, backgroundColor: '#FF9800' }}
                    ></div>
                    <span>{selfAnalysis.goalCompletionRate}%</span>
                  </div>
                </div>
                <h3>Personalized Learning Tips</h3>
                <p>{selfAnalysis.suggestions}</p>
                <h3>Feedback</h3>
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
              <div className="container-header">
                EduGen AI Chatbot
              </div>
              <div className="container-body">
                <Chatbot
                  isVisible={true}
                  copiedTopic={copiedTopic}
                  clearCopiedTopic={() => setCopiedTopic('')}
                  isInContainer={true}
                />
              </div>
            </div>
            {quizReady && (
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
            {notifications.map((notif, index) => (
              notif.type === 'overdue' ? (
                <OverdueTaskNotification
                  key={index}
                  task={notif.task}
                  onSubmitAndNavigate={sendOverdueReason}
                  onClose={() =>
                    setNotifications((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              ) : (
                <Notification
                  key={index}
                  message={notif.message}
                  onClose={() =>
                    setNotifications((prev) => prev.filter((_, i) => i !== index))
                  }
                />
              )
            ))}
          </div>
          {window.innerWidth > 768 && (
            <Chatbot
              isVisible={isChatbotOpen}
              copiedTopic={copiedTopic}
              clearCopiedTopic={() => setCopiedTopic('')}
              isInContainer={false}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;