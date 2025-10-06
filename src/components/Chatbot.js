import React, { useState, useEffect, useRef } from "react";
import "../styles/Chat.css";
import "../styles/ChatMobile.css";
import html2pdf from "html2pdf.js";

// =============== BACKEND CONFIGURATION ===============
// Backend URLs for different modes with fallback support
const BACKEND_URLS = {
  // Primary backend (Node.js) - fallback to Python backend if quota reached
  STUDY_MODE_PRIMARY:
    process.env.NODE_ENV === "production"
      ? "https://edugen-backend-zbjr.onrender.com/api/chat"
      : "http://localhost:10000/api/chat",
  STUDY_MODE_FALLBACK: "https://edugen-ai-backend.onrender.com/api/chat",

  // Quiz generation with fallback support
  QUIZ_PRIMARY:
    process.env.NODE_ENV === "production"
      ? "https://edugen-backend-zbjr.onrender.com/api/generate-quiz"
      : "http://localhost:10000/api/generate-quiz",
  QUIZ_FALLBACK: "https://edugen-ai-backend.onrender.com/api/generate-quiz",

  // Talk Mode uses Python backend
  TALK_MODE: "https://edugen-ai-backend.onrender.com/api/chat",

  // Talk Mode Additional Endpoints
  SPEECH_TO_TEXT: "https://edugen-ai-backend.onrender.com/api/speech-to-text",
  TEXT_TO_SPEECH: "https://edugen-ai-backend.onrender.com/api/text-to-speech",
};
// =====================================================

// Helper function to handle API calls with fallback logic
const makeAPICallWithFallback = async (
  primaryUrl,
  fallbackUrl,
  requestBody,
  controller
) => {
  let lastError = null;

  // Try primary backend first (Node.js)
  try {
    console.log(`Attempting primary backend: ${primaryUrl}`);
    const response = await fetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    // If quota reached (429) or server error (5xx), try fallback
    if (response.status === 429 || response.status >= 500) {
      console.log(
        `Primary backend failed with status ${response.status}, trying fallback...`
      );
      throw new Error(`Primary backend failed: ${response.status}`);
    }

    // If other client errors (4xx), don't try fallback
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return response;
  } catch (error) {
    lastError = error;
    console.log(`Primary backend failed: ${error.message}`);

    // Don't try fallback for AbortError or client errors (except 429)
    if (error.name === "AbortError") {
      throw error;
    }
  }

  // Try fallback backend (Python)
  try {
    console.log(`Attempting fallback backend: ${fallbackUrl}`);
    const response = await fetch(fallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Fallback server error: ${response.status}`
      );
    }

    return response;
  } catch (error) {
    console.log(`Fallback backend also failed: ${error.message}`);
    // If fallback also fails, throw the last error
    throw lastError || error;
  }
};

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
      text: "Hi! I'm EduGen AI. Use Study Mode for detailed answers or Talk Mode for quick chats.",
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

  // Mode selection states
  const [currentMode, setCurrentMode] = useState("study");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [backendStatus, setBackendStatus] = useState({
    study: "unknown",
    talk: "unknown",
  });

  // NEW: State for handling file uploads
  const [file, setFile] = useState(null); // { name: string, data: base64 string }
  const fileInputRef = useRef(null);

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
  const textareaRef = useRef(null);
  const longPressTimeout = useRef(null);
  const synth = useRef(window.speechSynthesis);
  const recognition = useRef(null);

  // Function to check backend health
  const checkBackendHealth = async () => {
    const checkHealth = async (url, mode) => {
      try {
        const response = await fetch(url, {
          method: "GET",
          timeout: 5000,
        });
        return response.ok ? "online" : "offline";
      } catch (error) {
        return "offline";
      }
    };

    const studyHealth = await checkHealth(
      process.env.NODE_ENV === "production"
        ? "https://edugen-backend-zbjr.onrender.com/api/health"
        : "http://localhost:10000/api/health",
      "study"
    );
    const talkHealth = await checkHealth(
      "https://edugen-ai-backend.onrender.com/api/health",
      "talk"
    );

    setBackendStatus({ study: studyHealth, talk: talkHealth });
  };

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

  // Check backend health on component mount
  useEffect(() => {
    checkBackendHealth();
    // Recheck every 5 minutes
    const interval = setInterval(checkBackendHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      // Set initial height
      if (input === "") {
        textareaRef.current.style.height = "44px";
        textareaRef.current.style.overflowY = "hidden";
      } else {
        autoResizeTextarea();
      }
    }
  }, [input]);

  // Set initial textarea height on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.style.overflowY = "hidden";
    }
  }, []);

  // Function to handle file selection for multiple file types
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Get file extension
      const fileExtension = selectedFile.name.toLowerCase().split(".").pop();

      // Define allowed file types
      const allowedTypes = [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "mp4",
        "avi",
        "mov",
        "wmv",
        "flv",
        "mp3",
        "wav",
        "flac",
        "aac",
        "txt",
        "zip",
        "rar",
        "7z",
        "js",
        "html",
        "css",
        "py",
        "java",
        "cpp",
        "c",
      ];

      if (!allowedTypes.includes(fileExtension)) {
        alert(
          `File type ".${fileExtension}" is not supported. Please upload one of these file types: ${allowedTypes.join(
            ", "
          )}.`
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFile({
          name: selectedFile.name,
          data: event.target.result, // This will be the base64 string
          type: fileExtension,
        });
        // Automatically switch to talk mode when a file is uploaded
        setCurrentMode("talk");
        alert(
          `� File "${selectedFile.name}" attached successfully! You can now ask questions about it or request an analysis.`
        );
      };
      reader.onerror = (err) => {
        console.error("File reading error:", err);
        alert("Sorry, there was an error reading your file.");
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Function to auto-resize textarea based on content
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Temporarily set height to auto to get accurate scrollHeight
      textarea.style.height = "auto";

      // Get the actual content height
      const scrollHeight = textarea.scrollHeight;

      // Set minimum height for one line and maximum height
      const minHeight = 44;
      const maxHeight = 160;

      // If textarea is empty or has minimal content, use minimum height
      if (textarea.value.trim() === "" || scrollHeight <= minHeight) {
        textarea.style.height = minHeight + "px";
        textarea.style.overflowY = "hidden";
      } else {
        // Calculate new height based on content
        const newHeight = Math.min(scrollHeight, maxHeight);
        textarea.style.height = newHeight + "px";

        // Show scrollbar only when content exceeds max height
        if (scrollHeight > maxHeight) {
          textarea.style.overflowY = "auto";
        } else {
          textarea.style.overflowY = "hidden";
        }
      }
    }
  };

  // Handle input change with auto-resize
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInput(newValue);

    // Use requestAnimationFrame for smoother resizing
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        autoResizeTextarea();
      }
    });
  };

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();

    // Check for time/date related queries
    if (
      lowerInput.includes("time") ||
      lowerInput.includes("date") ||
      lowerInput.includes("today") ||
      lowerInput.includes("now") ||
      lowerInput.includes("current time") ||
      lowerInput.includes("current date") ||
      lowerInput.includes("what time is it") ||
      lowerInput.includes("what's the time") ||
      lowerInput.includes("what date is it") ||
      lowerInput.includes("what's the date")
    ) {
      const now = new Date();
      const formatted = now.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
        timeZoneName: "short",
      });
      return `📅 **Current Date and Time**\n\n🕐 ${formatted}`;
    }

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

    // Keep only essential, non-link based quick responses

    return null;
  };

  const isRequestingRef = useRef(false);

  const sendMessage = async () => {
    if (!input.trim() && !file) return;

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

    const userMessageText = input.trim();
    const userMessage = {
      sender: "user",
      text: userMessageText,
      file: file
        ? {
            name: file.name,
            data: file.data,
            type: file.name.endsWith(".pdf") ? "pdf" : "docx",
          }
        : null,
    };

    // Display the user's message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Reset textarea height after clearing input
    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.style.overflowY = "hidden";
    }

    setIsLoading(true);

    // Mark as no longer a new session once user sends first message
    if (isNewSession) {
      setIsNewSession(false);
    }

    if (onMessageSent) {
      onMessageSent();
    }

    const quickResponse = getQuickResponse(userMessage.text);
    if (quickResponse && !file) {
      setMessages((prev) => [...prev, { sender: "bot", text: quickResponse }]);
      setIsLoading(false);
      return;
    }

    isRequestingRef.current = true;
    const lockTimeout = setTimeout(() => {
      isRequestingRef.current = false;
    }, 10000);

    // --- ARCHITECTURE SPLIT LOGIC WITH FALLBACK + PDF SUPPORT ---
    const talkApiUrl = BACKEND_URLS.TALK_MODE; // Python server for Talk Mode

    let primaryUrl, fallbackUrl;
    let requestBody;

    // Use different backends based on mode and file presence
    if (file) {
      // NEW: PDF/File handling - always use Python backend
      primaryUrl = talkApiUrl;
      fallbackUrl = null;
      requestBody = {
        message: userMessageText,
        fileData: file.data,
        filename: file.name,
      };
      // Clear the file after attaching to message and preparing the request
      setFile(null);
    } else if (currentMode === "study") {
      // Study mode uses Node.js backend with Python fallback (UNCHANGED)
      primaryUrl = BACKEND_URLS.STUDY_MODE_PRIMARY;
      fallbackUrl = BACKEND_URLS.STUDY_MODE_FALLBACK;
      requestBody = {
        message: userMessageText,
        mode: "study",
      };
    } else {
      // Talk mode uses Python backend (UNCHANGED)
      primaryUrl = talkApiUrl;
      fallbackUrl = null;
      requestBody = {
        message: userMessageText,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      let response;

      // Use fallback logic for study mode, direct call for others
      if (fallbackUrl) {
        response = await makeAPICallWithFallback(
          primaryUrl,
          fallbackUrl,
          requestBody,
          controller
        );
      } else {
        response = await fetch(primaryUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
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
          isRequestingRef.current = false;
          clearTimeout(lockTimeout);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }
      }

      clearTimeout(timeoutId);

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
    // Don't handle click if user clicked on a link
    if (e.target.tagName === "A" || e.target.closest("a")) {
      return;
    }

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
        text: "Hi! I'm EduGen AI. Use Study Mode for detailed answers or Talk Mode for quick chats.",
      },
    ]);
    setCurrentSessionId(null); // Reset current session ID for new chat
    setIsNewSession(true); // Mark as new session
    setShowHistory(false);
    setSelectedSessions([]);
    setSearchQuery("");
    setFile(null); // Clear any attached file
  };

  // Filter chat history based on search query
  const filteredHistory = chatHistory.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some((msg) =>
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleReadAloud = async (text) => {
    if (synth.current.speaking) {
      synth.current.cancel();
    }

    // Use Python backend for talk mode, browser synthesis for study mode
    if (currentMode === "talk") {
      try {
        setIsSpeaking(true);
        const response = await fetch(BACKEND_URLS.TEXT_TO_SPEECH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const data = await response.json();
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => {
            setIsSpeaking(false);
            console.error("Audio playback failed");
          };
          await audio.play();
        } else {
          throw new Error("TTS request failed");
        }
      } catch (error) {
        console.error("Text-to-speech error:", error);
        setIsSpeaking(false);
        // Fallback to browser TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        synth.current.speak(utterance);
      }
    } else {
      // Use browser TTS for study mode
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      synth.current.speak(utterance);
    }
    setShowOptionsForMessage(null);
  };

  const handleStopAudio = () => {
    if (synth.current.speaking) {
      synth.current.cancel();
      setIsSpeaking(false);
    }

    // Also stop any HTML5 audio elements (from backend TTS)
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    setIsSpeaking(false);
    setShowOptionsForMessage(null);
  };

  const handleSpeechToText = async () => {
    // For talk mode, use advanced speech recognition with backend
    if (currentMode === "talk") {
      if (isListening) {
        setIsListening(false);
        return;
      }

      try {
        setIsListening(true);

        // Get audio from user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "audio.webm");

          try {
            const response = await fetch(BACKEND_URLS.SPEECH_TO_TEXT, {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              setInput(data.text);
            } else {
              throw new Error("Speech recognition failed");
            }
          } catch (error) {
            console.error("Speech-to-text error:", error);
            alert("Speech recognition failed. Please try again.");
          } finally {
            setIsListening(false);
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        // Record for 5 seconds or until user clicks stop
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, 5000);
      } catch (error) {
        console.error("Microphone access error:", error);
        setIsListening(false);
        alert("Could not access microphone. Please check permissions.");
      }
    } else {
      // Use browser speech recognition for study mode
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

    // NOTE: Uses a custom markdown parser here instead of the 'marked' library
    // to ensure consistency with the chat view.
    const renderContentForPdf = (text) => {
      // This is a simplified version of the main renderMessageContent logic
      let html = text;

      // Basic markdown conversions
      html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"); // Bold
      html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>"); // Italic
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>'); // Markdown links
      html = html.replace(
        /([A-Za-z0-9 \-._,&:]{1,200}?)\s*\((https?:\/\/[^\s)]+)\)/g,
        (match, textPart, url) => {
          if (/^\[.*\]\(|<a\s+/i.test(match)) return match;
          return `<a href="${url}">${textPart.trim()}</a>`;
        }
      ); // Text (URL) links
      html = html.replace(
        /(?<!href="|">)(https?:\/\/[^\s<>"]+)(?!<\/a>)/g,
        '<a href="$1">$1</a>'
      ); // Standalone URLs
      html = html.replace(/\n/g, "<br>"); // Line breaks

      return html;
    };

    const element = document.createElement("div");
    element.innerHTML = `
      <style>
        .pdf-download-container { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333; }
        .pdf-message { margin-bottom: 15px; padding: 12px; border-radius: 8px; word-wrap: break-word; page-break-inside: avoid; }
        .pdf-user-message { background-color: #e6f7ff; text-align: right; color: #000; border-left: 4px solid #1890ff; }
        .pdf-chatbot-message { background-color: #f9f9f9; text-align: left; color: #000; border-left: 4px solid #52c41a; }
        .pdf-message-sender { font-weight: bold; margin-bottom: 8px; font-size: 14px; }
        .pdf-message-content { font-size: 13px; line-height: 1.5; user-select: text; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; }
        .pdf-message-content p { margin: 8px 0; padding: 0; }
        .pdf-message-content h1, .pdf-message-content h2, .pdf-message-content h3 { margin: 12px 0 8px 0; color: #333; }
        .pdf-message-content ul, .pdf-message-content ol { margin: 8px 0; padding-left: 20px; }
        .pdf-message-content li { margin: 4px 0; }
        .pdf-message-content code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
        .pdf-message-content pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; margin: 8px 0; }
        .pdf-message-content blockquote { margin: 8px 0; padding: 8px 16px; background-color: #f0f0f0; border-left: 4px solid #ddd; }
        .pdf-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1890ff; padding-bottom: 20px; }
        .pdf-header h1 { color: #1890ff; margin: 0; font-size: 24px; }
        .pdf-header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
        * { user-select: text !important; -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; }
        a { color: #1890ff; text-decoration: underline; }
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
            <div class="pdf-message-content">${renderContentForPdf(
              msg.text
            )}</div>
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

  // --- IMPROVED FUNCTION ---
  const renderMessageContent = (text) => {
    // Simple and reliable markdown-to-HTML converter
    const processMarkdown = (str) => {
      // First, protect existing HTML links from being double-processed
      const protectedLinks = [];
      str = str.replace(/<a[^>]*>.*?<\/a>/g, (match, offset) => {
        protectedLinks.push(match);
        return `__PROTECTED_LINK_${protectedLinks.length - 1}__`;
      });

      // Convert markdown links [text](url) to HTML links
      str = str.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // Convert patterns like: Name (https://example.com) => <a href="https://example.com">Name</a>
      // This makes plain-text mentions with parenthesized URLs clickable using the preceding text as link text.
      str = str.replace(
        /([A-Za-z0-9 \-._,&:()'"\s]{1,200}?)\s*\((https?:\/\/[^\s)]+)\)/g,
        (match, textPart, url) => {
          // Avoid converting if it's already a markdown-style link or HTML anchor
          if (/^\[.*\]\(|<a\s+/i.test(match)) return match;
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${textPart.trim()}</a>`;
        }
      );

      // Convert standalone URLs to clickable links (avoid double linking)
      str = str.replace(
        /(?<!href="|">)(https?:\/\/[^\s<>"]+)(?!<\/a>)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
      );

      // Convert **bold** text
      str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Convert *italic* text (but not ** which we already handled)
      str = str.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

      // Convert line breaks to <br> but preserve paragraph structure
      str = str.replace(/\n\n+/g, "</p><p>");
      str = str.replace(/\n/g, "<br>");

      // Wrap in paragraph tags if not already wrapped
      if (!str.startsWith("<p>")) {
        str = "<p>" + str + "</p>";
      }

      // Convert bullet points (• or -)
      str = str.replace(/^[•-]\s*(.+)$/gm, "<li>$1</li>");

      // Wrap consecutive list items in <ul> and remove from paragraphs
      str = str.replace(/<p>(<li>.*?<\/li>)<\/p>/gs, "<ul>$1</ul>");
      str = str.replace(/(<li>.*<\/li>)(?=\s*<li>)/gs, (match) => {
        return match.replace(/<\/li>\s*<li>/g, "</li><li>");
      });

      // Clean up any remaining isolated list items
      str = str.replace(/(<li>.*?<\/li>)(?!\s*<li>|<\/ul>)/gs, "<ul>$1</ul>");

      // Restore protected links
      protectedLinks.forEach((link, index) => {
        str = str.replace(`__PROTECTED_LINK_${index}__`, link);
      });

      return str;
    };

    const htmlContent = processMarkdown(text);

    // Ensure anchor tags open in a new tab and are safe
    const patchedHtml = htmlContent.replace(
      /<a\s+([^>]*?)>/gi,
      (match, attrs) => {
        if (/target=/i.test(attrs) || /rel=/i.test(attrs)) return match;
        return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
      }
    );

    return (
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: patchedHtml }}
        onClick={(e) => {
          // If an anchor (or child of one) was clicked, let it handle the navigation naturally
          let node = e.target;
          while (node && node.nodeType === 1 && node.tagName !== "A") {
            node = node.parentElement;
          }
          if (node && node.tagName === "A" && node.href) {
            // Let the link handle navigation naturally - don't prevent default
            e.stopPropagation(); // Only stop propagation to prevent message click handler
            return; // Let the browser handle the link click naturally
          }
        }}
        style={{
          fontSize: "inherit",
          lineHeight: "inherit",
          wordWrap: "break-word",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          userSelect: "text",
          WebkitUserSelect: "text",
          MozUserSelect: "text",
          msUserSelect: "text",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => {
          // Prevent text selection on links to avoid cursor blinking
          let node = e.target;
          while (node && node.nodeType === 1 && node.tagName !== "A") {
            node = node.parentElement;
          }
          if (node && node.tagName === "A") {
            e.preventDefault();
          }
        }}
      />
    );
  };

  // File display component for any file format
  const renderFileDisplay = (fileData) => {
    if (!fileData) return null;

    // Function to get file icon and color based on file type
    const getFileTypeInfo = (filename, type) => {
      const extension = filename.toLowerCase().split(".").pop();

      switch (extension) {
        case "pdf":
          return {
            icon: "fas fa-file-pdf",
            color: "#d63031",
            name: "PDF Document",
          };
        case "doc":
        case "docx":
          return {
            icon: "fas fa-file-word",
            color: "#2b5797",
            name: "Word Document",
          };
        case "xls":
        case "xlsx":
          return {
            icon: "fas fa-file-excel",
            color: "#217346",
            name: "Excel Spreadsheet",
          };
        case "ppt":
        case "pptx":
          return {
            icon: "fas fa-file-powerpoint",
            color: "#d24726",
            name: "PowerPoint Presentation",
          };
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "bmp":
        case "webp":
          return {
            icon: "fas fa-file-image",
            color: "#6c5ce7",
            name: "Image File",
          };
        case "mp4":
        case "avi":
        case "mov":
        case "wmv":
        case "flv":
          return {
            icon: "fas fa-file-video",
            color: "#e84393",
            name: "Video File",
          };
        case "mp3":
        case "wav":
        case "flac":
        case "aac":
          return {
            icon: "fas fa-file-audio",
            color: "#fd79a8",
            name: "Audio File",
          };
        case "txt":
          return {
            icon: "fas fa-file-alt",
            color: "#636e72",
            name: "Text File",
          };
        case "zip":
        case "rar":
        case "7z":
          return {
            icon: "fas fa-file-archive",
            color: "#a29bfe",
            name: "Archive File",
          };
        case "js":
        case "html":
        case "css":
        case "py":
        case "java":
        case "cpp":
        case "c":
          return {
            icon: "fas fa-file-code",
            color: "#00b894",
            name: "Code File",
          };
        default:
          return { icon: "fas fa-file", color: "#74b9ff", name: "File" };
      }
    };

    const fileInfo = getFileTypeInfo(fileData.name, fileData.type);

    return (
      <div className="file-attachment">
        <div className="file-header">
          <i
            className={fileInfo.icon}
            style={{
              color: fileInfo.color,
              marginRight: "12px",
              fontSize: "24px",
            }}
          ></i>
          <div className="file-info">
            <div className="file-name">{fileData.name}</div>
            <div className="file-type">{fileInfo.name}</div>
          </div>
        </div>
        <div className="file-preview">
          <div className="file-icon-large">
            <i
              className={fileInfo.icon}
              style={{ color: fileInfo.color, fontSize: "64px" }}
            ></i>
          </div>
          <div className="file-details">
            <p>📎 File attached successfully</p>
            <small>File ready for analysis</small>
          </div>
        </div>
      </div>
    );
  };

  // Function to toggle full screen mode for mobile
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // Mode selector functions
  const handleModeToggle = () => {
    setShowModeSelector(!showModeSelector);
  };

  const handleModeSelect = (mode) => {
    setCurrentMode(mode);
    setShowModeSelector(false);

    // Show a brief notification when switching to talk mode
    if (mode === "talk" && backendStatus.talk === "online") {
      const notification = document.createElement("div");
      notification.innerHTML =
        "🎤 Talk Mode activated! Advanced speech features enabled.";
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
      `;

      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-in";
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 3000);
    }
  };

  // Auto-detect if content is from task and set to study mode
  useEffect(() => {
    if (copiedTopic && currentMode !== "study") {
      setCurrentMode("study");
    }
  }, [copiedTopic]);

  // UPDATED: Click outside handler to close message options and mode selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showOptionsForMessage !== null &&
        !event.target.closest(".message-options") &&
        !event.target.closest(".message-options-overlay")
      ) {
        setShowOptionsForMessage(null);
      }
      if (
        showModeSelector &&
        !event.target.closest(".mode-selector-dropdown") &&
        !event.target.closest(".mode-selector-dropdown-mobile") &&
        !event.target.closest(".mode-toggle-btn-inside") &&
        !event.target.closest(".mode-toggle-inside-mobile")
      ) {
        setShowModeSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptionsForMessage, showModeSelector]);

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
                {msg.file && renderFileDisplay(msg.file)}
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
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
          
          /* Ensure links in chat messages are properly styled and clickable */
          .message-content a {
            color: #1890ff !important;
            text-decoration: underline !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            z-index: 999 !important;
            position: relative !important;
          }
          
          .message-content a:hover {
            color: #40a9ff !important;
            text-decoration: underline !important;
          }
          
          .message-content a:visited {
            color: #722ed1 !important;
          }
          
          /* Ensure message content allows pointer events */
          .message-content {
            pointer-events: auto !important;
          }
          
          /* Ensure messages don't block link clicks */
          .message {
            pointer-events: auto !important;
          }
          
          .bot-message-mobile, .bot-message-desktop {
            pointer-events: auto !important;
          }
        `}
      </style>
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
              {message.file && renderFileDisplay(message.file)}
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

        {/* File Upload Indicator */}
        {file && (
          <div
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, #e3f2fd, #f3e5f5)",
              borderLeft: "4px solid #2196F3",
              margin: "0 16px 8px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              color: "#1976d2",
              boxShadow: "0 2px 8px rgba(33, 150, 243, 0.2)",
            }}
          >
            <i
              className="fas fa-file-pdf"
              style={{
                color: "#d32f2f",
                fontSize: "16px",
              }}
            ></i>
            <span style={{ fontWeight: "500" }}>📎 {file.name} attached</span>
            <button
              onClick={() => setFile(null)}
              style={{
                background: "none",
                border: "none",
                color: "#757575",
                cursor: "pointer",
                marginLeft: "auto",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#ffebee";
                e.target.style.color = "#d32f2f";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "none";
                e.target.style.color = "#757575";
              }}
              title="Remove attachment"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        <div className={isMobile ? "chat-input-mobile" : "chat-input-desktop"}>
          <div
            className={
              isMobile ? "input-wrapper-mobile" : "input-wrapper-desktop"
            }
            style={{ position: "relative" }}
          >
            <button
              className={
                isMobile
                  ? "mode-toggle-inside-mobile"
                  : "mode-toggle-btn-inside"
              }
              onClick={handleModeToggle}
              title="Select Mode"
              style={
                isMobile
                  ? {}
                  : {
                      position: "absolute",
                      left: "10px",
                      top: "30%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: currentMode === "study" ? "#4CAF50" : "#2196F3",
                      cursor: "pointer",
                      fontSize: "16px",
                      zIndex: 10,
                      padding: "0",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }
              }
            >
              <i className="fas fa-plus"></i>
            </button>

            {/* NEW: File Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".pdf,.docx"
            />
            <button
              className={`${
                isMobile ? "attach-btn-mobile" : "attach-btn-desktop"
              }${file ? " file-attached" : ""}`}
              onClick={() => fileInputRef.current.click()}
              title="Attach PDF or DOCX"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                position: "absolute",
                left: isMobile ? "45px" : "45px",
                top: "30%",
                transform: "translateY(-50%)",
                fontSize: "16px",
                color: file ? "#2196F3" : "#000000", // Black when no file, blue when file attached
                zIndex: 10,
                padding: "0",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-paperclip"></i>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onInput={() => {
                // Handle real-time input changes for better responsiveness
                requestAnimationFrame(() => {
                  if (textareaRef.current) {
                    autoResizeTextarea();
                  }
                });
              }}
              onKeyDown={(e) => {
                // Handle backspace and delete for immediate resize
                if (e.key === "Backspace" || e.key === "Delete") {
                  setTimeout(() => {
                    if (textareaRef.current) {
                      autoResizeTextarea();
                    }
                  }, 0);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                file
                  ? `Ask about ${file.name}`
                  : currentMode === "study"
                  ? "Type your message... (Study Mode - Detailed answers)"
                  : "Type your message... (Talk Mode - Quick chat with advanced speech)"
              }
              className={
                isMobile
                  ? "chat-input-field-mobile"
                  : "chat-input-field-desktop"
              }
              style={{
                paddingLeft: isMobile ? "75px" : "75px", // Increased padding for both icons
                resize: "none", // Disable manual resize
                overflow: "hidden", // Hide scrollbar during auto-resize
              }}
              rows={1}
            />
          </div>

          {/* Mode Selector Dropdown - Outside input wrapper */}
          {showModeSelector && (
            <div
              className={
                isMobile
                  ? "mode-selector-dropdown-mobile"
                  : "mode-selector-dropdown"
              }
              style={{
                position: "absolute",
                bottom: "100%",
                left: isMobile ? "16px" : "10px",
                backgroundColor: "white",
                border: "2px solid #667eea",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                zIndex: 3000,
                minWidth: isMobile ? "200px" : "180px",
                marginBottom: "8px",
                overflow: "hidden",
              }}
            >
              <div
                className={`${
                  isMobile ? "mode-option-mobile study-mode" : "mode-option"
                } ${currentMode === "study" ? "active" : ""}`}
                onClick={() => handleModeSelect("study")}
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  backgroundColor:
                    currentMode === "study" ? "#f0f8ff" : "transparent",
                  color: currentMode === "study" ? "#4CAF50" : "#333",
                  fontSize: "14px",
                  fontWeight: currentMode === "study" ? "bold" : "normal",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.3s ease",
                }}
              >
                <i
                  className="fas fa-graduation-cap"
                  style={{ color: "#4CAF50", fontSize: "16px" }}
                ></i>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <span style={{ fontWeight: "600" }}>Study Mode</span>
                  <small style={{ color: "#666", fontSize: "12px" }}>
                    Detailed answers • Browser speech
                    <span
                      style={{
                        color:
                          backendStatus.study === "online"
                            ? "#4CAF50"
                            : "#ff5722",
                        marginLeft: "4px",
                      }}
                    >
                      ●{" "}
                      {backendStatus.study === "online" ? "Online" : "Offline"}
                    </span>
                  </small>
                </div>
                {currentMode === "study" && (
                  <i
                    className="fas fa-check"
                    style={{ marginLeft: "auto", color: "#4CAF50" }}
                  ></i>
                )}
              </div>

              <div
                className={`${
                  isMobile ? "mode-option-mobile talk-mode" : "mode-option"
                } ${currentMode === "talk" ? "active" : ""}`}
                onClick={() => handleModeSelect("talk")}
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  backgroundColor:
                    currentMode === "talk" ? "#f0f8ff" : "transparent",
                  color: currentMode === "talk" ? "#2196F3" : "#333",
                  fontSize: "14px",
                  fontWeight: currentMode === "talk" ? "bold" : "normal",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.3s ease",
                }}
              >
                <i
                  className="fas fa-comments"
                  style={{ color: "#2196F3", fontSize: "16px" }}
                ></i>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <span style={{ fontWeight: "600" }}>Talk Mode</span>
                  <small style={{ color: "#666", fontSize: "12px" }}>
                    Quick responses • Advanced speech AI
                    <span
                      style={{
                        color:
                          backendStatus.talk === "online"
                            ? "#4CAF50"
                            : "#ff5722",
                        marginLeft: "4px",
                      }}
                    >
                      ● {backendStatus.talk === "online" ? "Online" : "Offline"}
                    </span>
                  </small>
                </div>
                {currentMode === "talk" && (
                  <i
                    className="fas fa-check"
                    style={{ marginLeft: "auto", color: "#2196F3" }}
                  ></i>
                )}
              </div>
            </div>
          )}

          <button
            className={`${isMobile ? "mic-btn-mobile" : "mic-btn-desktop"} ${
              isListening ? "listening" : ""
            } ${currentMode === "talk" ? "talk-mode" : ""}`}
            onClick={handleSpeechToText}
            title={
              isListening
                ? "Stop listening"
                : currentMode === "talk"
                ? "Voice input (Advanced - Talk Mode)"
                : "Voice input (Browser - Study Mode)"
            }
            disabled={isLoading}
            style={{
              backgroundColor: currentMode === "talk" ? "#2196F3" : "",
              color: currentMode === "talk" ? "white" : "",
            }}
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
