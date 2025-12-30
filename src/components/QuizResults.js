import React, { useState, useEffect } from "react";
import "../styles/QuizResults.css";
import jsPDF from "jspdf";
import confetti from "canvas-confetti";

/**
 * QuizResults Component
 * Displays comprehensive quiz performance analytics including:
 * - Student name and score
 * - Strengths (subtopics with >75% score)
 * - Weaknesses (subtopics with <50% score)
 * - Average performance across subtopics
 * - Detailed question-by-question breakdown
 */
const QuizResults = ({
  studentName,
  topic,
  subtopic,
  score,
  totalQuestions,
  questions,
  userAnswers,
  onBackToTasks,
  isInContainer = false,
  quizData = {}, // Additional quiz metadata
}) => {
  const [performanceAnalytics, setPerformanceAnalytics] = useState({
    strengths: [],
    weaknesses: [],
    average: 0,
    subtopicScores: {},
  });

  // Calculate performance analytics
  useEffect(() => {
    if (questions && userAnswers) {
      calculatePerformanceAnalytics();
    }
  }, [questions, userAnswers]);

  // Show celebration animation for high scores
  useEffect(() => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 80) {
      showCelebration();
    }
  }, [score, totalQuestions]);

  const showCelebration = () => {
    confetti({
      particleCount: 150,
      spread: 120,
      startVelocity: 30,
      scalar: 0.9,
      ticks: 160,
      gravity: 0.4,
      colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
      origin: { y: 0.6 },
    });
  };

  const calculatePerformanceAnalytics = () => {
    // Group questions by subtopic if available
    const subtopicPerformance = {};
    
    questions.forEach((question, index) => {
      const questionSubtopic = question.subtopic || subtopic || "General";
      const isCorrect = userAnswers[index] === question.correctAnswer;
      
      if (!subtopicPerformance[questionSubtopic]) {
        subtopicPerformance[questionSubtopic] = {
          correct: 0,
          total: 0,
        };
      }
      
      subtopicPerformance[questionSubtopic].total += 1;
      if (isCorrect) {
        subtopicPerformance[questionSubtopic].correct += 1;
      }
    });

    // Calculate percentages and categorize
    const strengths = [];
    const weaknesses = [];
    let totalPercentage = 0;
    const subtopicScores = {};

    Object.entries(subtopicPerformance).forEach(([subtopicName, data]) => {
      const percentage = (data.correct / data.total) * 100;
      subtopicScores[subtopicName] = percentage;
      totalPercentage += percentage;

      const subtopicInfo = {
        name: subtopicName,
        score: data.correct,
        total: data.total,
        percentage: percentage.toFixed(1),
      };

      if (percentage >= 75) {
        strengths.push(subtopicInfo);
      } else if (percentage < 50) {
        weaknesses.push(subtopicInfo);
      }
    });

    const average = Object.keys(subtopicPerformance).length > 0
      ? (totalPercentage / Object.keys(subtopicPerformance).length).toFixed(1)
      : 0;

    setPerformanceAnalytics({
      strengths,
      weaknesses,
      average,
      subtopicScores,
    });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("Quiz Performance Report", pageWidth / 2, y, { align: "center" });
    y += 15;

    // Student Info
    doc.setFontSize(12);
    doc.setFont(undefined, "normal");
    doc.text(`Student: ${studentName}`, 20, y);
    y += 8;
    doc.text(`Topic: ${topic}${subtopic ? ` - ${subtopic}` : ""}`, 20, y);
    y += 8;
    doc.text(`Score: ${score} / ${totalQuestions} (${((score / totalQuestions) * 100).toFixed(1)}%)`, 20, y);
    y += 12;

    // Performance Analytics
    doc.setFont(undefined, "bold");
    doc.text("Performance Analytics", 20, y);
    y += 8;
    doc.setFont(undefined, "normal");
    doc.text(`Average Performance: ${performanceAnalytics.average}%`, 20, y);
    y += 8;

    // Strengths
    if (performanceAnalytics.strengths.length > 0) {
      doc.setFont(undefined, "bold");
      doc.text("Strengths (>75%):", 20, y);
      y += 6;
      doc.setFont(undefined, "normal");
      performanceAnalytics.strengths.forEach((strength) => {
        doc.text(`  • ${strength.name}: ${strength.percentage}% (${strength.score}/${strength.total})`, 20, y);
        y += 6;
      });
      y += 4;
    }

    // Weaknesses
    if (performanceAnalytics.weaknesses.length > 0) {
      doc.setFont(undefined, "bold");
      doc.text("Areas for Improvement (<50%):", 20, y);
      y += 6;
      doc.setFont(undefined, "normal");
      performanceAnalytics.weaknesses.forEach((weakness) => {
        doc.text(`  • ${weakness.name}: ${weakness.percentage}% (${weakness.score}/${weakness.total})`, 20, y);
        y += 6;
      });
      y += 4;
    }

    y += 8;

    // Detailed Results
    doc.setFont(undefined, "bold");
    doc.text("Detailed Results", 20, y);
    y += 8;

    questions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const isCorrect = userAnswer === q.correctAnswer;

      // Check if we need a new page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFont(undefined, "bold");
      doc.text(`Q${idx + 1}: ${q.text}`, 20, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.text(`Your Answer: ${userAnswer || "No answer"}`, 25, y);
      y += 5;

      if (!isCorrect) {
        doc.setTextColor(220, 53, 69);
        doc.text(`Correct Answer: ${q.correctAnswer}`, 25, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      } else {
        doc.setTextColor(40, 167, 69);
        doc.text("✓ Correct", 25, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }

      if (q.explanation) {
        doc.setFontSize(10);
        doc.text(`Explanation: ${q.explanation}`, 25, y);
        doc.setFontSize(12);
        y += 5;
      }

      y += 4;
    });

    doc.save(`Quiz_Results_${studentName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
  };

  const getPerformanceLevel = () => {
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 90) return { level: "Excellent", color: "#28a745", emoji: "🌟" };
    if (percentage >= 75) return { level: "Good", color: "#17a2b8", emoji: "👍" };
    if (percentage >= 50) return { level: "Average", color: "#ffc107", emoji: "📚" };
    return { level: "Needs Improvement", color: "#dc3545", emoji: "💪" };
  };

  const performanceLevel = getPerformanceLevel();
  const percentage = ((score / totalQuestions) * 100).toFixed(1);

  return (
    <div className={`quiz-results-container ${isInContainer ? 'embedded' : ''}`}>
      <div className="quiz-results-content">
        {/* Header Section */}
        <div className="quiz-results-header">
          <div className="quiz-results-icon">{performanceLevel.emoji}</div>
          <h2 className="quiz-results-title">Quiz Completed!</h2>
          <p className="quiz-results-subtitle">{topic}{subtopic ? ` - ${subtopic}` : ""}</p>
        </div>



        {/* Score Display */}
        <div className="quiz-results-score-section">
          <div className="score-circle" style={{ borderColor: performanceLevel.color }}>
            <div className="score-value">{score}</div>
            <div className="score-divider">/</div>
            <div className="score-total">{totalQuestions}</div>
          </div>
          <div className="score-percentage" style={{ color: performanceLevel.color }}>
            {percentage}%
          </div>
          <div className="score-level" style={{ color: performanceLevel.color }}>
            {performanceLevel.level}
          </div>
        </div>

        {/* Detailed Results */}
        <div className="quiz-results-detailed">
          <h3 className="detailed-title">
            <i className="fas fa-list-ul"></i> Detailed Results
          </h3>
          <div className="detailed-results-list">
            {questions.map((q, idx) => {
              const userAnswer = userAnswers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div key={idx} className={`result-item ${isCorrect ? "correct" : "incorrect"}`}>
                  <div className="result-item-header">
                    <span className="result-item-number">Q{idx + 1}</span>
                    <span className={`result-item-status ${isCorrect ? "correct" : "incorrect"}`}>
                      {isCorrect ? (
                        <>
                          <i className="fas fa-check-circle"></i> Correct
                        </>
                      ) : (
                        <>
                          <i className="fas fa-times-circle"></i> Incorrect
                        </>
                      )}
                    </span>
                  </div>
                  <div className="result-item-question">{q.text}</div>
                  <div className="result-item-answers">
                    <div className={`answer-row ${isCorrect ? "correct" : "incorrect"}`}>
                      <span className="answer-label">Your Answer:</span>
                      <span className="answer-value">{userAnswer || "No answer"}</span>
                    </div>
                    {!isCorrect && (
                      <div className="answer-row correct">
                        <span className="answer-label">Correct Answer:</span>
                        <span className="answer-value">{q.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                  {q.explanation && (
                    <div className="result-item-explanation">
                      <i className="fas fa-info-circle"></i>
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="quiz-results-actions">
          <button className="quiz-results-btn download-btn" onClick={handleDownloadPDF}>
            <i className="fas fa-file-pdf"></i>
            Download Report
          </button>
          <button className="quiz-results-btn back-btn" onClick={onBackToTasks}>
            <i className="fas fa-arrow-left"></i>
            Back to Tasks
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
