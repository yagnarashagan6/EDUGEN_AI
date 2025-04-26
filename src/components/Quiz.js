import React, { useState, useEffect } from 'react';
import '../styles/Quiz.css';

const Quiz = ({ questions = [], topic, onComplete, timerDuration = 10 }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizCompleted) {
      handleNextQuestion();
    }
  }, [timeLeft, quizCompleted]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = () => {
    if (questions[currentQuestion]?.correctAnswer === selectedOption) {
      setScore(score + 1);
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setTimeLeft(timerDuration);
    } else {
      const finalScore = score + (questions[currentQuestion]?.correctAnswer === selectedOption ? 1 : 0);
      setQuizCompleted(true);
      onComplete(finalScore);
    }
  };

  if (!questions || questions.length === 0 || !questions.every(q => q.text && q.options && q.correctAnswer)) {
    console.error('Invalid questions data:', questions);
    return <p className="error-message">No valid questions available for this quiz.</p>;
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(timeLeft / timerDuration) * 100}%` }}
          ></div>
        </div>
        <p className="timer">Time Left: {timeLeft}s</p>
      </div>

      {!quizCompleted ? (
        <div className="quiz-content">
          <h3 className="question-text">
            Question {currentQuestion + 1} of {questions.length}: {questions[currentQuestion]?.text || 'Invalid question'}
          </h3>
          <div className="options">
            {questions[currentQuestion]?.options?.map((option, index) => (
              <button
                key={index}
                className={`option ${selectedOption === option ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
              >
                {String.fromCharCode(97 + index)}. {option}
              </button>
            ))}
          </div>
          <button
            className="next-button"
            onClick={handleNextQuestion}
            disabled={!selectedOption}
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      ) : (
        <div className="result">
          <h3 className="result-title">Quiz Completed! 🎉</h3>
          <div className="score-circle">
            <span>{score} / {questions.length}</span>
          </div>
          <p className="result-message">
            {score === questions.length
              ? 'Perfect score! Amazing job!'
              : score > questions.length / 2
              ? 'Great effort! Keep it up!'
              : 'Nice try! Practice makes perfect!'}
          </p>
          <p className="result-info">Your progress and streak have been updated.</p>
        </div>
      )}
    </div>
  );
};

export default Quiz;