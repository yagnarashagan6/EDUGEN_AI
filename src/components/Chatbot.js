import React, { useState, useEffect, useRef } from 'react';
import '../styles/Chat.css';

const Chatbot = ({ isMinimized, toggleChatbot, isVisible, copiedTopic, clearCopiedTopic }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I’m EduGen AI. Ask me anything from your syllabus or type a topic to generate quiz questions.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (copiedTopic) {
      setInput(copiedTopic); // Update the input field with the copied topic
      clearCopiedTopic(); // Clear the copied topic after use
    }
  }, [copiedTopic, clearCopiedTopic]);

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();
    if (lowerInput.includes('coxco') || lowerInput.includes('agni student portal') || lowerInput.includes('student')) {
      return 'You can access the Agni Student Portal here: https://coe.act.edu.in/students/';
    }
    if (lowerInput.includes('gamma ai') || lowerInput.includes('presentation ai') || lowerInput.includes('ppt ai')) {
      return 'Try Gamma AI for presentations: https://gamma.app/';
    }
    if (lowerInput.includes('pdf')) {
      return 'Here’s a useful PDF tool: https://www.ilovepdf.com/';
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      sender: 'user',
      text: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const quickResponse = getQuickResponse(userMessage.text);
    if (quickResponse) {
      const botMessage = {
        sender: 'bot',
        text: quickResponse,
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
      return;
    }

    // Placeholder fallback if you ever decide to connect a backend
    const botMessage = {
      sender: 'bot',
      text: 'Sorry, I couldn’t find a specific answer. Please try rephrasing your question.',
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  const renderMessageContent = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) =>
      urlRegex.test(part) ? (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="chat-link">
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {isVisible && (
        <div className={`chat-container ${isMinimized ? 'mini' : ''}`}>
          <div className="chat-header">EduGen AI Chatbot</div>
          <div className="chat-box" ref={chatBoxRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={msg.sender === 'user' ? 'user-message' : 'chatbot-message'}
              >
                <div className="message-content">{renderMessageContent(msg.text)}</div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message loading">
                <div className="message-content">Typing...</div>
              </div>
            )}
          </div>
          <div className="chat-input">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Ask EduGen AI..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleEnter}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                className="send-btn"
                disabled={isLoading || !input.trim()}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
