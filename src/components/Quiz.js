import React, { useState, useEffect } from 'react';
import '../styles/Quiz.css';

const Quiz = ({ topic, questions = [], handleQuizComplete, isLoading = false }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [timer, setTimer] = useState(10);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (quizCompleted) return;
    setTimer(10);
    setTimedOut(false);
    setSelectedOption(null);

    let timeoutCalled = false;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          if (!timeoutCalled) {
            timeoutCalled = true;
            handleTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestion, quizCompleted]);

  const handleOptionSelect = (option) => {
    if (selectedOption !== null || timedOut) return;
    setSelectedOption(option);
    if (option === questions[currentQuestion]?.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  // Called when timer runs out
  const handleTimeout = () => {
    // Prevent multiple calls for the same question
    if (quizCompleted) return;
    setTimedOut(true);
    setSelectedOption("Timed Out");
    setTimeout(() => {
      if (currentQuestion === questions.length - 1) {
        setQuizCompleted(true);
        setShowScore(true);
      } else {
        setCurrentQuestion((prev) => prev + 1);
      }
    }, 1000); // 1 second delay before moving to next question
  };

  const handleNextQuestion = () => {
    if (currentQuestion === questions.length - 1) {
      setQuizCompleted(true);
      setShowScore(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  // Back to dashboard after quiz is finished
  const handleBackToTasks = () => {
    handleQuizComplete(score);
  };

  if (isLoading) {
    return (
      <div className="quiz-container">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        <p>Generating questions... Please wait.</p>
        <div className="loader"></div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="quiz-container">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        <p>Could not load questions.</p>
        <button className="next-button" onClick={() => handleQuizComplete(0)}>Back to Tasks</button>
      </div>
    );
  }

  const currentQData = questions[currentQuestion];

  if (!currentQData) {
    return (
      <div className="quiz-container">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        <p>Could not load this question.</p>
        <button className="next-button" onClick={() => handleQuizComplete(score)}>Back to Tasks</button>
      </div>
    );
  }

  const percentage = Math.round((score / questions.length) * 100);
  const progressPercent = (timer / 10) * 100;

  return (
    <div className="quiz-container">
      <h2 className="quiz-title">Quiz: {topic}</h2>

      {!quizCompleted ? (
        <>
          <div className="quiz-countdown">⏳ {timer} seconds left</div>
          <div className="timer-bar">
            <div className="fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="question-section">
            <div className="question-count">
              Question {currentQuestion + 1} / {questions.length}
            </div>
            <div
              className="question-text"
              draggable={false}
              style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
              onCopy={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
            >
              {currentQData.text}
            </div>
            <div className="options-list">
              {currentQData.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`option-btn${selectedOption === option ? ' selected' : ''}`}
                  disabled={selectedOption !== null || timedOut}
                  onClick={() => handleOptionSelect(option)}
                  style={
                    selectedOption === option
                      ? { backgroundColor: '#1976d2', borderColor: '#1976d2', color: '#fff' }
                      : {}
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="quiz-next-btn-row" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="next-button"
              onClick={handleNextQuestion}
              disabled={selectedOption === null && !timedOut}
            >
              {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </>
      ) : showScore ? (
        <div className="result">
          <div className="score-circle">{score} / {questions.length}</div>
          <div className="result-message">You scored {percentage}%</div>
          <div className="result-info">Well done!</div>
          <button className="next-button" style={{ marginTop: 24 }} onClick={handleBackToTasks}>
            Back to Tasks
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default Quiz;
