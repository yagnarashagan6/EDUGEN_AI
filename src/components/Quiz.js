import React, { useState, useEffect, useRef } from "react";
import "../styles/Quiz.css";

const Quiz = ({ topic, handleQuizComplete }) => {
  const [numQuestions, setNumQuestions] = useState("3");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const timerRef = useRef(null);

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
  }, [currentQuestion, quizStarted, quizCompleted, questions]);

  const handleStartQuiz = async () => {
    const numQ = parseInt(numQuestions);
    if (!topic) {
      setError("No topic provided. Please copy a task to start the quiz.");
      return;
    }
    if (isNaN(numQ) || numQ < 3) {
      setError("Please enter a valid number of questions (minimum 3).");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const API_URL =
        process.env.REACT_APP_API_URL || "https://edugen-backend.onrender.com"; // Update with your Render service URL
      const res = await fetch(`${API_URL}/api/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: numQ }),
      });
      const data = await res.json();
      if (!res.ok || !data.questions) {
        throw new Error(data.error || "Failed to generate quiz questions.");
      }
      setQuestions(data.questions);
      setQuizStarted(true);
      setUserAnswers([]);
    } catch (err) {
      setError("Failed to generate quiz. Please try again.");
      console.error("Failed to generate quiz", err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleOptionSelect = (option) => {
    if (!showCorrect) {
      setSelectedOption(option);
      setUserAnswers((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((ua) => ua.question === currentQuestion);
        if (idx !== -1) {
          updated[idx] = { question: currentQuestion, answer: option };
        } else {
          updated.push({ question: currentQuestion, answer: option });
        }
        return updated;
      });
    }
  };

  const handleNext = (isTimeout = false) => {
    if (
      !isTimeout &&
      selectedOption &&
      selectedOption === questions[currentQuestion].correctAnswer
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
        setShowCorrect(false);
      }
    }, 1000);
  };

  const handleBackToTasks = () => {
    handleQuizComplete(score);
  };

  if (!quizStarted) {
    return (
      <div className="quiz-container">
        <h2 className="quiz-title">Quiz: {topic || "No Topic Selected"}</h2>
        <div className="input-group">
          <input
            type="number"
            id="numQuestions"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            min="3"
            required
            aria-label="Number of questions"
            className="quiz-input"
          />
          <label
            htmlFor="numQuestions"
            className={numQuestions ? "input-label active" : "input-label"}
          >
            Number of Questions (min 3)
          </label>
        </div>
        <button
          className="start-button"
          onClick={handleStartQuiz}
          disabled={isLoading || !topic}
        >
          <i className="fas fa-play" style={{ marginRight: "0.5rem" }}></i>
          Start Quiz
        </button>
        {error && <p className="error-message">{error}</p>}
        {isLoading && (
          <p className="loading-message">
            Generating questions... <i className="fas fa-spinner fa-spin"></i>
          </p>
        )}
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="quiz-container result">
        <h2 className="result-title">Quiz Completed!</h2>
        <div className="score-circle">
          {score} / {questions.length}
        </div>
        <div className="result-message">Your Results:</div>
        <div className="results-list">
          {questions.map((q, idx) => {
            const userAnswer = userAnswers.find(
              (ua) => ua.question === idx
            )?.answer;
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <div
                key={idx}
                className={`result-item ${isCorrect ? "correct" : "incorrect"}`}
              >
                <div className="result-question">
                  Q{idx + 1}: {q.text}
                </div>
                <div className="result-answer">
                  Your Answer: {userAnswer || "None"}{" "}
                  {userAnswer && (isCorrect ? "✅" : "❌")}
                </div>
                <div className="result-correct">
                  Correct Answer: {q.correctAnswer}
                </div>
              </div>
            );
          })}
        </div>
        <button className="back-button" onClick={handleBackToTasks}>
          <i
            className="fas fa-arrow-left"
            style={{ marginRight: "0.5rem" }}
          ></i>
          Back to Tasks
        </button>
      </div>
    );
  }

  const q = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="quiz-countdown">{timer} seconds left</div>
        <div className="timer-bar">
          <div
            className="fill"
            style={{ width: `${(timer / 30) * 100}%` }}
          ></div>
        </div>
        <div
          className="question-text"
          onCopy={(e) => {
            e.preventDefault();
            alert("Copying questions is not allowed.");
          }}
        >
          Q{currentQuestion + 1}/{questions.length}: {q.text}
        </div>
      </div>
      <div className="options-list">
        {q.options.map((opt, i) => (
          <button
            key={i}
            className={`option-btn${selectedOption === opt ? " selected" : ""}${
              showCorrect && opt === q.correctAnswer ? " correct" : ""
            }${
              showCorrect && selectedOption === opt && opt !== q.correctAnswer
                ? " incorrect"
                : ""
            }`}
            onClick={() => handleOptionSelect(opt)}
            disabled={showCorrect}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="quiz-next-btn-row">
        <button
          className="next-button"
          onClick={() => handleNext()}
          disabled={!selectedOption}
        >
          {currentQuestion + 1 === questions.length ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default Quiz;
