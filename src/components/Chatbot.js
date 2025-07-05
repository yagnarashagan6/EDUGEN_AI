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
  const [isPdfView, setIsPdfView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // State to manage mobile full screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      // If switching from mobile to desktop, exit full screen
      if (window.innerWidth > 768 && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullScreen]); // Depend on isFullScreen to re-evaluate on resize

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

    window.addEventListener("popstate", handleBackButton);
    return () => window.removeEventListener("popstate", handleBackButton);
  }, [isPdfView]);

  const getQuickResponse = (question) => {
    const lowerInput = question.toLowerCase();
    if (
      lowerInput.includes("coxco") ||
      lowerInput.includes("agni student portal")
    ) {
      return "Access the Agni Student Portal: https://coe.act.edu.in/students/";
    }
    if (
      lowerInput.includes("gamma ai") ||
      lowerInput.includes("presentation ai") ||
      lowerInput.includes("ppt ai")
    ) {
      return "Try Gamma AI for presentations: https://gamma.app/";
    }
    if (lowerInput.includes("pdf")) {
      return "Use this PDF tool: https://www.ilovepdf.com/";
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const quickResponse = getQuickResponse(userMessage.text);
    if (quickResponse) {
      setMessages((prev) => [...prev, { sender: "bot", text: quickResponse }]);
      setIsLoading(false);
      return;
    }

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
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && !isLoading) {
      sendMessage();
    }
  };

  const handleLongPressStart = (index) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
    longPressTimeout.current = setTimeout(() => {
      setShowOptionsForMessage(index);
    }, 500);
  };

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handleRightClick = (e, index, message) => {
    e.preventDefault();
    if (message.sender === "bot") {
      setShowOptionsForMessage(index);
    }
  };

  const handleMessageClick = (index, message) => {
    if (message.sender === "bot") {
      setShowOptionsForMessage(showOptionsForMessage === index ? null : index);
    }
  };

  const handlePdfView = () => {
    setIsPdfView(true);
    setShowOptionsForMessage(null);
    window.history.pushState({}, "");
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

  const extractTopicForFilename = (text) => {
    // Common stop words to remove
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
    // Split the text into words, remove stop words, and clean
    let words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // Remove special characters
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word));

    // Take up to 3 words to keep filename concise
    words = words.slice(0, 3);

    // Join words with underscores and ensure non-empty
    const topic = words.length > 0 ? words.join("_") : "chat";
    return `${topic}_edugen-ai.pdf`;
  };

  const downloadChatAsPdf = () => {
    // Find the last user message to use as the topic
    const lastUserMessage =
      messages
        .slice()
        .reverse()
        .find((msg) => msg.sender === "user")?.text || "default";

    // Generate filename based on the last user message
    const filename = extractTopicForFilename(lastUserMessage);

    const element = document.createElement("div");
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

    html2pdf().from(element).set({ filename }).save();
    setShowOptionsForMessage(null);
  };

  const renderMessageContent = (text) => {
    return <div dangerouslySetInnerHTML={{ __html: marked.parse(text) }} />;
  };

  // Function to toggle full screen mode for mobile
  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // Add click outside handler to close message options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showOptionsForMessage !== null &&
        !event.target.closest(".message-options") &&
        !event.target.closest(".message")
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

  if (isPdfView) {
    return (
      <div className="pdf-view-container">
        <div className="pdf-view-header">
          <button
            className="pdf-back-btn"
            onClick={() => setIsPdfView(false)}
            title="Back to chat"
          >
            <i className="fas fa-arrow-left"></i> Back to Chat
          </button>
          <h2>EduGen AI Conversation</h2>
          <button
            className="pdf-download-btn"
            onClick={downloadChatAsPdf}
            title="Download as PDF"
          >
            <i className="fas fa-download"></i> Download PDF
          </button>
        </div>
        <div className="pdf-view-content">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`pdf-message ${
                msg.sender === "user"
                  ? "pdf-user-message"
                  : "pdf-chatbot-message"
              }`}
            >
              <div className="pdf-message-sender">
                {msg.sender === "user" ? "You" : "EduGen AI"}:
              </div>
              <div className="pdf-message-content">
                {renderMessageContent(msg.text)}
              </div>
            </div>
          ))}
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
          {isMobile && (
            <button
              className="fullscreen-toggle-btn"
              onClick={toggleFullScreen}
            >
              <i
                className={`fas ${
                  isFullScreen ? "fa-compress-alt" : "fa-expand-alt"
                }`}
              ></i>
            </button>
          )}
          <span
            className={isMobile ? "chat-title-mobile" : "chat-title-desktop"}
          >
            EduGen AI 🤖
          </span>

          <button
            className={isMobile ? "pdf-button-mobile" : "pdf-button-desktop"}
            onClick={downloadChatAsPdf}
            title="Download PDF"
          >
            <i className="fas fa-file-pdf"></i>
            <span className="pdf-button-label"></span>
          </button>
        </div>

        <div
          ref={chatBoxRef}
          className={isMobile ? "chat-box-mobile" : "chat-box-desktop"}
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
              onTouchStart={() => handleLongPressStart(index)}
              onTouchEnd={handleLongPressEnd}
              onTouchMove={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(index)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onContextMenu={(e) => handleRightClick(e, index, message)}
              onClick={() => handleMessageClick(index, message)}
              style={{
                cursor: message.sender === "bot" ? "pointer" : "default",
              }}
            >
              {renderMessageContent(message.text)}
              {showOptionsForMessage === index && message.sender === "bot" && (
                <div className="message-options">
                  <button onClick={() => handleReadAloud(message.text)}>
                    <i className="fas fa-volume-up"></i>
                    {!isMobile && "Read"}
                  </button>
                  <button onClick={handlePdfView}>
                    <i className="fas fa-file-pdf"></i>
                    {!isMobile && "PDF"}
                  </button>
                  {isSpeaking && (
                    <button onClick={handleStopAudio}>
                      <i className="fas fa-stop"></i>
                      {!isMobile && "Stop"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className={isMobile ? "loading-mobile" : "loading-desktop"}>
              EduGen AI is thinking... (this may take up to 2 mins)
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
            <i className={`fas ${isListening ? "fa-stop" : "fa-mic"}`}></i>
            <i className="fas fa-microphone"></i>
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
    </>
  );
};

export default Chatbot;
