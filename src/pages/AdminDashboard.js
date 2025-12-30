// AdminDashboard.js - Admin panel to view RAG extracted data and generated content
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseAuth as auth } from '../supabase';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('topics');
  const [topicData, setTopicData] = useState([]);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check if user is authorized admin
  useEffect(() => {
    const checkAuth = () => {
      // Use onAuthStateChanged to wait for auth state to be ready
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log('[Admin] Auth state changed:', user?.email);
        
        if (!user) {
          console.log('[Admin] No user found, redirecting to login');
          navigate('/staff-login');
          return;
        }

        // Check if user is the authorized admin
        if (user.email === 'yaknarashagan2@gmail.com') {
          console.log('[Admin] User authorized, loading data');
          setIsAuthorized(true);
          loadAdminData();
        } else {
          console.log('[Admin] User not authorized:', user.email);
          alert('Access Denied: You are not authorized to view this page.');
          navigate('/staff-dashboard');
        }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    };

    checkAuth();
  }, [navigate]);

  // Load admin data from localStorage
  const loadAdminData = () => {
    setLoading(true);
    try {
      const storedTopicData = localStorage.getItem('admin_topic_data');
      const storedQuizData = localStorage.getItem('admin_quiz_data');

      if (storedTopicData) {
        setTopicData(JSON.parse(storedTopicData));
      }

      if (storedQuizData) {
        setQuizData(JSON.parse(storedQuizData));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear all admin data
  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all admin data? This action cannot be undone.')) {
      localStorage.removeItem('admin_topic_data');
      localStorage.removeItem('admin_quiz_data');
      setTopicData([]);
      setQuizData([]);
      alert('All admin data has been cleared.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/staff-login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Verifying authorization...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo">
            <i className="fas fa-shield-alt"></i>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="admin-actions">
            <button onClick={loadAdminData} className="btn-refresh">
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <button onClick={handleClearData} className="btn-clear">
              <i className="fas fa-trash"></i> Clear Data
            </button>
            <button onClick={handleLogout} className="btn-logout">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          <i className="fas fa-book"></i>
          Topic & Subtopic Data
          <span className="badge">{topicData.length}</span>
        </button>
        <button
          className={`admin-tab ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quizzes')}
        >
          <i className="fas fa-question-circle"></i>
          Quiz Data
          <span className="badge">{quizData.length}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="admin-content">
        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'topics' && (
              <TopicDataView data={topicData} />
            )}
            {activeTab === 'quizzes' && (
              <QuizDataView data={quizData} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Topic Data View Component
const TopicDataView = ({ data }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-inbox"></i>
        <h3>No Topic Data Available</h3>
        <p>Topic and subtopic data will appear here when staff posts tasks.</p>
      </div>
    );
  }

  return (
    <div className="data-view">
      <div className="data-header">
        <h2>
          <i className="fas fa-database"></i>
          RAG Extracted Data - Topics & Subtopics
        </h2>
        <p className="data-description">
          This table shows all RAG extracted data and AI-generated answers for topics posted by staff.
        </p>
        
        {/* AI Models Info */}
        <div className="ai-models-info" style={{
          marginTop: '20px',
          padding: '15px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-robot"></i> RAG Answer Generation
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              Groq: llama-3.3-70b-versatile
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-brain"></i> Embedding Model
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              HuggingFace: all-MiniLM-L6-v2
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-database"></i> Vector Database
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              ChromaDB
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Topic</th>
              <th>Subtopic</th>
              <th>PDF Source</th>
              <th>RAG Chunks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr className="data-row">
                  <td className="date-cell">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="topic-cell">
                    <strong>{item.topic}</strong>
                  </td>
                  <td className="subtopic-cell">
                    {item.subtopic || <span className="no-data">N/A</span>}
                  </td>
                  <td className="source-cell">
                    {item.pdfSource ? (
                      <span className="pdf-badge">
                        <i className="fas fa-file-pdf"></i>
                        {item.pdfSource}
                      </span>
                    ) : (
                      <span className="ai-badge">
                        <i className="fas fa-brain"></i>
                        General AI
                      </span>
                    )}
                  </td>
                  <td className="chunks-cell">
                    <span className="chunk-count">
                      {item.ragChunksFound || 0} chunks
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-view"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <i className={`fas fa-chevron-${expandedId === item.id ? 'up' : 'down'}`}></i>
                      {expandedId === item.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr className="expanded-row">
                    <td colSpan="6">
                      <div className="expanded-content">
                        {/* RAG Extracted Context */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-search"></i>
                            RAG Extracted Context
                          </h4>
                          <div className="context-box">
                            {item.ragContext ? (
                              <pre>{item.ragContext}</pre>
                            ) : (
                              <p className="no-data">No RAG context available</p>
                            )}
                          </div>
                        </div>

                        {/* AI Generated Answer */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-robot"></i>
                            AI Generated Answer
                          </h4>
                          <div className="answer-box">
                            {item.aiAnswer ? (
                              <div dangerouslySetInnerHTML={{ __html: item.aiAnswer.replace(/\n/g, '<br/>') }} />
                            ) : (
                              <p className="no-data">No AI answer generated</p>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-info-circle"></i>
                            Metadata
                          </h4>
                          <div className="metadata-grid">
                            <div className="metadata-item">
                              <span className="label">Staff ID:</span>
                              <span className="value">{item.staffId || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Task ID:</span>
                              <span className="value">{item.taskId || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Difficulty:</span>
                              <span className="value">{item.difficulty || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Question Count:</span>
                              <span className="value">{item.questionCount || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Quiz Data View Component
const QuizDataView = ({ data }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <i className="fas fa-inbox"></i>
        <h3>No Quiz Data Available</h3>
        <p>Quiz data will appear here when quizzes are generated using RAG model.</p>
      </div>
    );
  }

  return (
    <div className="data-view">
      <div className="data-header">
        <h2>
          <i className="fas fa-database"></i>
          RAG Extracted Data - Quizzes
        </h2>
        <p className="data-description">
          This table shows all RAG extracted data and AI-generated quizzes.
        </p>
        
        {/* AI Models Info */}
        <div className="ai-models-info" style={{
          marginTop: '20px',
          padding: '15px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-robot"></i> RAG Quiz Generation
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              Groq: llama-3.3-70b-versatile
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-magic"></i> Pure AI Fallback
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              OpenRouter: gemma-3-27b-it
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '5px' }}>
              <i className="fas fa-brain"></i> Embedding Model
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              HuggingFace: all-MiniLM-L6-v2
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Topic</th>
              <th>Subtopic</th>
              <th>PDF Source</th>
              <th>Questions</th>
              <th>Difficulty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <tr className="data-row">
                  <td className="date-cell">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="topic-cell">
                    <strong>{item.topic}</strong>
                  </td>
                  <td className="subtopic-cell">
                    {item.subtopic || <span className="no-data">N/A</span>}
                  </td>
                  <td className="source-cell">
                    {item.pdfSource ? (
                      <span className="pdf-badge">
                        <i className="fas fa-file-pdf"></i>
                        {item.pdfSource}
                      </span>
                    ) : (
                      <span className="ai-badge">
                        <i className="fas fa-brain"></i>
                        General AI
                      </span>
                    )}
                  </td>
                  <td className="questions-cell">
                    <span className="question-count">
                      {item.questions?.length || 0} questions
                    </span>
                  </td>
                  <td className="difficulty-cell">
                    <span className={`difficulty-badge ${item.difficulty?.toLowerCase()}`}>
                      {item.difficulty || 'N/A'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-view"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <i className={`fas fa-chevron-${expandedId === item.id ? 'up' : 'down'}`}></i>
                      {expandedId === item.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr className="expanded-row">
                    <td colSpan="7">
                      <div className="expanded-content">
                        {/* RAG Extracted Context */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-search"></i>
                            RAG Extracted Context
                          </h4>
                          <div className="context-box">
                            {item.ragContext ? (
                              <pre>{item.ragContext}</pre>
                            ) : (
                              <p className="no-data">No RAG context available</p>
                            )}
                          </div>
                        </div>

                        {/* Generated Questions */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-list-ol"></i>
                            Generated Quiz Questions
                          </h4>
                          <div className="quiz-questions">
                            {item.questions && item.questions.length > 0 ? (
                              item.questions.map((q, qIndex) => (
                                <div key={qIndex} className="question-card">
                                  <div className="question-header">
                                    <span className="question-number">Q{qIndex + 1}</span>
                                    <span className="question-text">{q.text}</span>
                                  </div>
                                  <div className="question-options">
                                    {q.options?.map((option, oIndex) => (
                                      <div
                                        key={oIndex}
                                        className={`option ${option === q.correctAnswer ? 'correct' : ''}`}
                                      >
                                        {option}
                                        {option === q.correctAnswer && (
                                          <i className="fas fa-check-circle"></i>
                                        )}
                                      </div>
                                     ))}
                                  </div>
                                  {q.subtopic && (
                                    <div className="question-subtopic" style={{
                                      marginTop: '8px',
                                      padding: '6px 10px',
                                      background: '#e3f2fd',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      color: '#1565c0',
                                      fontWeight: '500'
                                    }}>
                                      <i className="fas fa-tag" style={{ marginRight: '6px' }}></i>
                                      <strong>Subtopic:</strong> {q.subtopic}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="no-data">No questions generated</p>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="content-section">
                          <h4>
                            <i className="fas fa-info-circle"></i>
                            Metadata
                          </h4>
                          <div className="metadata-grid">
                            <div className="metadata-item">
                              <span className="label">Staff ID:</span>
                              <span className="value">{item.staffId || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Task ID:</span>
                              <span className="value">{item.taskId || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">Cognitive Level:</span>
                              <span className="value">{item.cognitiveLevel || 'N/A'}</span>
                            </div>
                            <div className="metadata-item">
                              <span className="label">RAG Chunks:</span>
                              <span className="value">{item.ragChunksFound || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
