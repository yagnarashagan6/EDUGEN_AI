import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import '../styles/Chat.css';

const Chatbot = ({ isVisible, copiedTopic, clearCopiedTopic, isInContainer = false, isQuizActive = false }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I’m EduGen AI. Ask me anything from your syllabus for a quick, clear answer.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPdfOption, setShowPdfOption] = useState(null);
  const [isPdfView, setIsPdfView] = useState(false);
  const chatBoxRef = useRef(null);
  const longPressTimeout = useRef(null);

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

  useEffect(() => {
    const handleBackButton = () => {
      if (isPdfView) {
        setIsPdfView(false);
        setShowPdfOption(null);
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [isPdfView]);

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();
    if (
      lowerInput.includes('coxco') ||
      lowerInput.includes('agni student portal') ||
      lowerInput.includes('student')
    ) {
      return 'Access the Agni Student Portal: https://coe.act.edu.in/students/';
    }
    if (
      lowerInput.includes('gamma ai') ||
      lowerInput.includes('presentation ai') ||
      lowerInput.includes('ppt ai')
    ) {
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const apiUrl = 'https://edugen-backend-zbjr.onrender.com/api/chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ message: userMessage.text }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('No response content from server');
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: data.response }]);
    } catch (err) {
      console.error('Chatbot error:', err.message);
      let userErrorMessage = 'Something went wrong. Please try again.';
      if (err.name === 'AbortError') {
        userErrorMessage = 'The AI is taking too long to respond. Please wait a bit and try again.';
      } else if (err.message.includes('Invalid JSON')) {
        userErrorMessage = 'Server returned invalid data.';
      }
      setMessages((prev) => [...prev, { sender: 'bot', text: userErrorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  const handleLongPressStart = (index) => {
    longPressTimeout.current = setTimeout(() => {
      setShowPdfOption(index);
    }, 500); // 500ms for long press
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handlePdfView = () => {
    setIsPdfView(true);
    setShowPdfOption(null);
    window.history.pushState({}, '');
  };

  const renderMessageContent = (text) => {
    return <div dangerouslySetInnerHTML={{ __html: marked.parse(text) }} />;
  };

  if (!isVisible || isQuizActive) {
    return null;
  }

  if (isPdfView) {
    return (
      <div className="pdf-view-container">
        <div className="pdf-view-content">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`pdf-message ${msg.sender === 'user' ? 'pdf-user-message' : 'pdf-chatbot-message'}`}
            >
              <div className="pdf-message-content">{renderMessageContent(msg.text)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-container ${isInContainer ? 'sidebar' : ''}`}>
      {!isInContainer && <div className="chat-header">EduGen AI Chatbot</div>}
      <div className="chat-box" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sender === 'user' ? 'user-message' : 'chatbot-message'}
            onMouseDown={() => handleLongPressStart(index)}
            onMouseUp={handleLongPressEnd}
            onTouchStart={() => handleLongPressStart(index)}
            onTouchEnd={handleLongPressEnd}
          >
            <div className="message-content">{renderMessageContent(msg.text)}</div>
            {showPdfOption === index && (
              <div className="pdf-option" onClick={handlePdfView}>
                PDF View
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chatbot-message loading">
            <div className="message-content">EduGen AI is thinking... (this may take up to 2 mins)</div>
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
  );
};

export default Chatbot;