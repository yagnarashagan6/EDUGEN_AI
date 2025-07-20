import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/Quiz.css";
import jsPDF from "jspdf";

// Add this import at the top
import confetti from "canvas-confetti";

const Quiz = ({
  topic,
  handleQuizComplete,
  handleQuizCancel,
  questions: initialQuestions,
  isInContainer = false,
}) => {
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timer, setTimer] = useState(30);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const timerRef = useRef(null);

  // Add a ref to ensure fireworks only trigger once
  const fireworksShownRef = useRef(false);

  // Fireworks animation config
  const showFireworks = () => {
    confetti({
      particleCount: 111,
      spread: 114,
      startVelocity: 25,
      scalar: 0.8, // elementSize: 8 (relative)
      ticks: 140, // lifetime
      gravity: 0.35,
      wind: 0,
      decay: 0.98,
      colors: [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ff00ff",
        "#00ffff",
      ],
      origin: { y: 0.6 },
    });
  };

  // Show fireworks if user gets full marks or nearly full marks (e.g. 9/10, 5/5, 3/3, etc.)
  useEffect(() => {
    if (quizCompleted && !fireworksShownRef.current) {
      if (
        questions.length > 0 &&
        (score === questions.length || score === questions.length - 1)
      ) {
        showFireworks();
        fireworksShownRef.current = true;
      }
    }
  }, [quizCompleted, score, questions.length]);

  const handleNext = useCallback(
    (isTimeout = false) => {
      // Record the answer
      setUserAnswers((prev) => {
        const updated = [...prev];
        updated[currentQuestion] = selectedOption;
        return updated;
      });

      // Check if answer is correct and update score
      if (
        !isAnswerSubmitted &&
        !isTimeout &&
        selectedOption === questions[currentQuestion]?.correctAnswer
      ) {
        setScore((s) => s + 1);
      }

      // Move to next question or complete quiz immediately
      if (currentQuestion + 1 === questions.length) {
        setQuizCompleted(true);
        clearInterval(timerRef.current);
      } else {
        setCurrentQuestion((i) => i + 1);
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        setShowCorrect(false);
      }
    },
    [selectedOption, questions, currentQuestion, isAnswerSubmitted]
  );

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setQuizStarted(true);
      setUserAnswers(Array(initialQuestions.length).fill(null));
      setCurrentQuestion(0);
      setScore(0);
      setQuizCompleted(false);
      setShowCorrect(false);
      setIsAnswerSubmitted(false);
    }
  }, [initialQuestions]);

  useEffect(() => {
    if (quizStarted && !quizCompleted && questions.length > 0) {
      setTimer(30);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current);
            handleNext(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [currentQuestion, quizStarted, quizCompleted, questions, handleNext]);

  useEffect(() => {
    const handlePrintScreen = (e) => {
      if (e.key === "PrintScreen") {
        alert("Screenshots are not allowed during the quiz.");
        const body = document.body;
        const prev = body.style.visibility;
        body.style.visibility = "hidden";
        setTimeout(() => {
          body.style.visibility = prev;
        }, 800);
      }
    };
    window.addEventListener("keydown", handlePrintScreen);
    return () => {
      window.removeEventListener("keydown", handlePrintScreen);
    };
  }, []);

  const handleCancelQuiz = () => {
    clearInterval(timerRef.current);
    handleQuizCancel();
  };

  const handleOptionSelect = (option) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(option);
    }
  };

  const handleBackToTasks = () => {
    handleQuizComplete(score);
  };

  const getTimerClass = () => {
    if (timer <= 5) return "critical";
    if (timer <= 10) return "warning";
    return "";
  };

  if (!initialQuestions || initialQuestions.length === 0) {
    return (
      <div
        className={`edugen-quiz-container ${
          isInContainer ? "container-quiz" : ""
        }`}
      >
        <div className="edugen-quiz-content">
          <div className="edugen-quiz-error">
            <p>No quiz questions available. Please try again.</p>
            <button
              className="edugen-quiz-back-button"
              onClick={handleCancelQuiz}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const handleDownloadPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Quiz Results: ${topic}`, 10, 15);
      doc.setFontSize(12);
      doc.text(`Score: ${score} / ${questions.length}`, 10, 25);
      let y = 35;
      questions.forEach((q, idx) => {
        doc.setFont(undefined, "bold");
        doc.text(`Q${idx + 1}: ${q.text}`, 10, y);
        y += 7;
        doc.setFont(undefined, "normal");
        q.options.forEach((opt) => {
          let prefix = " ";
          if (opt === q.correctAnswer) prefix = "✓";
          if (userAnswers[idx] === opt && opt !== q.correctAnswer) prefix = "✗";
          doc.text(`${prefix} ${opt}`, 14, y);
          y += 6;
        });
        doc.text(`Your Answer: ${userAnswers[idx] || "No answer"}`, 14, y);
        y += 6;
        if (userAnswers[idx] !== q.correctAnswer) {
          doc.text(`Correct Answer: ${q.correctAnswer}`, 14, y);
          y += 6;
        }
        y += 2;
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
      });
      doc.save(`Quiz_${topic.replace(/\s+/g, "_")}.pdf`);
    };

    return (
      <div
        className={`edugen-quiz-container ${
          isInContainer ? "container-quiz" : ""
        }`}
      >
        <div className="edugen-quiz-content">
          <div className="edugen-quiz-result">
            <h2 className="edugen-quiz-result-title">Quiz Completed!</h2>
            <div className="edugen-quiz-score-circle">
              {score} / {questions.length}
            </div>
            <div className="edugen-quiz-result-message">Your Results:</div>
            <div className="edugen-quiz-results-list">
              {questions.map((q, idx) => {
                const userAnswer = userAnswers[idx];
                const isCorrect = userAnswer === q.correctAnswer;
                return (
                  <div
                    key={idx}
                    className={`edugen-quiz-result-item ${
                      isCorrect ? "correct" : "incorrect"
                    }`}
                  >
                    <div className="edugen-quiz-result-question">
                      Q{idx + 1}: {q.text}
                    </div>
                    <div
                      className={`edugen-quiz-result-answer ${
                        isCorrect ? "correct" : "incorrect"
                      }`}
                    >
                      Your Answer: {userAnswer || "No answer"}
                    </div>
                    {!isCorrect && (
                      <div className="edugen-quiz-result-correct">
                        Correct Answer: {q.correctAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="edugen-quiz-result-actions-row">
              <button
                className="edugen-quiz-download-pdf-btn"
                onClick={handleDownloadPDF}
              >
                <i className="fas fa-file-pdf"></i>
                Download PDF
              </button>
              <button
                className="edugen-quiz-back-button"
                onClick={handleBackToTasks}
              >
                <i className="fas fa-arrow-left"></i>
                Back to Tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div
      className={`edugen-quiz-container ${
        isInContainer ? "container-quiz" : ""
      }`}
    >
      <div className="edugen-quiz-content">
        {/* Only show header when NOT in container */}
        {!isInContainer && (
          <div className="edugen-quiz-header">
            <h2 className="edugen-quiz-title">Quiz: {topic}</h2>
            <div className="edugen-quiz-progress-bar">
              <div
                className="edugen-quiz-progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className={`edugen-quiz-timer ${getTimerClass()}`}>
              {timer} seconds left
            </div>
          </div>
        )}

        {/* Show progress and timer in container mode */}
        {isInContainer && (
          <div className="quiz-container-header">
            <div className="quiz-progress-timer-row">
              <div className="quiz-progress-section">
                <div className="quiz-progress-label">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
                <div className="quiz-progress-bar-container">
                  <div
                    className="quiz-progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              <div className={`quiz-timer-display ${getTimerClass()}`}>
                <i className="fas fa-clock"></i>
                {timer}s
              </div>
            </div>
          </div>
        )}

        <div className="edugen-quiz-question-container">
          <div
            className="edugen-quiz-question-text"
            onCopy={(e) => {
              e.preventDefault();
              alert("Copying questions is not allowed.");
            }}
          >
            Q{currentQuestion + 1}: {currentQ.text}
          </div>

          <div className="edugen-quiz-options-list">
            {currentQ.options.map((opt, i) => {
              let optionClass = "edugen-quiz-option-btn";

              // Only show selected state, no correct/incorrect indication during quiz
              if (selectedOption === opt) {
                optionClass += " selected";
              }

              return (
                <button
                  key={i}
                  className={optionClass}
                  onClick={() => handleOptionSelect(opt)}
                  disabled={isAnswerSubmitted}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="edugen-quiz-next-btn-container">
            <button
              className="edugen-quiz-next-button"
              onClick={() => handleNext()}
              disabled={!selectedOption && timer > 0}
            >
              {currentQuestion + 1 === questions.length
                ? "Finish Quiz"
                : "Next Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
