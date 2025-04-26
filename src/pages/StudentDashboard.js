import React, { useState, useEffect, useCallback, memo } from 'react';
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
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import TaskItem from '../components/TaskItem';
import GoalItem from '../components/GoalItem';
import Quiz from '../components/Quiz';
import Leaderboard from '../components/Leaderboard';
import Notification from '../components/Notification';
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
                messages.length === 0 ? (
                  <p className="empty-message">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg, index) => (
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

const AssignmentSender = ({ staffList, onSend, toggleContainer }) => {
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
  const [chatbotInput, setChatbotInput] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [showContactList, setShowContactList] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingAssignment, setSendingAssignment] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [copiedTopic, setCopiedTopic] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      setIsChatbotOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        if (tasksSnap.exists()) setTasks(tasksSnap.data().tasks || []);

        const goalsRef = doc(db, 'students', user.uid, 'goals', 'list');
        const goalsSnap = await getDoc(goalsRef);
        if (goalsSnap.exists()) setGoals(goalsSnap.data().goals || []);

        // Fetch student data for leaderboard
        const studentsRef = collection(db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = studentsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown',
          streak: doc.data().streak || 0,
          progress: doc.data().progress || 0,
        }));
        setLeaderboard(students);

        const assignmentsRef = collection(db, 'students', user.uid, 'assignments');
        const assignmentsSnap = await getDocs(assignmentsRef);
        setAssignments(assignmentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const circularsRef = collection(db, 'circulars');
        const circularsSnap = await getDocs(circularsRef);
        setCirculars(circularsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const overdueTasks = tasks
          .filter(
            (task) =>
              new Date(task.deadline) < new Date() && !task.completedBy?.includes(user.uid)
          )
          .slice(0, 2);
        const overdueGoals = goals
          .filter((goal) => new Date(goal.dueDate) < new Date() && !goal.completed)
          .slice(0, 2);
        overdueTasks.forEach((task) =>
          setNotifications((prev) => [...prev, `Task "${task.content}" is overdue!`])
        );
        overdueGoals.forEach((goal) =>
          setNotifications((prev) => [...prev, `Goal "${goal.title}" is overdue!`])
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
        } else if (lastLogin.toDateString() !== today.toDateString()) {
          if (lastLogin.toDateString() === yesterday.toDateString()) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
        }

        console.log('Streak calculation:', { lastLogin, today, newStreak });

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
  }, [navigate, progress, quizCount]);

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
      console.log('Updating leaderboard for:', { uid, name, streak, progress });
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
        // Note: Not setting leaderboard state here to avoid overwriting direct fetch
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
    } else {
      setActiveContainer(containerId);
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
  };

  const startQuiz = async () => {
    setInQuiz(true);
    setQuizReady(false);
    const newQuizCount = quizCount + 1;
    setQuizCount(newQuizCount);
    try {
      const userRef = doc(db, 'students', auth.currentUser.uid);
      await updateDoc(userRef, { quizCount: newQuizCount });

      // Generate 3 static sample questions
      const sampleQuestions = [
        {
          text: `What is the primary source of energy for Earth's climate system?`,
          options: ['The Sun', 'Geothermal heat', 'Ocean currents'],
          correctAnswer: 'The Sun',
        },
        {
          text: `Which gas is most abundant in Earth's atmosphere?`,
          options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide'],
          correctAnswer: 'Nitrogen',
        },
        {
          text: `What is the chemical symbol for water?`,
          options: ['H2O', 'CO2', 'O2'],
          correctAnswer: 'H2O',
        },
      ];
      
      setQuizQuestions(sampleQuestions);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz.');
      setInQuiz(false);
    }
  };

  const handleQuizComplete = async (score) => {
    try {
      setInQuiz(false);
      const percentage = Math.round((score / quizQuestions.length) * 100);
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
      setNotifications((prev) => [...prev, `Quiz completed! Score: ${percentage}%`]);
      setActiveContainer('tasks-container');
    } catch (err) {
      console.error('Error completing quiz:', err);
      setError('Failed to complete quiz.');
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
      setNotifications((prev) => [...prev, `Goal "${title}" set for ${dueDate}`]);
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
          `Assignment "${file.name}" uploaded successfully!`,
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
        `Assignment "${assignment.name}" sent to staff!`,
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
          `Assignment "${assignmentId}" deleted successfully!`,
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
      setNotifications((prev) => [...prev, 'Feedback submitted successfully!']);
      setFeedbackText('');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback.');
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

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
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
        />
        <div className={`main-content ${sidebarVisible ? 'active-container' : ''}`}>
          <div className="header">
            <input
              type="text"
              className="search-bar"
              placeholder="What do you want to learn today?"
            />
          </div>
          <div id="main-content-section">
            {!activeContainer && (
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
              <div className="container-header">Posted Tasks</div>
              <div className="container-body">
                {inQuiz ? (
                  <div className="quiz-wrapper" style={{ width: '100%', height: '100%' }}>
                    <Quiz
                      questions={quizQuestions}
                      topic={currentTopic}
                      onComplete={handleQuizComplete}
                      timerDuration={10}
                    />
                  </div>
                ) : (
                  <>
                    {quizReady && (
                      <button onClick={startQuiz} className="quiz-btn">
                        Start Quiz (Attempts: {quizCount})
                      </button>
                    )}
                    {tasks.length === 0 ? (
                      <p className="empty-message">No tasks posted yet.</p>
                    ) : (
                      tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          role="student"
                          onCopy={copyTopicAndAskAI}
                          onStartQuiz={() => {
                            setCurrentTopic(task.content);
                            setQuizReady(true);
                          }}
                        />
                      ))
                    )}
                  </>
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
                          {circular.id}
                        </a>
                        <span>
                          {' - Sent by '}
                          {circular.sender}
                          {' on '}
                          {new Date(circular.uploadedAt).toLocaleDateString()}
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
              </div>
            </div>
          </div>
          <div className="notifications">
            {notifications.map((notif, index) => (
              <Notification
                key={index}
                message={notif}
                onClose={() =>
                  setNotifications((prev) => prev.filter((_, i) => i !== index))
                }
              />
            ))}
          </div>
        </div>
        {window.innerWidth <= 768 && (
          <button className="chat-toggle-btn" onClick={toggleChatbot}>
            <i className="fas fa-comment"></i>
          </button>
        )}
        <Chatbot
          isMinimized={window.innerWidth <= 768}
          isVisible={isChatbotOpen}
          toggleChatbot={toggleChatbot}
          copiedTopic={copiedTopic}
          clearCopiedTopic={() => setCopiedTopic('')}
        />
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;