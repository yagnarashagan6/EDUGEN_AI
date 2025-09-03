import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import "../styles/Chat.css";
import "../styles/ChatMobile.css";
import html2pdf from "html2pdf.js";

const Chatbot = ({
  isVisible,
  copiedTopic,
  clearCopiedTopic,
  isInContainer = false,
  isQuizActive = false,
  onMessageSent = null,
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! I'm EduGen AI. Ask me anything from your syllabus for a quick, clear answer.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptionsForMessage, setShowOptionsForMessage] = useState(null);
  const [optionsPosition, setOptionsPosition] = useState({ x: 0, y: 0 });
  const [isPdfView, setIsPdfView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // New states for chat history
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessions, setSelectedSessions] = useState([]);

  // Add a new state to track the current session ID
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Add new state for temporary chat mode
  const [isNewSession, setIsNewSession] = useState(true);

  // Add state for selected text
  const [selectedText, setSelectedText] = useState("");

  const chatBoxRef = useRef(null);
  const longPressTimeout = useRef(null);
  const synth = useRef(window.speechSynthesis);
  const recognition = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "en-US";

      recognition.current.onstart = () => {
        setIsListening(true);
      };

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(
          (prevInput) => prevInput + (prevInput ? " " : "") + transcript
        );
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognition.current) {
        recognition.current.abort();
      }
    };
  }, []);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const loadChatHistory = () => {
      try {
        const stored = localStorage.getItem("edugen_chat_history");
        if (stored) {
          const parsedHistory = JSON.parse(stored);
          setChatHistory(parsedHistory);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };
    loadChatHistory();
  }, []);

  // Save current chat to history when messages change
  useEffect(() => {
    const saveChatToHistory = () => {
      // Only save if there are user messages (not just the initial bot message)
      const hasUserMessages = messages.some((msg) => msg.sender === "user");
      if (!hasUserMessages || messages.length < 2) return;

      const firstUserMessage = messages.find((msg) => msg.sender === "user");
      const title = firstUserMessage
        ? firstUserMessage.text.substring(0, 50) +
          (firstUserMessage.text.length > 50 ? "..." : "")
        : "Chat Session";

      try {
        const existingHistory = JSON.parse(
          localStorage.getItem("edugen_chat_history") || "[]"
        );

        // If we have a current session ID, update that session
        if (currentSessionId) {
          const sessionIndex = existingHistory.findIndex(
            (session) => session.id === currentSessionId
          );

          if (sessionIndex !== -1) {
            // Update existing session
            existingHistory[sessionIndex] = {
              ...existingHistory[sessionIndex],
              messages: [...messages],
              timestamp: new Date().toISOString(),
              messageCount: messages.filter((msg) => msg.sender === "user")
                .length,
            };
          }
        } else {
          // Create new session only if no current session ID
          const sessionId = Date.now();
          const chatSession = {
            id: sessionId,
            title,
            timestamp: new Date().toISOString(),
            messages: [...messages],
            messageCount: messages.filter((msg) => msg.sender === "user")
              .length,
          };

          // Set this as the current session
          setCurrentSessionId(sessionId);

          // Add new session at the beginning
          existingHistory.unshift(chatSession);
        }

        // Keep only last 50 sessions to prevent localStorage overflow
        const limitedHistory = existingHistory.slice(0, 50);

        localStorage.setItem(
          "edugen_chat_history",
          JSON.stringify(limitedHistory)
        );
        setChatHistory(limitedHistory);
      } catch (error) {
        console.error("Error saving chat to history:", error);
      }
    };

    const timeoutId = setTimeout(saveChatToHistory, 1000); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [messages, currentSessionId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768 && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullScreen]);

  useEffect(() => {
    if (chatBoxRef.current) {
      setTimeout(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
      }, 10);
    }
  }, [messages, isFullScreen]);

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
      } else if (showHistory) {
        setShowHistory(false);
      }
    };

    window.addEventListener("popstate", handleBackButton);
    return () => window.removeEventListener("popstate", handleBackButton);
  }, [isPdfView, showHistory]);

  // Add useEffect to handle text selection
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
    };

    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("touchend", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("touchend", handleTextSelection);
    };
  }, []);

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();

    if (
      lowerInput.includes("coxco") ||
      lowerInput.includes("agni student portal")
    ) {
      return "Access the Agni Student Portal: https://coe.act.edu.in/students/";
    }
    if (lowerInput.includes("gamma ai") || lowerInput.includes("ppt ai")) {
      return "Try Gamma AI for presentations: https://gamma.app/";
    }
    if (lowerInput.includes("pdf")) {
      return "Use this PDF tool: https://www.ilovepdf.com/";
    }

    if (
      lowerInput.includes("khan academy") ||
      lowerInput.includes("free courses")
    ) {
      return "🎓 **Free Learning Resources:**\n\n📺 **Khan Academy**: https://www.khanacademy.org/\n📚 **Coursera**: https://www.coursera.org/\n🎯 **edX**: https://www.edx.org/\n🧮 **MIT OpenCourseWare**: https://ocw.mit.edu/";
    }

    if (lowerInput.includes("youtube") && lowerInput.includes("education")) {
      return "📺 **Educational YouTube Channels:**\n\n🧪 **Science**: 3Blue1Brown, Veritasium, MinutePhysics\n🧮 **Math**: Khan Academy, Professor Leonard, PatrickJMT\n📖 **Literature**: CrashCourse Literature, The Great Courses\n🌍 **History**: CrashCourse World History, TED-Ed\n💻 **Programming**: freeCodeCamp, CS50, The Coding Train";
    }

    if (lowerInput.includes("research") || lowerInput.includes("articles")) {
      return "📖 **Research & Articles:**\n\n📚 **Academic**: Google Scholar, JSTOR, PubMed\n📰 **General**: Wikipedia, Britannica, Smithsonian Magazine\n🔬 **Science**: Scientific American, Nature, New Scientist\n💡 **Technology**: MIT Technology Review, Wired, IEEE Spectrum";
    }

    return null;
  };

  const isRequestingRef = useRef(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (isRequestingRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please wait a few seconds before sending another question. This helps avoid server overload.",
        },
      ]);
      return;
    }

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Mark as no longer a new session once user sends first message
    if (isNewSession) {
      setIsNewSession(false);
    }

    if (onMessageSent) {
      onMessageSent();
    }

    const quickResponse = getQuickResponse(userMessage.text);
    if (quickResponse) {
      setMessages((prev) => [...prev, { sender: "bot", text: quickResponse }]);
      setIsLoading(false);
      return;
    }

    isRequestingRef.current = true;
    const lockTimeout = setTimeout(() => {
      isRequestingRef.current = false;
    }, 10000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const apiUrl = "https://edugen-backend-zbjr.onrender.com/api/chat";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (response.status === 429) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Too many users are using this feature right now. Please wait a few seconds and try again.",
          },
        ]);
        setIsLoading(false);
        return;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error("No response content from server");
      }

      setMessages((prev) => [...prev, { sender: "bot", text: data.response }]);
    } catch (err) {
      console.error("Chatbot error:", err.message);
      let userErrorMessage = "Something went wrong. Please try again.";
      if (err.name === "AbortError") {
        userErrorMessage =
          "The AI is taking too long to respond. Please wait a bit and try again.";
      } else if (err.message.includes("Invalid JSON")) {
        userErrorMessage = "Server returned invalid data.";
      }
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: userErrorMessage },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isRequestingRef.current = false;
      }, 10000);
      clearTimeout(lockTimeout);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && !isLoading) {
      sendMessage();
    }
  };

  const handleMessageClick = (e, index, message) => {
    if (message.sender === "bot") {
      if (showOptionsForMessage === index) {
        setShowOptionsForMessage(null);
      } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX || (e.touches && e.touches[0].clientX);
        const clickY = e.clientY || (e.touches && e.touches[0].clientY);

        const x = clickX || rect.left + rect.width / 2;
        const y = clickY || rect.top + rect.height / 2;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const optionsWidth = isMobile ? 280 : 320;
        const optionsHeight = isMobile ? 120 : 100; // Increased height for new button

        let adjustedX = x - optionsWidth / 2;
        let adjustedY = y - optionsHeight - 20;

        if (adjustedX + optionsWidth > viewportWidth - 20) {
          adjustedX = viewportWidth - optionsWidth - 20;
        }
        if (adjustedX < 20) {
          adjustedX = 20;
        }

        if (adjustedY < 20) {
          adjustedY = y + 20;
        }

        if (adjustedY + optionsHeight > viewportHeight - 20) {
          adjustedY = viewportHeight - optionsHeight - 20;
        }

        setOptionsPosition({ x: adjustedX, y: adjustedY });
        setShowOptionsForMessage(index);
      }
    }
  };

  // Add the missing handleRightClick function
  const handleRightClick = (e, index, message) => {
    e.preventDefault(); // Prevent default context menu
    if (message.sender === "bot") {
      handleMessageClick(e, index, message);
    }
  };

  // Add long press handlers for history items
  const handleHistoryItemTouchStart = (e, sessionId) => {
    longPressTimeout.current = setTimeout(() => {
      // Enable selection mode on long press
      if (!selectedSessions.includes(sessionId)) {
        setSelectedSessions((prev) => [...prev, sessionId]);
      }
    }, 500); // 500ms long press
  };

  const handleHistoryItemTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleHistoryItemClick = (session) => {
    // If in selection mode (some items selected), toggle selection
    if (selectedSessions.length > 0) {
      if (selectedSessions.includes(session.id)) {
        setSelectedSessions((prev) => prev.filter((id) => id !== session.id));
      } else {
        setSelectedSessions((prev) => [...prev, session.id]);
      }
    } else {
      // Normal click - load conversation
      loadChatSession(session);
    }
  };

  const handlePdfView = () => {
    setIsPdfView(true);
    setShowOptionsForMessage(null);
    window.history.pushState({}, "");
  };

  // New function to show history
  const handleShowHistory = () => {
    setShowHistory(true);
    setShowOptionsForMessage(null);
    window.history.pushState({}, "");
  };

  // Function to load a chat session from history
  const loadChatSession = (session) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id); // Set the current session ID
    setShowHistory(false);
    setSelectedSessions([]);
    setSearchQuery("");
  };

  // Function to delete selected sessions
  const deleteSelectedSessions = () => {
    if (selectedSessions.length === 0) return;

    const updatedHistory = chatHistory.filter(
      (session) => !selectedSessions.includes(session.id)
    );

    setChatHistory(updatedHistory);
    localStorage.setItem("edugen_chat_history", JSON.stringify(updatedHistory));
    setSelectedSessions([]);
  };

  // Function to start new chat
  const startNewChatConversation = () => {
    setMessages([
      {
        sender: "bot",
        text: "Hi! I'm EduGen AI. Ask me anything from your syllabus for a quick, clear answer.",
      },
    ]);
    setCurrentSessionId(null); // Reset current session ID for new chat
    setIsNewSession(true); // Mark as new session
    setShowHistory(false);
    setSelectedSessions([]);
    setSearchQuery("");
  };

  // Filter chat history based on search query
  const filteredHistory = chatHistory.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some((msg) =>
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

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

  const handleSpeechToText = () => {
    if (!recognition.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      try {
        recognition.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        alert("Could not start speech recognition. Please try again.");
      }
    }
  };

  // Update the handleCopyText function to copy the entire message if no text is selected
  const handleCopyText = () => {
    let textToCopy = selectedText;

    // If no text is selected, copy the entire message
    if (!textToCopy && showOptionsForMessage !== null) {
      textToCopy = messages[showOptionsForMessage].text;
    }

    if (textToCopy) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          alert(
            selectedText
              ? "Selected text copied to clipboard!"
              : "Message copied to clipboard!"
          );
        })
        .catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = textToCopy;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          alert(
            selectedText
              ? "Selected text copied to clipboard!"
              : "Message copied to clipboard!"
          );
        });
      setShowOptionsForMessage(null);
    }
  };

  const extractTopicForFilename = (text) => {
    const stopWords = [
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "how",
      "in",
      "is",
      "it",
      "of",
      "on",
      "or",
      "that",
      "the",
      "to",
      "what",
      "when",
      "where",
      "which",
      "who",
      "why",
      "with",
    ];

    let words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word));

    words = words.slice(0, 3);
    const topic = words.length > 0 ? words.join("_") : "chat";
    return `${topic}_edugen-ai.pdf`;
  };

  const downloadChatAsPdf = () => {
    const lastUserMessage =
      messages
        .slice()
        .reverse()
        .find((msg) => msg.sender === "user")?.text || "default";

    const filename = extractTopicForFilename(lastUserMessage);

    const element = document.createElement("div");
    element.innerHTML = `
      <style>
        .pdf-download-container {
          font-family: Arial, sans-serif;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .pdf-message {
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 8px;
          word-wrap: break-word;
          page-break-inside: avoid;
        }
        .pdf-user-message {
          background-color: #e6f7ff;
          text-align: right;
          color: #000;
          border-left: 4px solid #1890ff;
        }
        .pdf-chatbot-message {
          background-color: #f9f9f9;
          text-align: left;
          color: #000;
          border-left: 4px solid #52c41a;
        }
        .pdf-message-sender {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .pdf-message-content {
          font-size: 13px;
          line-height: 1.5;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
        }
        .pdf-message-content p {
          margin: 8px 0;
          padding: 0;
        }
        .pdf-message-content h1, .pdf-message-content h2, .pdf-message-content h3 {
          margin: 12px 0 8px 0;
          color: #333;
        }
        .pdf-message-content ul, .pdf-message-content ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .pdf-message-content li {
          margin: 4px 0;
        }
        .pdf-message-content code {
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        .pdf-message-content pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 5px;
          overflow-x: auto;
          margin: 8px 0;
        }
        .pdf-message-content blockquote {
          margin: 8px 0;
          padding: 8px 16px;
          background-color: #f0f0f0;
          border-left: 4px solid #ddd;
        }
        .pdf-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #1890ff;
          padding-bottom: 20px;
        }
        .pdf-header h1 {
          color: #1890ff;
          margin: 0;
          font-size: 24px;
        }
        .pdf-header p {
          color: #666;
          margin: 5px 0 0 0;
          font-size: 14px;
        }
        * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
      </style>
      <div class="pdf-download-container">
        <div class="pdf-header">
          <h1>EduGen AI Chat Conversation</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        ${messages
          .map(
            (msg) => `
          <div class="pdf-message ${
            msg.sender === "user" ? "pdf-user-message" : "pdf-chatbot-message"
          }">
            <div class="pdf-message-sender">${
              msg.sender === "user" ? "You" : "EduGen AI"
            }:</div>
            <div class="pdf-message-content">${marked.parse(msg.text)}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    // Improved PDF options for better text selection
    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: "portrait",
        compress: true,
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf().set(opt).from(element).save();
    setShowOptionsForMessage(null);
  };

  const renderMessageContent = (text) => {
    // Configure marked for better rendering
    const renderer = new marked.Renderer();

    // Improve link rendering
    renderer.link = (href, title, text) => {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" title="${
        title || text
      }">${text}</a>`;
    };

    // Improve code block rendering
    renderer.code = (code, language) => {
      return `<pre><code class="language-${
        language || "text"
      }">${code}</code></pre>`;
    };

    // Configure marked options
    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true,
      sanitize: false,
      smartLists: true,
      smartypants: true,
    });

    const parsedContent = marked.parse(text);

    return (
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: parsedContent }}
        style={{
          fontSize: "inherit",
          lineHeight: "inherit",
          wordWrap: "break-word",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          userSelect: "text", // Enable text selection
          WebkitUserSelect: "text",
          MozUserSelect: "text",
          msUserSelect: "text",
        }}
      />
    );
  };

  // Function to toggle full screen mode for mobile
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // UPDATED: Click outside handler to close message options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showOptionsForMessage !== null &&
        !event.target.closest(".message-options") &&
        !event.target.closest(".message-options-overlay")
      ) {
        setShowOptionsForMessage(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptionsForMessage]);

  if (!isVisible || isQuizActive) {
    return null;
  }

  // Chat History View
  if (showHistory) {
    return (
      <div
        className={`
        ${isMobile ? "chat-container-mobile" : "chat-container-desktop"}
        ${!isVisible ? "hidden" : ""}
        ${isInContainer ? "sidebar" : ""}
        ${isMobile && isFullScreen ? "fullscreen-mobile" : ""}
      `}
        style={{
          position: "fixed",
          top: 0,
          left: isMobile ? 0 : "auto",
          right: isMobile ? "auto" : 0,
          width: isMobile ? "100%" : "350px",
          height: "100vh",
          zIndex: isMobile ? 1000 : 999,
          transform: "translateX(0)",
          transition: "all 0.3s ease",
        }}
      >
        <div
          className={isMobile ? "chat-header-mobile" : "chat-header-desktop"}
          style={{
            width: "100%",
            boxSizing: "border-box",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {isMobile ? (
            <>
              <div className="chat-header-left">
                <button
                  className="history-back-btn"
                  onClick={() => setShowHistory(false)}
                  title="Back to chat"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    fontSize: "18px",
                    padding: "8px",
                    cursor: "pointer",
                    borderRadius: "50%",
                    transition: "background-color 0.2s",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
              </div>

              <span className="chat-title-mobile">Chat History</span>

              <div className="chat-header-right">
                <div style={{ width: "36px" }}></div>
              </div>
            </>
          ) : (
            <>
              <button
                className="history-back-btn"
                onClick={() => setShowHistory(false)}
                title="Back to chat"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: "18px",
                  padding: "8px",
                  cursor: "pointer",
                  borderRadius: "50%",
                  transition: "background-color 0.2s",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <span className="chat-title-desktop">Chat History</span>
              <div style={{ width: "40px" }}></div>
            </>
          )}
        </div>

        <div
          className="history-container"
          style={{
            width: "100%",
            height: isMobile ? "calc(100vh - 60px)" : "calc(100vh - 80px)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            className="history-controls"
            style={{
              width: "100%",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <div className="search-container">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="history-search-input"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <i className="fas fa-search search-icon"></i>
            </div>

            {selectedSessions.length > 0 && (
              <div
                className={`delete-controls ${
                  selectedSessions.length > 0 ? "show" : ""
                }`}
              >
                <span className="selected-count">
                  {selectedSessions.length} selected
                </span>
                <button
                  className="delete-selected-btn"
                  onClick={deleteSelectedSessions}
                  title="Delete selected sessions"
                >
                  <i className="fas fa-trash"></i>
                  Delete Selected ({selectedSessions.length})
                </button>
              </div>
            )}
          </div>

          <div
            className="history-list"
            style={{
              flex: 1,
              width: "100%",
              boxSizing: "border-box",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {filteredHistory.length === 0 ? (
              <div className="empty-history">
                <i className="fas fa-comments"></i>
                <p>
                  {searchQuery
                    ? "No conversations found"
                    : "No chat history yet"}
                </p>
                <p>Start a conversation to see it here!</p>
              </div>
            ) : (
              filteredHistory.map((session) => (
                <div
                  key={session.id}
                  className={`history-item ${
                    selectedSessions.includes(session.id) ? "selected" : ""
                  }`}
                  onTouchStart={(e) =>
                    handleHistoryItemTouchStart(e, session.id)
                  }
                  onTouchEnd={handleHistoryItemTouchEnd}
                  onMouseDown={(e) => {
                    // For desktop long press simulation
                    longPressTimeout.current = setTimeout(() => {
                      if (!selectedSessions.includes(session.id)) {
                        setSelectedSessions((prev) => [...prev, session.id]);
                      }
                    }, 500);
                  }}
                  onMouseUp={() => {
                    if (longPressTimeout.current) {
                      clearTimeout(longPressTimeout.current);
                      longPressTimeout.current = null;
                    }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimeout.current) {
                      clearTimeout(longPressTimeout.current);
                      longPressTimeout.current = null;
                    }
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <input
                    type="checkbox"
                    className="session-checkbox"
                    checked={selectedSessions.includes(session.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSessions((prev) => [...prev, session.id]);
                      } else {
                        setSelectedSessions((prev) =>
                          prev.filter((id) => id !== session.id)
                        );
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display:
                        selectedSessions.length > 0 ||
                        selectedSessions.includes(session.id)
                          ? "block"
                          : "none",
                    }}
                  />

                  <div
                    className="history-item-content"
                    onClick={() => handleHistoryItemClick(session)}
                  >
                    <div className="history-item-header">
                      <h4 className="history-title">{session.title}</h4>
                      <span className="history-timestamp">
                        {new Date(session.timestamp).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    <div className="history-item-meta">
                      <span className="message-count">
                        <i className="fas fa-comments"></i>
                        {session.messageCount} messages
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isPdfView) {
    return (
      <div className="pdf-view-container">
        <div className="pdf-view-content">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`pdf-message ${
                msg.sender === "user"
                  ? "pdf-user-message"
                  : "pdf-chatbot-message"
              }`}
              style={{
                userSelect: "text", // Enable text selection in PDF view
                WebkitUserSelect: "text",
                MozUserSelect: "text",
                msUserSelect: "text",
              }}
            >
              <div className="pdf-message-sender">
                {msg.sender === "user" ? "You" : "EduGen AI"}:
              </div>
              <div className="pdf-message-content">
                {renderMessageContent(msg.text)}
              </div>
            </div>
          ))}
          <div className="pdf-back-btn-container">
            <button
              className="pdf-back-btn"
              onClick={() => setIsPdfView(false)}
              title="Back to chat"
            >
              <i className="fas fa-arrow-left"></i> Back to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          ${isMobile ? "chat-container-mobile" : "chat-container-desktop"}
          ${!isVisible ? "hidden" : ""}
          ${isInContainer ? "sidebar" : ""}
          ${isMobile && isFullScreen ? "fullscreen-mobile" : ""}
        `}
      >
        <div
          className={isMobile ? "chat-header-mobile" : "chat-header-desktop"}
        >
          {isMobile ? (
            <>
              <div className="chat-header-left">
                <button
                  className="fullscreen-toggle-btn"
                  onClick={toggleFullScreen}
                  title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  <i
                    className={`fas ${
                      isFullScreen ? "fa-compress-alt" : "fa-expand-alt"
                    }`}
                  ></i>
                </button>
              </div>

              <span className="chat-title-mobile">EduGen AI 🤖</span>

              <div className="chat-header-right">
                <div className="chat-header-actions">
                  <button
                    className="new-chat-btn"
                    onClick={startNewChatConversation}
                    title="Start new conversation"
                  >
                    <i className="fas fa-plus"></i>
                  </button>

                  <button
                    className="history-button-mobile"
                    onClick={handleShowHistory}
                    title="Chat History"
                  >
                    <i className="fas fa-history"></i>
                  </button>

                  <button
                    className="pdf-button-mobile"
                    onClick={downloadChatAsPdf}
                    title="Download PDF"
                  >
                    <i className="fas fa-file-pdf"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="chat-title-desktop">EduGen AI 🤖</span>

              <div className="chat-header-actions">
                <button
                  className="new-chat-btn"
                  onClick={startNewChatConversation}
                  title="Start new conversation"
                >
                  <i className="fas fa-plus"></i>
                </button>

                <button
                  className="history-button-desktop"
                  onClick={handleShowHistory}
                  title="Chat History"
                >
                  <i className="fas fa-history"></i>
                </button>

                <button
                  className="pdf-button-desktop"
                  onClick={downloadChatAsPdf}
                  title="Download PDF"
                >
                  <i className="fas fa-file-pdf"></i>
                </button>
              </div>
            </>
          )}
        </div>

        <div
          ref={chatBoxRef}
          className={isMobile ? "chat-box-mobile" : "chat-box-desktop"}
          style={{
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${
                message.sender === "user"
                  ? isMobile
                    ? "user-message-mobile"
                    : "user-message-desktop"
                  : isMobile
                  ? "bot-message-mobile"
                  : "bot-message-desktop"
              } ${
                isSpeaking && showOptionsForMessage === index ? "speaking" : ""
              }`}
              onContextMenu={(e) => handleRightClick(e, index, message)}
              onClick={(e) => handleMessageClick(e, index, message)}
              style={{
                cursor: message.sender === "bot" ? "pointer" : "default",
                position: "relative",
                zIndex: showOptionsForMessage === index ? 1 : "auto",
                maxWidth:
                  message.sender === "bot" ? (isMobile ? "90%" : "85%") : "80%",
                minWidth: message.sender === "bot" ? "150px" : "auto",
                wordWrap: "break-word",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                animation: "fadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: "translateZ(0)", // Hardware acceleration
                userSelect: "text", // Enable text selection
                WebkitUserSelect: "text",
                MozUserSelect: "text",
                msUserSelect: "text",
              }}
            >
              {renderMessageContent(message.text)}
            </div>
          ))}
          {isLoading && (
            <div className={isMobile ? "loading-mobile" : "loading-desktop"}>
              <span
                style={{
                  display: "inline-block",
                  animation: "bounce 1.4s infinite ease-in-out both",
                }}
              >
                ●
              </span>
              <span
                style={{
                  display: "inline-block",
                  animation: "bounce 1.4s infinite ease-in-out both 0.16s",
                }}
              >
                ●
              </span>
              <span
                style={{
                  display: "inline-block",
                  animation: "bounce 1.4s infinite ease-in-out both 0.32s",
                }}
              >
                ●
              </span>
              <span style={{ marginLeft: "8px" }}>
                EduGen AI is thinking...
              </span>
            </div>
          )}
        </div>

        <div className={isMobile ? "chat-input-mobile" : "chat-input-desktop"}>
          <div
            className={
              isMobile ? "input-wrapper-mobile" : "input-wrapper-desktop"
            }
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className={
                isMobile
                  ? "chat-input-field-mobile"
                  : "chat-input-field-desktop"
              }
            />
          </div>
          <button
            className={`${isMobile ? "mic-btn-mobile" : "mic-btn-desktop"} ${
              isListening ? "listening" : ""
            }`}
            onClick={handleSpeechToText}
            title={isListening ? "Stop listening" : "Voice input"}
            disabled={isLoading}
          >
            <i
              className={`fas ${isListening ? "fa-stop" : "fa-microphone"}`}
            ></i>
          </button>
          <button
            className={isMobile ? "send-btn-mobile" : "send-btn-desktop"}
            onClick={sendMessage}
            disabled={isLoading}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      {showOptionsForMessage !== null && (
        <div
          className="message-options-overlay"
          onClick={() => setShowOptionsForMessage(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="message-options"
            style={{
              position: "fixed",
              left: `${optionsPosition.x}px`,
              top: `${optionsPosition.y}px`,
              zIndex: 10000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() =>
                handleReadAloud(messages[showOptionsForMessage].text)
              }
            >
              <i className="fas fa-volume-up"></i>
              <span>Read Aloud</span>
            </button>

            <button onClick={handleCopyText}>
              <i className="fas fa-copy"></i>
              <span>{selectedText ? "Copy Selected Text" : "Copy Text"}</span>
            </button>

            <button onClick={handlePdfView}>
              <i className="fas fa-file-pdf"></i>
              <span>View PDF</span>
            </button>

            {isSpeaking && (
              <button onClick={handleStopAudio}>
                <i className="fas fa-stop"></i>
                <span>Stop Audio</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
