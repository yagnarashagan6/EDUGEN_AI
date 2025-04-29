import React, { useState, useEffect, useRef } from 'react';
import '../styles/Chat.css';

const Chatbot = ({ isMinimized, toggleChatbot, isVisible, copiedTopic, clearCopiedTopic }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I’m EduGen AI. Ask me anything from your syllabus for a quick, clear answer.',
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
      setInput(copiedTopic);
      clearCopiedTopic();
    }
  }, [copiedTopic, clearCopiedTopic]);

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();
    if (lowerInput.includes('coxco') || lowerInput.includes('agni student portal') || lowerInput.includes('student')) {
      return 'Access the Agni Student Portal: https://coe.act.edu.in/students/';
    }
    if (lowerInput.includes('gamma ai') || lowerInput.includes('presentation ai') || lowerInput.includes('ppt ai')) {
      return 'Try Gamma AI for presentations: https://gamma.app/';
    }
    if (lowerInput.includes('pdf')) {
      return 'Use this PDF tool: https://www.ilovepdf.com/';
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const quickResponse = getQuickResponse(userMessage.text);
    if (quickResponse) {
      setMessages((prev) => [...prev, { sender: 'bot', text: quickResponse }]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://your-backend.vercel.app/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.response }]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chatbot Error:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I couldn’t process that. Try again or contact support.' },
      ]);
    } finally {
      setIsLoading(false);
    }
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