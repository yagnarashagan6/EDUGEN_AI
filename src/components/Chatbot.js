import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import '../styles/Chat.css';
import html2pdf from 'html2pdf.js';

const Chatbot = ({ isVisible, copiedTopic, clearCopiedTopic, isInContainer = false, isQuizActive = false }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hi! I’m EduGen AI. Ask me anything from your syllabus for a quick, clear answer.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionsForMessage, setShowOptionsForMessage] = useState(null);
  const [isPdfView, setIsPdfView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatBoxRef = useRef(null);
  const longPressTimeout = useRef(null);
  const synth = useRef(window.speechSynthesis);

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
        setShowOptionsForMessage(null);
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
      setShowOptionsForMessage(index);
    }, 500);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handlePdfView = () => {
    setIsPdfView(true);
    setShowOptionsForMessage(null);
    window.history.pushState({}, '');
  };

  const handleReadAloud = (text) => {
    if (synth.current.speaking) {
      synth.current.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.current.speak(utterance);
    setShowOptionsForMessage(null);
  };

  const handleStopAudio = () => {
    if (synth.current.speaking) {
      synth.current.cancel();
      setIsSpeaking(false);
    }
    setShowOptionsForMessage(null);
  };

  const extractTopicForFilename = (text) => {
    // Common stop words to remove
    const stopWords = [
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how',
      'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'what', 'when',
      'where', 'which', 'who', 'why', 'with'
    ];
    // Split the text into words, remove stop words, and clean
    let words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Take up to 3 words to keep filename concise
    words = words.slice(0, 3);
    
    // Join words with underscores and ensure non-empty
    const topic = words.length > 0 ? words.join('_') : 'chat';
    return `${topic}_edugen-ai.pdf`;
  };

  const downloadChatAsPdf = () => {
    // Find the last user message to use as the topic
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.sender === 'user')?.text || 'default';
    
    // Generate filename based on the last user message
    const filename = extractTopicForFilename(lastUserMessage);

    const element = document.createElement('div');
    element.innerHTML = `
      <style>
        .pdf-download-container {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        .pdf-message {
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 8px;
          word-wrap: break-word;
        }
        .pdf-user-message {
          background-color: #e6f7ff;
          text-align: right;
          color: #000;
        }
        .pdf-chatbot-message {
          background-color: #f0f0f0;
          text-align: left;
          color: #000;
        }
        .pdf-message-sender {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .pdf-message-content p {
            margin: 0;
            padding: 0;
        }
      </style>
      <div class="pdf-download-container">
        <h1>EduGen AI Chat Conversation</h1>
        ${messages.map(msg => `
          <div class="pdf-message ${msg.sender === 'user' ? 'pdf-user-message' : 'pdf-chatbot-message'}">
            <div class="pdf-message-sender">${msg.sender === 'user' ? 'You' : 'EduGen AI'}:</div>
            <div class="pdf-message-content">${marked.parse(msg.text)}</div>
          </div>
        `).join('')}
      </div>
    `;

    html2pdf().from(element).set({ filename }).save();
    setShowOptionsForMessage(null);
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
      {!isInContainer && (
        <div className="chat-header">
          EduGen AI Chatbot
          <div className="chat-actions">
            <button onClick={downloadChatAsPdf} title="Download Chat as PDF">
              <i className="fas fa-file-pdf"></i>
            </button>
          </div>
        </div>
      )}
      {isInContainer && (
        <div className="chat-header sidebar-header">
          EduGen AI Chatbot
          <div className="chat-actions">
            <button onClick={downloadChatAsPdf} title="Download Chat as PDF">
              <i className="fas fa-file-pdf"></i>
            </button>
          </div>
        </div>
      )}
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
            {showOptionsForMessage === index && (
              <div className="message-options">
                {isSpeaking ? (
                  <div className="option-item" onClick={handleStopAudio}>
                    <i className="fas fa-stop"></i> Stop Audio
                  </div>
                ) : (
                  <div className="option-item" onClick={() => handleReadAloud(msg.text)}>
                    <i className="fas fa-volume-up"></i> Read Aloud
                  </div>
                )}
                <div className="option-item" onClick={handlePdfView}>
                  <i className="fas fa-file-alt"></i> PDF View
                </div>
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