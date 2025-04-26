import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Assessment = ({ topic, onComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.post('http://127.0.0.1:5000/ask', {
          question: `Generate 3 multiple-choice questions about ${topic} with 4 options each and the correct answer.`,
        });
        const questionsData = parseQuestions(response.data.response);
        setQuestions(questionsData);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestions([]);
      }
    };

    fetchQuestions();
  }, [topic]);

  useEffect(() => {
    if (timeLeft === 0 && !isFinished) {
      handleNextQuestion();
    }

    const timer = setInterval(() => {
      if (!isFinished && timeLeft > 0) setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const parseQuestions = (responseText) => {
    const questionBlocks = responseText.split(/\d+\./).filter(block => block.trim());
    return questionBlocks.map(block => {
      const lines = block.trim().split('\n');
      const question = lines[0].trim();
      const options = lines.slice(1, 5).map(opt => opt.trim().replace(/^[a-d]\./, ''));
      const correctAnswer = lines[5]?.match(/Correct Answer: (.*)/)?.[1]?.trim();
      return { question, options, correctAnswer };
    });
  };

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    if (answer === questions[currentQuestion]?.correctAnswer) {
      setScore(prev => prev + 1);
    }
    setTimeout(handleNextQuestion, 1000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      setTimeLeft(10);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
      const finalScore = score + (selectedAnswer === questions[currentQuestion]?.correctAnswer ? 1 : 0);
      onComplete(finalScore);
    }
  };

  if (questions.length === 0) return <div className="p-4 text-gray-500">Loading questions...</div>;
  if (isFinished) return (
    <div className="p-4">
      <h3 className="text-xl font-bold">Assessment Complete!</h3>
      <p>Your score: {score}/{questions.length}</p>
      <p>Feedback: {score === questions.length ? 'Excellent!' : 'Review the topic again.'}</p>
    </div>
  );

  const currentQ = questions[currentQuestion];

  return (
    <div className="assessment p-4">
      <h3 className="text-lg font-semibold">Question {currentQuestion + 1}/{questions.length}</h3>
      <p className="text-gray-600">Time Left: {timeLeft}s</p>
      <p className="my-2">{currentQ?.question}</p>
      {currentQ?.options.map((option, index) => (
        <button
          key={index}
          onClick={() => handleAnswer(option)}
          disabled={selectedAnswer !== null}
          className={`block w-full p-2 my-1 rounded ${selectedAnswer === option ? (option === currentQ.correctAnswer ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default Assessment;