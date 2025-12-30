// QuizContainer.js - Adaptive Quiz Management Component for Staff Dashboard
import React, { useState, useEffect } from "react";
import "../styles/QuizContainer.css";

const QuizContainer = ({ activeContainer, staffId, supabase }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("manage"); // manage, groups, performance
  
  // Groups State
  const [selectedQuizForGroups, setSelectedQuizForGroups] = useState(null);
  const [studentGroups, setStudentGroups] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Performance State
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  useEffect(() => {
    if (activeContainer === "quiz" && staffId) {
      fetchQuizzes();
    }
  }, [activeContainer, staffId]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:10000/api/quiz/list/${staffId}`);
      const data = await response.json();
      
      if (data.success) {
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to publish this quiz? Students will be able to take it.")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:10000/api/quiz/publish/${quizId}`, {
        method: "POST",
      });

      const data = await response.json();
      
      if (data.success) {
        alert("✅ Quiz published successfully!");
        fetchQuizzes();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error publishing quiz:", error);
      alert("Failed to publish quiz. Please try again.");
    }
  };

  const handleAnalyzePerformance = async (quizId) => {
    try {
      setAnalyzing(true);
      setSelectedQuizForGroups(quizId);
      
      const response = await fetch(`http://localhost:10000/api/quiz/analyze/${quizId}`, {
        method: "POST",
      });

      const data = await response.json();
      
      if (data.success) {
        // Fetch groups
        const groupsResponse = await fetch(`http://localhost:10000/api/quiz/groups/${quizId}`);
        const groupsData = await groupsResponse.json();
        
        if (groupsData.success) {
          setStudentGroups(groupsData.groups);
          setActiveTab("groups");
          alert(`✅ Analyzed ${data.analysis.length} students successfully!`);
        }
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error analyzing performance:", error);
      alert("Failed to analyze performance. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchPerformanceData = async (quizId) => {
    try {
      setLoadingPerformance(true);
      const response = await fetch(`http://localhost:10000/api/quiz/performance-details/${quizId}`);
      const data = await response.json();
      
      if (data.success) {
        setPerformanceData(data.performance);
        setActiveTab("performance");
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
      alert("Failed to fetch performance data. Please try again.");
    } finally {
      setLoadingPerformance(false);
    }
  };

  if (activeContainer !== "quiz") return null;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>📝 Quiz Management</h2>
        <p className="quiz-subtitle">Manage quizzes and analyze student performance</p>
      </div>

      {/* Tab Navigation */}
      <div className="quiz-tabs">
        <button
          className={`quiz-tab ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          📋 Manage Quizzes
        </button>
        <button
          className={`quiz-tab ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          👥 Student Groups
        </button>
        <button
          className={`quiz-tab ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => setActiveTab("performance")}
        >
          📊 Student Performance
        </button>
      </div>

      {/* Manage Quizzes Tab */}
      {activeTab === "manage" && (
        <div className="quiz-tab-content">
          <h3>📋 Your Quizzes</h3>
          
          {loading ? (
            <div className="quiz-loading">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="quiz-empty">
              <p>No quizzes found.</p>
            </div>
          ) : (
            <div className="quizzes-grid">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="quiz-card">
                  <div className="quiz-card-header">
                    <h4>{quiz.title}</h4>
                    <span className={`quiz-status ${quiz.is_published ? "published" : "draft"}`}>
                      {quiz.is_published ? "📢 Published" : "📝 Draft"}
                    </span>
                  </div>
                  
                  <div className="quiz-card-body">
                    <p><strong>Topic:</strong> {quiz.topic}</p>
                    {quiz.subtopic && <p><strong>Subtopic:</strong> {quiz.subtopic}</p>}
                    <p><strong>Difficulty:</strong> {quiz.difficulty}</p>
                    <p><strong>Questions:</strong> {quiz.question_count}</p>
                    <p><strong>Type:</strong> {quiz.quiz_type}</p>
                    {quiz.target_group && (
                      <p><strong>Target Group:</strong> {quiz.target_group}</p>
                    )}
                  </div>
                  
                  <div className="quiz-card-actions">
                    {!quiz.is_published && (
                      <button
                        onClick={() => handlePublishQuiz(quiz.id)}
                        className="quiz-btn quiz-btn-sm quiz-btn-primary"
                      >
                        📢 Publish
                      </button>
                    )}
                    {quiz.is_published && quiz.quiz_type === "baseline" && (
                      <button
                        onClick={() => handleAnalyzePerformance(quiz.id)}
                        disabled={analyzing}
                        className="quiz-btn quiz-btn-sm quiz-btn-info"
                      >
                        {analyzing ? "🔄 Analyzing..." : "📊 Analyze"}
                      </button>
                    )}
                    {quiz.is_published && (
                      <button
                        onClick={() => fetchPerformanceData(quiz.id)}
                        disabled={loadingPerformance}
                        className="quiz-btn quiz-btn-sm quiz-btn-success"
                      >
                        {loadingPerformance ? "⏳ Loading..." : "📈 View Performance"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student Groups Tab */}
      {activeTab === "groups" && (
        <div className="quiz-tab-content">
          <h3>👥 Student Groups</h3>
          
          {!studentGroups ? (
            <div className="quiz-empty">
              <p>Select a quiz from "Manage Quizzes" and click "Analyze" to see student groups.</p>
            </div>
          ) : (
            <div className="groups-container">
              <div className="group-section">
                <h4 className="group-title strength">💪 Strength Group ({studentGroups.strength?.length || 0})</h4>
                <div className="students-list">
                  {studentGroups.strength?.map((student) => (
                    <div key={student.id} className="student-card strength">
                      <div className="student-info">
                        <span className="student-name">{student.student_name}</span>
                        <span className="student-score">{student.performance_score.toFixed(1)}%</span>
                      </div>
                      <div className="student-format">Format: {student.answer_format}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group-section">
                <h4 className="group-title average">📊 Average Group ({studentGroups.average?.length || 0})</h4>
                <div className="students-list">
                  {studentGroups.average?.map((student) => (
                    <div key={student.id} className="student-card average">
                      <div className="student-info">
                        <span className="student-name">{student.student_name}</span>
                        <span className="student-score">{student.performance_score.toFixed(1)}%</span>
                      </div>
                      <div className="student-format">Format: {student.answer_format}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group-section">
                <h4 className="group-title weakness">📉 Weakness Group ({studentGroups.weakness?.length || 0})</h4>
                <div className="students-list">
                  {studentGroups.weakness?.map((student) => (
                    <div key={student.id} className="student-card weakness">
                      <div className="student-info">
                        <span className="student-name">{student.student_name}</span>
                        <span className="student-score">{student.performance_score.toFixed(1)}%</span>
                      </div>
                      <div className="student-format">Format: {student.answer_format}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Performance Tab */}
      {activeTab === "performance" && (
        <div className="quiz-tab-content">
          <h3>📊 Student Performance Analytics</h3>
          
          {loadingPerformance ? (
            <div className="quiz-loading">Loading performance data...</div>
          ) : performanceData.length === 0 ? (
            <div className="quiz-empty">
              <p>No performance data available. Select a quiz and click "View Performance" to see student analytics.</p>
            </div>
          ) : (
            <div className="performance-table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Strengths</th>
                    <th>Weaknesses</th>
                    <th>Subtopic Averages</th>
                    <th>Answer Format</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((student, index) => (
                    <tr key={index}>
                      <td>{student.student_name}</td>
                      <td>{student.score}/{student.total_questions}</td>
                      <td>
                        <span className={`percentage-badge ${
                          student.percentage >= 80 ? 'high' : 
                          student.percentage >= 50 ? 'medium' : 'low'
                        }`}>
                          {student.percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        {student.strengths && student.strengths.length > 0 ? (
                          <div className="subtopic-tags">
                            {student.strengths.map((subtopic, i) => (
                              <span key={i} className="subtopic-tag strength">{subtopic}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-data">None</span>
                        )}
                      </td>
                      <td>
                        {student.weaknesses && student.weaknesses.length > 0 ? (
                          <div className="subtopic-tags">
                            {student.weaknesses.map((subtopic, i) => (
                              <span key={i} className="subtopic-tag weakness">{subtopic}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-data">None</span>
                        )}
                      </td>
                      <td>
                        {student.subtopic_scores && Object.keys(student.subtopic_scores).length > 0 ? (
                          <div className="subtopic-scores">
                            {Object.entries(student.subtopic_scores).map(([subtopic, score], i) => (
                              <div key={i} className="subtopic-score-item">
                                <span className="subtopic-name">{subtopic}:</span>
                                <span className={`score-value ${
                                  score >= 80 ? 'high' : 
                                  score >= 50 ? 'medium' : 'low'
                                }`}>{score.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="no-data">N/A</span>
                        )}
                      </td>
                      <td><span className="answer-format">{student.answer_format}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizContainer;
