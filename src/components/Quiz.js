import React, { useState, useEffect, useRef, useCallback } from "react";
import "../styles/Quiz.css";
import jsPDF from "jspdf";
import confetti from "canvas-confetti";
import QuizResults from "./QuizResults";

const Quiz = ({
  topic,
  subtopic,
  studentName = "Student",
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
  const isProcessingRef = useRef(false);

  // Add a ref to ensure fireworks only trigger once
  const fireworksShownRef = useRef(false);

  // Store current values in refs to avoid dependency issues
  const currentValuesRef = useRef({
    currentQuestion: 0,
    selectedOption: null,
    isAnswerSubmitted: false,
    questions: [],
  });

  // Update refs when values change
  useEffect(() => {
    currentValuesRef.current = {
      currentQuestion,
      selectedOption,
      isAnswerSubmitted,
      questions,
    };
  }, [currentQuestion, selectedOption, isAnswerSubmitted, questions]);

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
      // Prevent double processing
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      // Get current values from ref
      const {
        currentQuestion: currentQ,
        selectedOption: currentSelected,
        isAnswerSubmitted: currentSubmitted,
        questions: currentQuestions,
      } = currentValuesRef.current;

      // Clear the timer immediately to prevent it from firing again
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Record the answer
      setUserAnswers((prev) => {
        const updated = [...prev];
        updated[currentQ] = currentSelected;
        return updated;
      });

      // Check if answer is correct and update score
      // Fixed: Compare with the correct answer properly
      if (
        !currentSubmitted &&
        currentSelected &&
        currentSelected === currentQuestions[currentQ]?.correctAnswer
      ) {
        setScore((s) => s + 1);
        console.log(
          `Correct answer! Question ${
            currentQ + 1
          }: "${currentSelected}" === "${
            currentQuestions[currentQ]?.correctAnswer
          }"`
        );
      } else {
        console.log(
          `Incorrect answer. Question ${
            currentQ + 1
          }: Selected "${currentSelected}", Correct "${
            currentQuestions[currentQ]?.correctAnswer
          }"`
        );
      }

      // Move to next question or complete quiz
      if (currentQ + 1 >= currentQuestions.length) {
        setQuizCompleted(true);
      } else {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        setShowCorrect(false);
      }

      // Allow processing again after state updates
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100);
    },
    [] // Empty dependency array since we use refs
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
      // Reset fireworks ref
      fireworksShownRef.current = false;
      // Reset processing ref
      isProcessingRef.current = false;
    }
  }, [initialQuestions]);

  // Timer effect - REMOVED handleNext from dependencies to prevent timer reset
  useEffect(() => {
    if (quizStarted && !quizCompleted && questions.length > 0) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Reset timer to 30 seconds for each question
      setTimer(30);

      // Start new timer
      timerRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            // Timer expired - call handleNext
            clearInterval(timerRef.current);
            timerRef.current = null;

            // Use setTimeout to ensure this runs after current render cycle
            setTimeout(() => {
              if (!isProcessingRef.current) {
                handleNext(true);
              }
            }, 0);

            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);

      // Cleanup function
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [currentQuestion, quizStarted, quizCompleted, questions.length]); // Removed handleNext

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isProcessingRef.current = false;
    handleQuizCancel();
  };

  const handleOptionSelect = (option) => {
    if (!isAnswerSubmitted) {
      setSelectedOption(option);
    }
  };

  const handleBackToTasks = () => {
    handleQuizComplete(score, userAnswers);
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
    return (
      <QuizResults
        studentName={studentName}
        topic={topic}
        subtopic={subtopic}
        score={score}
        totalQuestions={questions.length}
        questions={questions}
        userAnswers={userAnswers}
        isInContainer={isInContainer}
        onBackToTasks={() => handleQuizComplete(score, userAnswers)}
      />
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
