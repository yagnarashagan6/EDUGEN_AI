import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/Quiz.css";
import jsPDF from "jspdf";

const Quiz = ({
  topic,
  handleQuizComplete,
  handleQuizCancel,
  questions: initialQuestions,
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
  const timerRef = useRef(null);

  const handleNext = useCallback(
    (isTimeout = false) => {
      if (
        !isTimeout &&
        selectedOption === questions[currentQuestion]?.correctAnswer
      ) {
        setScore((s) => s + 1);
      }

      setShowCorrect(true);
      setTimeout(() => {
        if (currentQuestion + 1 === questions.length) {
          setQuizCompleted(true);
          clearInterval(timerRef.current);
        } else {
          setCurrentQuestion((i) => i + 1);
          setSelectedOption(null);
        }
      }, 1000);
    },
    [selectedOption, questions, currentQuestion]
  );

  // Effect to handle when quiz is started with initial questions
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      setQuizStarted(true);
      setUserAnswers(Array(initialQuestions.length).fill(null));
      setCurrentQuestion(0);
      setScore(0);
      setQuizCompleted(false);
    }
  }, [initialQuestions]);

  useEffect(() => {
    if (quizStarted && !quizCompleted && questions.length > 0) {
      setTimer(30);
      setShowCorrect(false);
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

  // Screenshot restriction
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
    if (!showCorrect) {
      setSelectedOption(option);
      setUserAnswers((prev) => {
        const updated = [...prev];
        updated[currentQuestion] = option;
        return updated;
      });
    }
  };

  const handleBackToTasks = () => {
    handleQuizComplete(score);
  };

  // If no questions provided, show error
  if (!initialQuestions || initialQuestions.length === 0) {
    return (
      <div className="edugen-quiz-container">
        <h2 className="edugen-quiz-title">
          Quiz: {topic || "No Topic Selected"}
        </h2>
        <p>No quiz questions available. Please try again.</p>
        <button
          className="cancel-button"
          onClick={handleCancelQuiz}
          style={{
            marginTop: "10px",
            padding: "0.75rem 1.5rem",
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            width: "100%",
            maxWidth: "200px",
            margin: "10px auto 0",
            display: "block",
            transition: "background 0.3s, transform 0.2s",
          }}
        >
          <i className="fas fa-times" style={{ marginRight: "0.5rem" }}></i>
          Back
        </button>
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
      <div className="edugen-quiz-container edugen-quiz-result">
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
                  Your Answer: {userAnswer}{" "}
                  {userAnswer && (isCorrect ? "✓" : "✗")}
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
            <i
              className="fas fa-file-pdf"
              style={{ marginRight: "0.5rem" }}
            ></i>
            Download as PDF
          </button>
          <button
            className="edugen-quiz-back-button"
            onClick={handleBackToTasks}
          >
            <i
              className="fas fa-arrow-left"
              style={{ marginRight: "0.5rem" }}
            ></i>
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const containerStyle = {
    maxHeight: "100vh",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };

  const questionContainerStyle = {
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: "0.5rem",
  };

  return (
    <div className="edugen-quiz-container" style={containerStyle}>
      <div className="edugen-quiz-header">
        <h2 className="edugen-quiz-title">Quiz: {topic}</h2>
        <div className="edugen-quiz-progress-bar">
          <div
            className="edugen-quiz-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="edugen-quiz-timer">{timer} seconds left</div>
        <div className="timer-bar">
          <div
            className="timer-fill"
            style={{
              width: `${(timer / 30) * 100}%`,
              transition: "width 1s linear",
            }}
          ></div>
        </div>
        <div
          className="edugen-quiz-question-text"
          style={questionContainerStyle}
          onCopy={(e) => {
            e.preventDefault();
            alert("Copying questions is not allowed.");
          }}
        >
          Q{currentQuestion + 1}/{questions.length}: {currentQ.text}
        </div>
      </div>
      <div className="edugen-quiz-options-list">
        {currentQ.options.map((opt, i) => (
          <button
            key={i}
            className={`edugen-quiz-option-btn
              ${selectedOption === opt ? " selected" : ""}
              ${showCorrect && opt === currentQ.correctAnswer ? " correct" : ""}
              ${
                showCorrect &&
                selectedOption === opt &&
                opt !== currentQ.correctAnswer
                  ? " incorrect"
                  : ""
              }
            `}
            onClick={() => handleOptionSelect(opt)}
            disabled={showCorrect}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="edugen-quiz-next-btn-row">
        <button
          className="edugen-quiz-next-button"
          onClick={() => handleNext()}
          disabled={!selectedOption && timer > 0}
        >
          {currentQuestion + 1 === questions.length ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
