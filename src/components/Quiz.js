import React, { useState, useEffect } from 'react';
import '../styles/Quiz.css';

const Quiz = ({ topic, questions = [], handleQuizComplete, isLoading = false }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [timer, setTimer] = useState(10);

  useEffect(() => {
    if (!quizCompleted) {
      setSelectedOption(null);
      setTimer(10);
    }
  }, [currentQuestion]);

  useEffect(() => {
    if (quizCompleted) return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          handleAutoNext();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, quizCompleted]);

  const handleOptionSelect = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    if (option === questions[currentQuestion]?.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion === questions.length - 1) {
      setQuizCompleted(true);
      setShowScore(true);
      setTimeout(() => {
        setShowScore(false);
        handleQuizComplete(score);
      }, 3000);
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleAutoNext = () => {
    setSelectedOption("Timed Out");
    setTimeout(() => handleNextQuestion(), 1000);
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
            <div className="question-text">{currentQData.text}</div>
            <div className="options-list">
              {currentQData.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`option-btn${selectedOption === option ? ' selected' : ''}`}
                  disabled={selectedOption !== null}
                  onClick={() => handleOptionSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="quiz-next-btn-row">
            <button
              className="next-button"
              onClick={handleNextQuestion}
              disabled={selectedOption === null}
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
        </div>
      ) : null}
    </div>
  );
};

export default Quiz;
