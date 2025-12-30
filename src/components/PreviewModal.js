// PreviewModal.js - Modal for previewing and editing AI-generated answers and quizzes
import React, { useState, useEffect } from 'react';
import '../styles/PreviewModal.css';

const PreviewModal = ({ 
  isOpen, 
  onClose, 
  onApprove, 
  previewData 
}) => {
  const [editedAnswer, setEditedAnswer] = useState('');
  const [editedQuiz, setEditedQuiz] = useState([]);
  const [activeTab, setActiveTab] = useState('answer'); // 'answer' or 'quiz'

  // Update state when previewData changes
  useEffect(() => {
    if (previewData) {
      setEditedAnswer(previewData.aiAnswer || '');
      setEditedQuiz(previewData.quiz?.questions || []);
    }
  }, [previewData]);

  if (!isOpen || !previewData) return null;

  const handleQuestionEdit = (index, field, value) => {
    const updated = [...editedQuiz];
    updated[index] = { ...updated[index], [field]: value };
    setEditedQuiz(updated);
  };

  const handleOptionEdit = (questionIndex, optionIndex, value) => {
    const updated = [...editedQuiz];
    updated[questionIndex].options[optionIndex] = value;
    setEditedQuiz(updated);
  };

  const handleCorrectAnswerChange = (questionIndex, optionIndex) => {
    const updated = [...editedQuiz];
    updated[questionIndex].correctAnswer = optionIndex;
    setEditedQuiz(updated);
  };

  const handleApprove = () => {
    onApprove({
      ...previewData,
      aiAnswer: editedAnswer,
      quiz: {
        ...previewData.quiz,
        questions: editedQuiz
      }
    });
  };

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h2>
            <i className="fas fa-eye"></i> Preview & Edit AI Generated Content
          </h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="preview-modal-info">
          <div className="info-item">
            <strong>Subject:</strong> {previewData.subject}
          </div>
          <div className="info-item">
            <strong>Topic:</strong> {previewData.topic}
          </div>
          {previewData.subtopic && (
            <div className="info-item">
              <strong>Subtopic:</strong> {previewData.subtopic}
            </div>
          )}
          <div className="info-item">
            <strong>Difficulty:</strong> {previewData.difficulty}
          </div>
        </div>

        <div className="preview-tabs">
          <button 
            className={`tab-btn ${activeTab === 'answer' ? 'active' : ''}`}
            onClick={() => setActiveTab('answer')}
          >
            <i className="fas fa-book-open"></i> AI Answer
          </button>
          <button 
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            <i className="fas fa-question-circle"></i> Quiz ({editedQuiz.length} questions)
          </button>
        </div>

        <div className="preview-modal-body">
          {activeTab === 'answer' ? (
            <div className="answer-preview">
              <h3>AI Generated Answer</h3>
              <p className="edit-hint">
                <i className="fas fa-info-circle"></i> You can edit the answer below before approving
              </p>
              <textarea
                value={editedAnswer}
                onChange={(e) => setEditedAnswer(e.target.value)}
                className="answer-editor"
                rows={15}
                placeholder="AI generated answer will appear here..."
              />
            </div>
          ) : (
            <div className="quiz-preview">
              <h3>Generated Quiz Questions</h3>
              <p className="edit-hint">
                <i className="fas fa-info-circle"></i> You can edit questions, options, and correct answers
              </p>
              <div className="quiz-questions-list">
                {editedQuiz.map((question, qIndex) => (
                  <div key={qIndex} className="question-edit-card">
                    <div className="question-header">
                      <span className="question-number">Question {qIndex + 1}</span>
                    </div>
                    
                    <textarea
                      value={question.question}
                      onChange={(e) => handleQuestionEdit(qIndex, 'question', e.target.value)}
                      className="question-text-editor"
                      rows={2}
                      placeholder="Question text..."
                    />

                    <div className="options-editor">
                      <label>Options:</label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="option-edit-row">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionEdit(qIndex, oIndex, e.target.value)}
                            className="option-text-input"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                          {question.correctAnswer === oIndex && (
                            <span className="correct-badge">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="explanation-editor">
                        <label>Explanation:</label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => handleQuestionEdit(qIndex, 'explanation', e.target.value)}
                          className="explanation-text-editor"
                          rows={2}
                          placeholder="Explanation..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="preview-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            <i className="fas fa-times"></i> Cancel
          </button>
          <button className="approve-btn" onClick={handleApprove}>
            <i className="fas fa-check"></i> Approve & Post Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
