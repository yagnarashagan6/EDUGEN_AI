import React, { useState, useEffect } from 'react';
import '../styles/Quiz.css';

const sampleQuestions = [
  {
    text: 'What is the primary goal of artificial intelligence?',
    options: [
      'To create machines that can think and learn like humans',
      'To replace all human jobs',
      'To improve hardware performance',
      'To create faster internet connections',
    ],
    correctAnswer: 'To create machines that can think and learn like humans',
  },
  {
    text: 'Which of the following is a supervised learning algorithm?',
    options: ['K-Means Clustering', 'Linear Regression', 'Apriori Algorithm', 'DBSCAN'],
    correctAnswer: 'Linear Regression',
  },
  {
    text: 'What does the term "Big Data" refer to?',
    options: [
      'Large datasets that cannot be processed using traditional methods',
      'A type of database management system',
      'A programming language for data analysis',
      'A hardware device for storing data',
    ],
    correctAnswer: 'Large datasets that cannot be processed using traditional methods',
  },
];

const Quiz = ({ questions = [], topic, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per question
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [effectiveQuestions, setEffectiveQuestions] = useState([]);

  useEffect(() => {
    if (
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0 ||
      !questions.every((q) => q.text && q.options && q.correctAnswer)
    ) {
      console.warn('Using sample questions due to invalid or empty questions data.');
      setEffectiveQuestions(sampleQuestions);
    } else {
      setEffectiveQuestions(questions.slice(0, 3)); // Ensure exactly 3 questions
    }
  }, [questions]);

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizCompleted) {
      handleNextQuestion(true); // Auto move when time runs out
    }
  }, [timeLeft, quizCompleted]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = (autoMove = false) => {
    const isCorrect =
      selectedOption !== null && 
      selectedOption === effectiveQuestions[currentQuestion]?.correctAnswer;

    if (!autoMove && isCorrect) {
      setScore((prev) => prev + 1);
    }

    const isLast = currentQuestion === effectiveQuestions.length - 1;

    if (isLast) {
      setQuizCompleted(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(null);
      setTimeLeft(10); // Reset to 10 seconds for next question
    }
  };

  const handleFinishQuiz = () => {
    onComplete(score);
  };

  if (effectiveQuestions.length === 0) {
    return <p className="error-message">Loading quiz questions...</p>;
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2 className="quiz-title">Quiz: {topic}</h2>
        {!quizCompleted && (
          <>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              ></div>
            </div>
            <p className="timer">Time Left: {timeLeft}s</p>
            <p className="question-counter">
              Question {currentQuestion + 1} of {effectiveQuestions.length}
            </p>
          </>
        )}
      </div>

      {!quizCompleted ? (
        <div className="quiz-content">
          <h3 className="question-text">
            {effectiveQuestions[currentQuestion]?.text}
          </h3>
          <div className="options">
            {effectiveQuestions[currentQuestion]?.options.map((option, index) => (
              <button
                key={index}
                className={`option ${selectedOption === option ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={timeLeft === 0}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>
          <button
            className="next-button"
            onClick={() => handleNextQuestion(false)}
            disabled={selectedOption === null}
          >
            {currentQuestion < effectiveQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      ) : (
        <div className="result">
          <h3 className="result-title">Quiz Completed! 🎉</h3>
          <div className="score-circle">
            <span>{score} / {effectiveQuestions.length}</span>
          </div>
          <p className="result-message">
            {score === effectiveQuestions.length
              ? 'Perfect score! Amazing job!'
              : score > effectiveQuestions.length / 2
              ? 'Great effort! Keep it up!'
              : 'Nice try! Practice makes perfect!'}
          </p>
          <button className="finish-button" onClick={handleFinishQuiz}>
            Back to Tasks
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;