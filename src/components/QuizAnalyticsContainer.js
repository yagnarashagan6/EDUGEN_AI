// QuizAnalyticsContainer.js - Display student quiz performance analytics for staff
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "../styles/QuizAnalytics.css";

const QuizAnalyticsContainer = ({ activeContainer, studentStats }) => {
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailedView, setDetailedView] = useState(null);
  const [filterTopic, setFilterTopic] = useState("all");
  const [availableTopics, setAvailableTopics] = useState([]);

  useEffect(() => {
    if (activeContainer === "quiz-analytics") {
      fetchQuizPerformance();
    }
  }, [activeContainer]);

  const fetchQuizPerformance = async () => {
    setLoading(true);
    try {
      // Fetch all student performance records
      const { data: performances, error } = await supabase
        .from("student_performance")
        .select(`
          *,
          students!inner(name, email)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Group by student
      const groupedData = {};
      const topicsSet = new Set();

      performances.forEach((perf) => {
        const studentId = perf.student_id;
        const studentName = perf.students?.name || "Unknown Student";
        const studentEmail = perf.students?.email || "";

        if (!groupedData[studentId]) {
          groupedData[studentId] = {
            studentId,
            studentName,
            studentEmail,
            quizzes: [],
            totalQuizzes: 0,
            averageScore: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            strengths: [],
            weaknesses: [],
            topics: new Set(),
          };
        }

        groupedData[studentId].quizzes.push(perf);
        groupedData[studentId].totalQuizzes++;
        groupedData[studentId].totalCorrect += perf.score || 0;
        groupedData[studentId].totalQuestions += perf.total_questions || 0;
        
        if (perf.topic) {
          groupedData[studentId].topics.add(perf.topic);
          topicsSet.add(perf.topic);
        }

        // Collect strengths and weaknesses
        if (perf.strengths && Array.isArray(perf.strengths)) {
          perf.strengths.forEach(s => {
            if (!groupedData[studentId].strengths.includes(s)) {
              groupedData[studentId].strengths.push(s);
            }
          });
        }
        if (perf.weaknesses && Array.isArray(perf.weaknesses)) {
          perf.weaknesses.forEach(w => {
            if (!groupedData[studentId].weaknesses.includes(w)) {
              groupedData[studentId].weaknesses.push(w);
            }
          });
        }
      });

      // Calculate averages
      const performanceArray = Object.values(groupedData).map((student) => ({
        ...student,
        averageScore: student.totalQuestions > 0
          ? Math.round((student.totalCorrect / student.totalQuestions) * 100)
          : 0,
        topics: Array.from(student.topics),
      }));

      setPerformanceData(performanceArray);
      setAvailableTopics(["all", ...Array.from(topicsSet)]);
    } catch (error) {
      console.error("Error fetching quiz performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailedView(student);
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
    setDetailedView(null);
  };

  const filteredData = filterTopic === "all"
    ? performanceData
    : performanceData.filter(student => student.topics.includes(filterTopic));

  return (
    <div
      id="quiz-analytics-container"
      className={`toggle-container ${
        activeContainer === "quiz-analytics" ? "active" : ""
      }`}
    >
      <div className="container-header">📊 Student Quiz Analytics</div>
      <div className="container-body">
        <div className="quiz-analytics-content">
          <div className="analytics-header">
            <p className="analytics-subtitle">
              Track student performance across all quizzes
            </p>
          </div>

      {/* Filter Controls */}
      <div className="analytics-filters">
        <label htmlFor="topic-filter">Filter by Topic:</label>
        <select
          id="topic-filter"
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="filter-select"
        >
          {availableTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic === "all" ? "All Topics" : topic}
            </option>
          ))}
        </select>
        <button onClick={fetchQuizPerformance} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="analytics-empty">
          <p>📭 No quiz performance data available yet.</p>
          <p className="empty-hint">
            Students will appear here once they complete quizzes.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="analytics-summary">
            <div className="summary-card">
              <div className="summary-icon">👥</div>
              <div className="summary-content">
                <h3>{filteredData.length}</h3>
                <p>Students</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📝</div>
              <div className="summary-content">
                <h3>
                  {filteredData.reduce((sum, s) => sum + s.totalQuizzes, 0)}
                </h3>
                <p>Total Quizzes Taken</p>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <h3>
                  {filteredData.length > 0
                    ? Math.round(
                        filteredData.reduce((sum, s) => sum + s.averageScore, 0) /
                          filteredData.length
                      )
                    : 0}
                  %
                </h3>
                <p>Class Average</p>
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <div className="analytics-table-container">
            <div className="analytics-table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Quizzes Taken</th>
                    <th>Average Score</th>
                    <th>Strengths</th>
                    <th>Weaknesses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((student) => (
                    <tr key={student.studentId}>
                      <td className="student-name-cell">
                        <strong>{student.studentName}</strong>
                      </td>
                      <td className="center-cell">{student.totalQuizzes}</td>
                      <td className="center-cell">
                        <span
                          className={`score-badge ${
                            student.averageScore >= 70
                              ? "excellent"
                              : student.averageScore >= 50
                              ? "good"
                              : "needs-improvement"
                          }`}
                        >
                          {student.averageScore}%
                        </span>
                      </td>
                      <td className="topics-cell">
                        {student.strengths.length > 0 ? (
                          <div className="topics-list">
                            {student.strengths.slice(0, 2).map((strength, idx) => (
                              <span key={idx} className="topic-tag strength">
                                {strength}
                              </span>
                            ))}
                            {student.strengths.length > 2 && (
                              <span className="topic-tag more">
                                +{student.strengths.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td className="topics-cell">
                        {student.weaknesses.length > 0 ? (
                          <div className="topics-list">
                            {student.weaknesses.slice(0, 2).map((weakness, idx) => (
                              <span key={idx} className="topic-tag weakness">
                                {weakness}
                              </span>
                            ))}
                            {student.weaknesses.length > 2 && (
                              <span className="topic-tag more">
                                +{student.weaknesses.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="no-data">-</span>
                        )}
                      </td>
                      <td className="center-cell">
                        <button
                          onClick={() => handleViewDetails(student)}
                          className="view-details-btn"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detailed View Modal */}
      {detailedView && (
        <div className="quiz-analytics-modal-overlay" onClick={handleCloseDetails}>
          <div className="quiz-analytics-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Detailed Performance: {detailedView.studentName}</h3>
              <button onClick={handleCloseDetails} className="close-modal-btn">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Student Summary */}
              <div className="detail-summary">
                <div className="detail-stat">
                  <span className="stat-label">Total Quizzes:</span>
                  <span className="stat-value">{detailedView.totalQuizzes}</span>
                </div>
                <div className="detail-stat">
                  <span className="stat-label">Average Score:</span>
                  <span className="stat-value">{detailedView.averageScore}%</span>
                </div>
                <div className="detail-stat">
                  <span className="stat-label">Total Questions:</span>
                  <span className="stat-value">{detailedView.totalQuestions}</span>
                </div>
                <div className="detail-stat">
                  <span className="stat-label">Correct Answers:</span>
                  <span className="stat-value">{detailedView.totalCorrect}</span>
                </div>
              </div>

              {/* Strengths and Weaknesses */}
              <div className="strengths-weaknesses-grid">
                <div className="sw-section">
                  <h4>💪 Strengths</h4>
                  <div className="sw-list">
                    {detailedView.strengths.length > 0 ? (
                      detailedView.strengths.map((strength, idx) => (
                        <span key={idx} className="sw-tag strength">
                          {strength}
                        </span>
                      ))
                    ) : (
                      <p className="no-data">No strengths identified yet</p>
                    )}
                  </div>
                </div>
                <div className="sw-section">
                  <h4>📚 Areas for Improvement</h4>
                  <div className="sw-list">
                    {detailedView.weaknesses.length > 0 ? (
                      detailedView.weaknesses.map((weakness, idx) => (
                        <span key={idx} className="sw-tag weakness">
                          {weakness}
                        </span>
                      ))
                    ) : (
                      <p className="no-data">No weaknesses identified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quiz History */}
              <div className="quiz-history">
                <h4>📝 Quiz History</h4>
                <div className="quiz-history-list">
                  {detailedView.quizzes.map((quiz, idx) => (
                    <div key={idx} className="quiz-history-item">
                      <div className="quiz-info">
                        <strong>{quiz.topic || "General Topic"}</strong>
                        {quiz.subtopic && (
                          <span className="subtopic-label">
                            → {quiz.subtopic}
                          </span>
                        )}
                      </div>
                      <div className="quiz-score">
                        <div className="score-display">
                          <span className="score-text">
                            {quiz.score}/{quiz.total_questions}
                          </span>
                          <span className="score-separator">•</span>
                          <span
                            className={`percentage ${
                              quiz.percentage >= 70
                                ? "excellent"
                                : quiz.percentage >= 50
                                ? "good"
                                : "needs-improvement"
                            }`}
                          >
                            {quiz.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="quiz-date">
                        {new Date(quiz.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default QuizAnalyticsContainer;
