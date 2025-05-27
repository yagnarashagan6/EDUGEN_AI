import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { onSnapshot, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import TaskItem from '../components/TaskItem';
import GuideModal from '../components/GuideModal';
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
  const selectStudent = useCallback(
    (student) => {
      setSelectedStudentId(student.id);
      setSelectedStudentName(student.name);
      setShowContactList(false);
    },
    [setSelectedStudentId, setSelectedStudentName, setShowContactList]
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
      {showContactList ? (
        <div className="contact-list full-container">
          <div className="contact-list-header">Students</div>
          <div className="contact-list-body scrollable">
            {studentList.length === 0 ? (
              <p className="empty-message">No students available.</p>
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
            {Object.keys(groupedMessages).length === 0 ? (
              <p className="empty-message">No messages yet. Start the conversation!</p>
            ) : (
              Object.keys(groupedMessages).map((date) => (
                <div key={date}>
                  <div className="date-separator">{formatDate(date)}</div>
                  {groupedMessages[date].map((msg, index) => (
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
                  ))}
                </div>
              ))
            )}
          </div>
          {selectedStudentName && (
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
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [monitorView, setMonitorView] = useState('student-activity');

  // Mock data for student activity (replace with real data if available)
  const studentActivityData = studentStats.map((student) => ({
    id: student.id,
    name: student.name,
    hoursSpent: Math.floor(Math.random() * 10) + 1,
    lastActive: new Date().toLocaleDateString(),
  }));

  // Mock notes data with student names
  const notesData = [
    {
      id: '1',
      studentName: 'John Doe',
      title: 'HRM Lecture',
      subject: 'human_resource',
      timestamp: '2025-05-23T10:32:00Z',
    },
    {
      id: '2',
      studentName: 'Jane Smith',
      title: 'IT Basics',
      subject: 'it',
      timestamp: '2025-05-23T10:33:00Z',
    },
    {
      id: '3',
      studentName: 'Alice Johnson',
      title: 'Crop Science Notes',
      subject: 'agriculture',
      timestamp: '2025-05-23T10:34:00Z',
    },
  ];

  // Validate Google Drive link
  const isValidDriveLink = (url) => {
    return /^https:\/\/(drive\.google\.com|docs\.google\.com)/.test(url);
  };

  // Fetch assignments with real-time updates
  const fetchAssignments = useCallback(() => {
    setAssignmentsLoading(true);
    try {
      const unsubscribe = onSnapshot(collection(db, 'assignments'), (snapshot) => {
        const staffAssignments = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((assignment) => assignment.staffId === auth.currentUser?.uid);
        setAssignments(staffAssignments);
        setAssignmentsLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError('Failed to load assignments.');
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenStaffGuide');
    if (!hasSeenGuide) {
      setShowGuide(true);
      localStorage.setItem('hasSeenStaffGuide', 'true');
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsChatbotOpen(window.innerWidth > 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('No authenticated user found.');
          navigate('/staff-login');
          return;
        }
        const docRef = doc(db, 'staff', user.uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() || !docSnap.data().formFilled) {
          navigate('/staff-form');
          return;
        }
        setUserData(docSnap.data());
        const tasksRef = doc(db, 'tasks', 'shared');
        const tasksSnap = await getDoc(tasksRef);
        setTasks(tasksSnap.exists() ? tasksSnap.data().tasks || [] : []);
        const studentsRef = collection(db, 'students');
        const snapshot = await getDocs(studentsRef);
        const students = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          streak: doc.data().streak || 0,
          progress: doc.data().progress || 0,
          photoURL: doc.data().photoURL || '/default-student.png',
        }));
        setStudentStats(students.sort((a, b) => b.streak - a.streak));
        const totalStudents = students.length;
        const today = new Date();
        const activeStudents = students.filter((student) => {
          const lastLogin = student.lastLogin ? new Date(student.lastLogin) : null;
          return lastLogin && (today - lastLogin) / (1000 * 60 * 60 * 24) <= 7;
        }).length;
        const overallPerformance = students.length
          ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
          : 0;
        setQuickStats({ totalStudents, activeStudents, overallPerformance });
        const resultsData = students.map((student) => ({
          id: student.id,
          name: student.name,
          completedTasks: tasks.filter((task) => task.completedBy?.includes(student.id)).length,
          totalTasks: tasks.length,
        }));
        setResults(resultsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      }
    };

    fetchUserData();
    fetchAssignments();
  }, [navigate, fetchAssignments]);

  useEffect(() => {
    if (!selectedStudentId) return;
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const chatId = `${userId}_${selectedStudentId}`;
    const messagesRef = doc(db, 'messages', chatId);
    const unsubscribe = onSnapshot(
      messagesRef,
      async (docSnap) => {
        try {
          if (docSnap.exists()) {
            const currentMessages = docSnap.data().messages || [];
            setMessages(currentMessages);
            const updatedMessages = currentMessages.map((msg) =>
              msg.sender === 'student' && !msg.read ? { ...msg, read: true } : msg
            );
            if (currentMessages.some((msg, i) => msg.read !== updatedMessages[i].read)) {
              await setDoc(messagesRef, { messages: updatedMessages });
            }
          } else {
            setMessages([]);
          }
        } catch (err) {
          console.error('Error in message snapshot:', err);
          setError('Failed to load messages.');
        }
      },
      (err) => {
        console.error('Error in message snapshot:', err);
        setError('Failed to load messages.');
      }
    );
    return () => unsubscribe();
  }, [selectedStudentId]);

  const filteredStudents = useMemo(() => {
    if (!activeContainer || !filterType) return [];
    const today = new Date();
    switch (filterType) {
      case 'total':
        return studentStats;
      case 'active':
        return studentStats.filter((student) => {
          const lastLogin = student.lastLogin ? new Date(student.lastLogin) : null;
          return lastLogin && (today - lastLogin) / (1000 * 60 * 60 * 24) <= 7;
        });
      case 'performance':
        return studentStats.filter((student) => student.progress >= 50);
      default:
        return [];
    }
  }, [filterType, studentStats, activeContainer]);

  const toggleContainer = useCallback(
    (containerId, filterType = null) => {
      setActiveContainer((prev) => (prev === containerId ? null : containerId));
      setFilterType(filterType);
    },
    []
  );

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const postTask = async () => {
    try {
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
        subject: userData?.subject || 'Uncategorized',
        staffId: auth.currentUser?.uid,
      };
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      const tasksRef = doc(db, 'tasks', 'shared');
      await setDoc(tasksRef, { tasks: updatedTasks });
      document.getElementById('task-content').value = '';
    } catch (err) {
      console.error('Error posting task:', err);
      setError('Failed to post task.');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this topic?')) return;
      const updatedTasks = tasks.filter((task) => task.id !== taskId);
      setTasks(updatedTasks);
      const tasksRef = doc(db, 'tasks', 'shared');
      await setDoc(tasksRef, { tasks: updatedTasks });
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task.');
    }
  };

  const sendMessage = useCallback(async () => {
    try {
      const input = document.getElementById('message-input');
      const text = input?.value.trim();
      if (!text || !selectedStudentId) return;
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      const chatId = `${userId}_${selectedStudentId}`;
      const newMessage = {
        text,
        sender: 'staff',
        timestamp: new Date().toISOString(),
        read: false,
      };
      const messagesRef = doc(db, 'messages', chatId);
      const messagesSnap = await getDoc(messagesRef);
      const existingMessages = messagesSnap.exists()
        ? messagesSnap.data().messages || []
        : [];
      const updatedMessages = [...existingMessages, newMessage];
      await setDoc(messagesRef, { messages: updatedMessages });
      input.value = '';
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    }
  }, [selectedStudentId]);

  const deleteMessage = useCallback(
    async (index) => {
      try {
        if (!selectedStudentId) return;
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const chatId = `${userId}_${selectedStudentId}`;
        const updatedMessages = messages.filter((_, i) => i !== index);
        const messagesRef = doc(db, 'messages', chatId);
        await setDoc(messagesRef, { messages: updatedMessages });
      } catch (err) {
        console.error('Error deleting message:', err);
        setError('Failed to delete message.');
      }
    },
    [selectedStudentId, messages]
  );

  const postAssignment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No authenticated user found.');
        return;
      }
      const staffDoc = await getDoc(doc(db, 'staff', user.uid));
      if (!staffDoc.exists()) {
        setError('You are not authorized to post assignments.');
        return;
      }
      if (!newAssignmentSubject.trim() || !newAssignmentLink.trim()) {
        alert('Please enter both subject and Google Drive link.');
        return;
      }
      if (!isValidDriveLink(newAssignmentLink)) {
        alert('Please enter a valid Google Drive or Docs link.');
        return;
      }
      const newAssignment = {
        subject: newAssignmentSubject.trim(),
        driveLink: newAssignmentLink.trim(),
        staffId: user.uid,
        staffName: staffDoc.data().name || 'Unknown Staff',
        postedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        isPublic: true,
      };
      const assignmentsRef = collection(db, 'assignments');
      await addDoc(assignmentsRef, newAssignment);
      setNewAssignmentSubject('');
      setNewAssignmentLink('');
      alert('Assignment posted successfully!');
    } catch (err) {
      console.error('Error posting assignment:', err);
      setError('Failed to post assignment: ' + err.message);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this assignment?')) return;
      const assignmentRef = doc(db, 'assignments', assignmentId);
      await deleteDoc(assignmentRef);
      alert('Assignment deleted successfully!');
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment: ' + err.message);
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
      setError('Failed to log out.');
    }
  };

  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  if (loading) return <div>Loading Dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
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
      <div className={`main-content ${sidebarVisible ? 'active-container' : ''}`}>
        <div className="header">
          {mobileHamburger}
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
                tasks.map((task) => (
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
              <div className="assignment-form">
                <h3>Post a New Assignment</h3>
                <input
                  type="text"
                  value={newAssignmentSubject}
                  onChange={(e) => setNewAssignmentSubject(e.target.value)}
                  placeholder="Subject Name"
                  className="goal-input"
                />
                <input
                  type="text"
                  value={newAssignmentLink}
                  onChange={(e) => setNewAssignmentLink(e.target.value)}
                  placeholder="Google Drive Link"
                  className="goal-input"
                />
                <button onClick={postAssignment} className="add-goal-btn">
                  Post Assignment
                </button>
              </div>
              {assignmentsLoading ? (
                <p>Loading assignments...</p>
              ) : assignments.length === 0 ? (
                <p className="empty-message">No assignments posted.</p>
              ) : (
                <div className="assignment-list">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="assignment-item">
                      <div className="task-item">
                        <p>{assignment.subject} <small>(Posted on: {assignment.date})</small></p>
                        <button
                          className="copy-topic-btn"
                          onClick={() => window.open(assignment.driveLink, '_blank')}
                          style={{ fontSize: '12px', padding: '6px 10px', lineHeight: '1', whiteSpace: 'nowrap' }}
                        >
                          <i className="fas fa-external-link-alt"></i> Open
                        </button>
                        {assignment.staffId === auth.currentUser?.uid && (
                          <button
                            className="copy-topic-btn"
                            style={{
                              backgroundColor: '#f44336',
                              fontSize: '12px',
                              padding: '6px 10px',
                              lineHeight: '1',
                              whiteSpace: 'nowrap',
                              marginLeft: '10px',
                            }}
                            onClick={() => deleteAssignment(assignment.id)}
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
                  {results.map((result) => (
                    <li key={result.id}>
                      {result.name}: {result.completedTasks}/{result.totalTasks} tasks completed
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div
            id="monitor-container"
            className={`toggle-container ${activeContainer === 'monitor-container' ? 'active' : ''}`}
          >
            <div className="container-header">
              Monitor
              <button
                onClick={() => setActiveContainer(null)}
                className="back-btn small"
                style={{ float: 'right' }}
              >
                Back to Dashboard
              </button>
            </div>
            <div className="container-body scrollable">
              <div className="monitor-controls">
                <button
                  className={`monitor-btn ${monitorView === 'student-activity' ? 'active' : ''}`}
                  onClick={() => setMonitorView('student-activity')}
                >
                  Student Activity
                </button>
                <button
                  className={`monitor-btn ${monitorView === 'notes' ? 'active' : ''}`}
                  onClick={() => setMonitorView('notes')}
                >
                  Notes
                </button>
              </div>
              {monitorView === 'student-activity' && (
                <div className="monitor-content">
                  <h3>Student Activity</h3>
                  {studentActivityData.length === 0 ? (
                    <p className="empty-message">No student activity data available.</p>
                  ) : (
                    <ul className="monitor-list">
                      {studentActivityData.map((student) => (
                        <li key={student.id} className="monitor-item">
                          <span>{student.name}</span>
                          <span>{student.hoursSpent} hours</span>
                          <span>Last Active: {student.lastActive}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {monitorView === 'notes' && (
                <div className="monitor-content">
                  <h3>Posted Notes</h3>
                  {notesData.length === 0 ? (
                    <p className="empty-message">No notes posted by students.</p>
                  ) : (
                    <ul className="monitor-list">
                      {notesData.map((note) => (
                        <li key={note.id} className="monitor-item">
                          <span>{note.studentName}</span>
                          <span>{note.title}</span>
                          <span>{note.subject.replace(/_/g, ' ').toUpperCase()}</span>
                          <span>{new Date(note.timestamp).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
                className="back-btn small"
                style={{ float: 'right' }}
              >
                Back to Dashboard
              </button>
            </div>
            <div className="container-body scrollable">
              {filteredStudents.length === 0 ? (
                <p className="empty-message">No students to display.</p>
              ) : (
                <div className="student-list">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="student-item">
                      <img
                        src={student.photoURL}
                        alt={student.name}
                        className="student-avatar"
                        onError={(e) => (e.target.src = '/default-student.png')}
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
              <button onClick={handleLogout} className="add-goal-btn" style={{ marginTop: '10px' }}>
                Logout
              </button>
            </div>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
      {window.innerWidth <= 768 && (
        <button className="chat-toggle-btn" onClick={toggleChatbot}>
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