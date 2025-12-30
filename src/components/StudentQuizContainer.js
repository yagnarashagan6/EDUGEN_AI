// StudentQuizContainer.js - Quiz taking interface for students
import React, { useState, useEffect, useRef } from "react";
import "../styles/QuizContainer.css"; // Reusing the same styles
import "../styles/StudentQuiz.css"; // Additional styles for taking quiz

const StudentQuizContainer = ({ activeContainer, studentId, studentName }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);

  // Timer ref
  const timerRef = useRef(null);

  useEffect(() => {
    if (activeContainer === "quiz" && studentId) {
      fetchPublishedQuizzes();
      fetchStudentPerformance();
    }
  }, [activeContainer, studentId]);

  useEffect(() => {
    if (quizStarted && !submitted) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [quizStarted, submitted]);

  const fetchPublishedQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:10000/api/quiz/published");
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

  const fetchStudentPerformance = async () => {
    try {
      const response = await fetch(`http://localhost:10000/api/quiz/performance/${studentId}`);
      const data = await response.json();
      
      if (data.success) {
        setCompletedQuizzes(data.performance.map(p => p.quiz_id));
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
    }
  };

  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setQuizStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setSubmitted(false);
    setQuizResult(null);
  };

  const handleAnswerSelect = (option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: option
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!window.confirm("Are you sure you want to submit your quiz?")) {
      return;
    }

    setSubmitted(true);
    clearInterval(timerRef.current);

    // Format answers for API
    const formattedAnswers = activeQuiz.questions.map((_, index) => ({
      selectedAnswer: selectedAnswers[index] || ""
    }));

    try {
      const response = await fetch("http://localhost:10000/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          studentId,
          studentName,
          answers: formattedAnswers,
          timeTaken: elapsedTime,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setQuizResult(data);
        fetchStudentPerformance(); // Update list of completed quizzes
      } else {
        alert("Error submitting quiz: " + data.error);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit quiz. Please check your connection.");
    }
  };

  const handleReturnToDashboard = () => {
    setActiveQuiz(null);
    setQuizStarted(false);
    fetchPublishedQuizzes(); // Refresh list
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (activeContainer !== "quiz") return null;

  // QUIZ TAKING VIEW
  if (quizStarted && activeQuiz) {
    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100;
    const isAnswered = !!selectedAnswers[currentQuestionIndex];

    if (quizResult) {
      // RESULT VIEW
      return (
        <div className="student-quiz-container">
          <div className="quiz-result-card">
            <h3>🎉 Quiz Completed!</h3>
            
            <div className="result-score-circle">
              <span className="score-value">{quizResult.score}/{quizResult.totalQuestions}</span>
              <span className="score-label">Score</span>
            </div>

            <div className="result-details">
              <div className="result-item">
                <span className="label">Correct Answers</span>
                <span className="value">{quizResult.score} / {quizResult.totalQuestions}</span>
              </div>
              <div className="result-item">
                <span className="label">Time Taken</span>
                <span className="value">{formatTime(elapsedTime)}</span>
              </div>
            </div>

            <button onClick={handleReturnToDashboard} className="quiz-btn quiz-btn-primary">
              Return to Quiz List
            </button>
          </div>
        </div>
      );
    }

    // LIST OF QUESTIONS VIEW
    return (
      <div className="student-quiz-container">
        <div className="quiz-taking-header">
          <div className="quiz-info-top">
            <h2>{activeQuiz.title}</h2>
            <div className="quiz-timer">
              ⏱️ {formatTime(elapsedTime)}
            </div>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">
            Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
          </div>
        </div>

        <div className="question-display-card">
          <p className="taking-question-text">{currentQuestion.text}</p>
          
          <div className="taking-options-list">
            {currentQuestion.options.map((option, idx) => (
              <div
                key={idx}
                className={`taking-option ${selectedAnswers[currentQuestionIndex] === option ? "selected" : ""}`}
                onClick={() => handleAnswerSelect(option)}
              >
                <div className="option-marker">
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="option-content">{option}</div>
              </div>
            ))}
          </div>

          <div className="quiz-navigation">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="quiz-nav-btn"
            >
              Previous
            </button>
            
            {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                className="quiz-nav-btn next"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                className="quiz-nav-btn submit"
                disabled={Object.keys(selectedAnswers).length < activeQuiz.questions.length}
              >
                Submit Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // QUIZ LIST VIEW
  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>📚 Available Quizzes</h2>
        <p className="quiz-subtitle">Take quizzes to test your knowledge level</p>
      </div>

      {loading ? (
        <div className="quiz-loading">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="quiz-empty">
          <p>No quizzes available right now. Check back later!</p>
        </div>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map((quiz) => {
            const isCompleted = completedQuizzes.includes(quiz.id);
            return (
              <div key={quiz.id} className={`quiz-card ${isCompleted ? "completed-card" : ""}`}>
                <div className="quiz-card-header">
                  <h4>{quiz.title}</h4>
                  {isCompleted && <span className="quiz-badge completed">✅ Completed</span>}
                  {quiz.quiz_type === "adaptive" && <span className="quiz-badge adaptive">🎯 Adaptive</span>}
                </div>
                
                <div className="quiz-card-body">
                  <p><strong>Topic:</strong> {quiz.topic}</p>
                  <p><strong>Difficulty:</strong> <span className={`difficulty-tag ${quiz.difficulty}`}>{quiz.difficulty}</span></p>
                  <p><strong>Questions:</strong> {quiz.question_count}</p>
                </div>
                
                <div className="quiz-card-actions">
                  {isCompleted ? (
                    <button className="quiz-btn quiz-btn-sm" disabled>
                      Already Taken
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      className="quiz-btn quiz-btn-sm quiz-btn-primary"
                    >
                      🚀 Start Quiz
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentQuizContainer;
