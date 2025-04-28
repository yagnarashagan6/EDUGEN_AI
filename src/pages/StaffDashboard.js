import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import TaskItem from '../components/TaskItem';
import '../styles/Dashboard.css';
import '../styles/StaffInteraction.css';
import '../styles/Chat.css';

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
}) => {
  const selectStudent = useCallback((student) => {
    setSelectedStudentId(student.id);
    setSelectedStudentName(student.name);
    setShowContactList(false);
  }, [setSelectedStudentId, setSelectedStudentName, setShowContactList]);

  return (
    <div className="chat-interface">
      {showContactList ? (
        <div className="contact-list full-container">
          <div className="contact-list-header">Students</div>
          <div className="contact-list-body">
            {studentList.length === 0 ? (
              <p className="empty-message">Loading students...</p>
            ) : (
              studentList.map((student) => (
                <div
                  key={student.id}
                  className={`contact-item ${student.id === currentUserId ? 'active' : ''}`}
                  onClick={() => selectStudent(student)}
                >
                  <img
                    src={student.photoURL || '/default-student.png'}
                    alt="Student"
                    className="contact-avatar"
                    onError={(e) => (e.target.src = '/default-student.png')}
                  />
                  <div className="contact-info">
                    <h4>{student.name}</h4>
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
            {messages.length === 0 ? (
              <p className="empty-message">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={`${msg.timestamp}-${index}`}
                  className={`message-bubble ${msg.sender === 'staff' ? 'sent' : 'received'}`}
                  onClick={() => {
                    if (msg.sender === 'staff' && window.confirm('Delete this message?')) {
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
                    {msg.sender === 'staff' && (
                      <span className="message-status">{msg.read ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
        </div>
      )}
    </div>
  );
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [mobileHamburger, setMobileHamburger] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [studentStats, setStudentStats] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const handleResize = () => {
      setIsChatbotOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/staff-login');
        return;
      }

      const docRef = doc(db, 'staff', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setTimeout(() => {
          getDoc(docRef).then((newSnap) => {
            if (newSnap.exists() && newSnap.data().formFilled) {
              setUserData(newSnap.data());
              setLoading(false);
            } else {
              navigate('/staff-form');
            }
          });
        }, 2000);
        return;
      }
      setUserData(docSnap.data());
      
      const tasksRef = doc(db, 'tasks', 'shared');
      const tasksSnap = await getDoc(tasksRef);
      if (tasksSnap.exists()) setTasks(tasksSnap.data().tasks || []);

      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      const students = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        streak: doc.data().streak || 0,
        progress: doc.data().progress || 0,
        photoURL: doc.data().photoURL || "/default-student.png",
      }));
      setStudentStats(students.sort((a, b) => b.streak - a.streak));

      const totalStudents = students.length;
      const today = new Date();
      const activeStudents = students.filter(student => {
        const lastLogin = student.lastLogin ? new Date(student.lastLogin) : null;
        return lastLogin && (today - lastLogin) / (1000 * 60 * 60 * 24) <= 7;
      }).length;
      const overallPerformance = students.length
        ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
        : 0;
      setQuickStats({ totalStudents, activeStudents, overallPerformance });

      const resultsData = students.map(student => ({
        id: student.id,
        name: student.name,
        completedTasks: tasks.filter(task => task.completedBy?.includes(student.id)).length,
        totalTasks: tasks.length,
      }));
      setResults(resultsData);

      const assignmentsRef = collection(db, 'assignments');
      const assignmentsSnap = await getDocs(assignmentsRef);
      const staffAssignments = assignmentsSnap.docs
        .filter(doc => doc.data().staffId === user.uid)
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(staffAssignments);

      setLoading(false);
    };
    fetchUserData().catch((err) => {
      console.error('Error fetching dashboard data:', err);
      navigate('/staff-login');
    });
  }, [navigate]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatId = `${userId}_${selectedStudentId}`;
    const messagesRef = doc(db, "messages", chatId);

    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const currentMessages = docSnap.data().messages || [];
          setMessages(currentMessages);

          const updatedMessages = currentMessages.map((msg) =>
            msg.sender === "student" && !msg.read ? { ...msg, read: true } : msg
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
        console.error("Error in message snapshot:", err);
      }
    );

    return () => unsubscribe();
  }, [selectedStudentId]);

  const toggleContainer = useCallback((containerId, filterType = null) => {
    setActiveContainer((prev) => (prev === containerId ? null : containerId));
    if (filterType) {
      let filtered;
      const today = new Date();
      switch (filterType) {
        case 'total':
          filtered = studentStats;
          break;
        case 'active':
          filtered = studentStats.filter(student => {
            const lastLogin = student.lastLogin ? new Date(student.lastLogin) : null;
            return lastLogin && (today - lastLogin) / (1000 * 60 * 60 * 24) <= 7;
          });
          break;
        case 'performance':
          filtered = studentStats.filter(student => student.progress >= 50);
          break;
        default:
          filtered = [];
      }
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [studentStats]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const postTask = async () => {
    const content = document.getElementById('task-content')?.value.trim();
    if (!content) {
      alert('Please enter a topic.');
      return;
    }
    const newTask = {
      id: Date.now(),
      content,
      date: new Date().toLocaleDateString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
      completedBy: [],
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    const tasksRef = doc(db, 'tasks', 'shared');
    await setDoc(tasksRef, { tasks: updatedTasks });
    document.getElementById('task-content').value = '';
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    const tasksRef = doc(db, 'tasks', 'shared');
    await setDoc(tasksRef, { tasks: updatedTasks });
  };

  const sendMessage = useCallback(async () => {
    const input = document.getElementById("message-input");
    const text = input?.value.trim();
    if (!text || !selectedStudentId) return;

    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const chatId = `${userId}_${selectedStudentId}`;
    const newMessage = {
      text,
      sender: "staff",
      timestamp: new Date().toISOString(),
      read: false,
    };

    const messagesRef = doc(db, "messages", chatId);
    const messagesSnap = await getDoc(messagesRef);
    const existingMessages = messagesSnap.exists()
      ? messagesSnap.data().messages || []
      : [];

    const updatedMessages = [...existingMessages, newMessage];
    await setDoc(messagesRef, { messages: updatedMessages });
    input.value = "";
  }, [selectedStudentId]);

  const deleteMessage = useCallback(
    async (index) => {
      if (!selectedStudentId) return;

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const chatId = `${userId}_${selectedStudentId}`;
      const updatedMessages = messages.filter((_, i) => i !== index);
      const messagesRef = doc(db, "messages", chatId);
      await setDoc(messagesRef, { messages: updatedMessages });
    },
    [selectedStudentId, messages]
  );

  const handleCircularUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const storageRef = ref(storage, `circulars/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const circularRef = doc(db, 'circulars', file.name);
      await setDoc(circularRef, {
        url,
        uploadedAt: new Date().toISOString(),
        sender: userData.name,
      });
      alert('Circular uploaded successfully!');
    }
  };

  const handleEditProfile = () => {
    navigate('/staff-form', { state: { isEdit: true, userData } });
  };

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div className="dashboard-container">
      <Sidebar
        userData={userData}
        role="staff"
        toggleContainer={toggleContainer}
        isVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
        setMobileHamburger={setMobileHamburger}
      />
      <div className={`main-content ${sidebarVisible ? 'active-container' : ''}`}>
        <div className="header">
        {mobileHamburger} {/* Render hamburger button in header */}
          <input
            type="text"
            className="search-bar"
            placeholder="Search students, assignments..."
          />
        </div>
        <div id="main-content-section">
          {!activeContainer && (
            <div id="default-content" className="quick-stats">
              <h2>Quick Stats</h2>
              <div className="stats-container">
                <div
                  className="stat-box"
                  onClick={() => toggleContainer('quick-stats-container', 'total')}
                >
                  <i className="fas fa-users"></i>
                  <h3>Total Students</h3>
                  <p>{quickStats.totalStudents}</p>
                </div>
                <div
                  className="stat-box"
                  onClick={() => toggleContainer('quick-stats-container', 'active')}
                >
                  <i className="fas fa-user-check"></i>
                  <h3>Active Students</h3>
                  <p>{quickStats.activeStudents}</p>
                </div>
                <div
                  className="stat-box"
                  onClick={() => toggleContainer('tasks-container')}
                >
                  <i className="fas fa-tasks"></i>
                  <h3>Tasks</h3>
                  <p>View</p>
                </div>
                <div
                  className="stat-box"
                  onClick={() => toggleContainer('quick-stats-container', 'performance')}
                >
                  <i className="fas fa-chart-line"></i>
                  <h3>Overall Performance</h3>
                  <p>{quickStats.overallPerformance}%</p>
                </div>
              </div>
            </div>
          )}
          <div
            id="tasks-container"
            className={`toggle-container ${activeContainer === 'tasks-container' ? 'active' : ''}`}
          >
            <div className="container-header">Tasks</div>
            <div className="container-body">
              {tasks.length === 0 ? (
                <p className="empty-message">No topics posted yet.</p>
              ) : (
                tasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    role="staff"
                    onDelete={deleteTask}
                  />
                ))
              )}
              <div className="task-form">
                <h3>Post a New Topic</h3>
                <input
                  type="text"
                  id="task-content"
                  placeholder="Enter topic..."
                  className="goal-input"
                />
                <button onClick={postTask} className="add-goal-btn">
                  Post Topic
                </button>
              </div>
            </div>
          </div>
          <div
            id="assignments-container"
            className={`toggle-container ${activeContainer === 'assignments-container' ? 'active' : ''}`}
          >
            <div className="container-header">Assignments</div>
            <div className="container-body">
              {assignments.length === 0 ? (
                <p className="empty-message">No assignments received.</p>
              ) : (
                <ul>
                  {assignments.map(assignment => (
                    <li key={assignment.id}>
                      <a href={assignment.url} target="_blank" rel="noopener noreferrer">
                        {assignment.name} (from {assignment.studentName})
                      </a>
                      <span> - Received on {new Date(assignment.uploadedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div
            id="results-container"
            className={`toggle-container ${activeContainer === 'results-container' ? 'active' : ''}`}
          >
            <div className="container-header">Results</div>
            <div className="container-body">
              {results.length === 0 ? (
                <p className="empty-message">No results available.</p>
              ) : (
                <ul>
                  {results.map(result => (
                    <li key={result.id}>
                      {result.name}: {result.completedTasks}/{result.totalTasks} tasks completed
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div
            id="circular-container"
            className={`toggle-container ${activeContainer === 'circular-container' ? 'active' : ''}`}
          >
            <div className="container-header">Circulars</div>
            <div className="container-body">
              <input
                type="file"
                onChange={handleCircularUpload}
                className="goal-input"
              />
              <button onClick={() => document.querySelector('input[type="file"]').click()} className="add-goal-btn">
                Send Circular
              </button>
              <p className="empty-message">No circulars yet.</p>
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
                sendMessage={sendMessage}
                deleteMessage={deleteMessage}
                showContactList={showContactList}
                setShowContactList={setShowContactList}
                setSelectedStudentId={setSelectedStudentId}
                setSelectedStudentName={setSelectedStudentName}
                currentUserId={auth.currentUser?.uid}
                studentList={studentStats}
                selectedStudentName={selectedStudentName}
              />
            </div>
          </div>
          <div
            id="quick-stats-container"
            className={`toggle-container ${activeContainer === 'quick-stats-container' ? 'active' : ''}`}
          >
            <div className="container-header">
              Student Statistics
              <button
                onClick={() => setActiveContainer(null)}
                className="back-btn"
                style={{
                  float: 'right',
                  backgroundColor: '#fff',
                  color: '#0438af',
                  border: '1px solid #0438af',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                }}
              >
                Back to Dashboard
              </button>
            </div>
            <div className="container-body scrollable">
              {filteredStudents.length === 0 ? (
                <p className="empty-message">No students to display.</p>
              ) : (
                <div className="student-list">
                  {filteredStudents.map(student => (
                    <div key={student.id} className="student-item">
                      <img
                        src={student.photoURL}
                        alt={student.name}
                        className="student-avatar"
                        onError={(e) => { e.target.src = "/default-student.png"; }}
                      />
                      <div className="student-info">
                        <h4>{student.name}</h4>
                        <p>Streak: {student.streak} days</p>
                        <p>Progress: {student.progress}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
      </div>
      {window.innerWidth <= 768 && (
        <button
          className="chat-toggle-btn"
          onClick={toggleChatbot}
        >
          <i className="fas fa-comment"></i>
        </button>
      )}
      <Chatbot
        role="staff"
        isMinimized={window.innerWidth <= 768}
        isVisible={isChatbotOpen}
        toggleChatbot={toggleChatbot}
      />
    </div>
  );
};

export default StaffDashboard;