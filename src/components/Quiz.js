import React, { useState, useEffect } from 'react';
import '../styles/Quiz.css';

const Quiz = ({ topic, questions = [], handleQuizComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds per question
  const [quizCompleted, setQuizCompleted] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted && questions.length > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizCompleted && questions.length > 0) {
      handleNextQuestion(true); // Auto move when time runs out
    }
  }, [timeLeft, quizCompleted, questions]);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = (autoMove = false) => {
    const isCorrect =
      selectedOption !== null &&
      selectedOption === questions[currentQuestion]?.correctAnswer;

    if (!autoMove && isCorrect) {
      setScore((prev) => prev + 1);
    }

    const isLast = currentQuestion === questions.length - 1;

    if (isLast) {
      setQuizCompleted(true);
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(null);
      setTimeLeft(10); // Reset to 10 seconds for next question
    }
  };

  const handleFinishQuiz = () => {
    handleQuizComplete(score);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md text-center">
        <p className="text-lg font-semibold text-gray-700">
          No questions available for: {topic}
        </p>
      </div>
    );
  }

  return (
    <div className="quiz-container max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="quiz-header text-center mb-6">
        <h2 className="quiz-title text-2xl font-semibold text-gray-800">Quiz: {topic}</h2>
        {!quizCompleted && (
          <>
            <div className="progress-bar h-2 bg-gray-200 rounded-full overflow-hidden mt-4">
              <div
                className="progress-fill h-full bg-blue-600 transition-all duration-1000"
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              ></div>
            </div>
            <p className="timer text-gray-600 mt-2">Time Left: {timeLeft}s</p>
            <p className="question-counter text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </>
        )}
      </div>

      {!quizCompleted ? (
        <div className="quiz-content">
          <h3 className="question-text text-lg font-medium text-gray-700 mb-4">
            {questions[currentQuestion]?.text}
          </h3>
          <div className="options space-y-2">
            {questions[currentQuestion]?.options.map((option, index) => (
              <button
                key={index}
                className={`option w-full text-left p-3 rounded-lg border transition ${
                  selectedOption === option
                    ? 'bg-blue-100 border-blue-500'
                    : 'border-gray-300 hover:bg-gray-100'
                } ${timeLeft === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleOptionSelect(option)}
                disabled={timeLeft === 0}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            ))}
          </div>
          <button
            className="next-button mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            onClick={() => handleNextQuestion(false)}
            disabled={selectedOption === null}
          >
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        </div>
      ) : (
        <div className="result text-center">
          <h3 className="result-title text-2xl font-semibold text-gray-800 mb-4">Quiz Completed! 🎉</h3>
          <div className="score-circle w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-gray-800">
              {score} / {questions.length}
            </span>
          </div>
          <p className="result-message text-gray-600 mb-6">
            {score === questions.length
              ? 'Perfect score! Amazing job!'
              : score > questions.length / 2
              ? 'Great effort! Keep it up!'
              : 'Nice try! Practice makes perfect!'}
          </p>
          <button
            className="finish-button px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={handleFinishQuiz}
          >
            Back to Tasks
          </button>
        </div>
      )}
    </div>
  );
};

export default Quiz;