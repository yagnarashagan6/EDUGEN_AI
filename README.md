# 📚 EduGen AI

> A comprehensive AI-powered learning platform designed specifically for engineering students, with specialized features to help arrear students achieve academic success through personalized, interactive learning experiences, now enhanced with RAG (Retrieval-Augmented Generation) capabilities.

🌐 **Live Website**: [edugen-ai-zeta.vercel.app](https://edugen-ai-zeta.vercel.app)  
📦 **GitHub Repository**: [EduGen AI](https://github.com/yagnarashagan6/EDUGEN_AI)

---

## 📌 Overview

**EduGen AI** is a cutting-edge educational platform that revolutionizes the learning experience for engineering students. Built with a focus on **arrear students** and those seeking conceptual clarity, the platform combines multiple AI models with interactive learning tools to create a personalized educational journey.

The platform features an intelligent chatbot tutor, dynamic content generation, multi-modal learning support, and comprehensive student-staff collaboration tools. With the new **RAG Integration**, staff can now upload their own course materials (PDFs/Docs), allowing the AI to generate answers and quizzes that are strictly context-aware and syllabus-aligned.

## 🎯 **Proven Learning Methodology**

EduGen AI implements a **structured 3-step learning flow** specifically designed to enhance knowledge retention and academic success:

### 📋 **The EduGen Learning Flow**

```
Staff Posts Topic/File → Student Reads via AI Chatbot → Student Takes Quiz → Knowledge Mastery
```

#### **Step 1: Topic Assignment & Content Management** 📚

-   **Staff** posts classroom topics or uploads reference documents (PDFs).
-   **Content Approval**: Staff can preview, edit, and approve AI-generated structured answers before they go live.
-   Topics are instantly visible to enrolled students.

#### **Step 2: AI-Guided Learning** 🤖

-   **Student** engages with topics through the intelligent chatbot.
-   **Context-Aware Answers**: If a document is linked, the AI answers using *only* that source material (RAG).
-   **Modes**: switching between 'Study Mode' (Text) and 'Talk Mode' (Voice).

#### **Step 3: Knowledge Assessment** ✅

-   **Adaptive Quizzes**: Mandatory quiz completion for each topic with difficulty adjusting to student performance.
-   **Immediate Feedback**: Detailed explanations for every answer.
-   **Analytics**: Staff view detailed performance metrics including class strengths and weaknesses.

### 🧠 **Scientific Foundation**

This methodology is backed by proven educational research:

**📊 Retention Research**: According to Hermann Ebbinghaus's "Forgetting Curve" studies, active recall through quizzes can improve retention rates by up to **75%** compared to passive reading alone.

**🔄 Active Learning**: The National Academy of Sciences found that students in active learning environments show **6% higher attendance** and **performance gains equivalent to a half letter grade**.

**💡 Spaced Repetition**: Research by cognitive psychologists shows that students who engage with material through multiple modalities (reading + interaction + testing) retain **89% more information** after one week compared to single-exposure learning.

**🎯 Microlearning Impact**: Studies indicate that breaking content into smaller, focused segments (as done with individual topics) increases learning efficiency by **17%** and improves long-term retention by **22%**.

### 📈 **Expected Outcomes**

-   **Improved Semester Pass Rates**: Structured learning path ensures comprehensive coverage
-   **Enhanced Conceptual Clarity**: AI-guided explanations target individual weak points
-   **Better Knowledge Retention**: Multi-step approach creates stronger neural pathways
-   **Reduced Academic Stress**: Gradual, systematic learning prevents last-minute cramming

---

## 🛠️ Tech Stack

### Frontend

-   ⚛️ **React.js 19.1.0** – Modern UI with hooks and router
-   🎨 **CSS3** – Responsive design with mobile-first approach
-   📱 **Progressive Web App** – Offline capabilities and mobile optimization
-   🎯 **React Router DOM** – Client-side routing
-   📊 **Canvas Confetti** – Interactive celebrations and feedback

### Backend & APIs

-   🚀 **Node.js + Express** – Primary backend server
-   🐍 **Python Flask** – Dedicated RAG (Retrieval-Augmented Generation) API server
-   🧠 **Groq API** – High-speed inference for RAG summarization (Llama 3.3 70b)
-   🤖 **Google Generative AI** – Advanced language models for general chat
-   📄 **PyPDF2** – PDF parsing and detailed context extraction
-   📰 **GNews API** – Real-time global news integration

### Database & Authentication

-   🔥 **Firebase** – Real-time database, authentication, and hosting
-   🗄️ **Firestore** – NoSQL document database
-   🔐 **Firebase Auth** – Secure user authentication

### AI & Machine Learning

-   **RAG System**: Custom local vector-based retrieval for uploaded documents
-   **Vector Database**: Local storage vector indexing for fast context retrieval
-   **Hybrid Search**: Combines keyword matching with semantic understanding

### Development & Deployment

-   📦 **npm** – Package management
-   ☁️ **Vercel** – Frontend deployment
-   🌐 **Render** – Backend hosting
-   🔄 **CORS** – Cross-origin resource sharing
-   ⚡ **Rate Limiting** – API protection and optimization

---

## 🌟 Key Features

### 🤖 Intelligent AI Tutor & RAG

-   **RAG-Powered Answers**: Staff can upload specific PDFs, and the AI will generate answers *exclusively* from those documents, ensuring accuracy.
-   **Content Approval Workflow**: Staff generate content -> Preview & Edit -> Approve -> Publish to Students.
-   **Multi-Mode Chatbot**: Study mode, Talk mode, and Quiz generation.
-   **Fallback Architecture**: Primary (Groq/RAG) and secondary (Gemini) AI backends for reliability.

### 👥 Staff Dashboard & Analytics

-   **Detailed Performance Metrics**: View class averages, struggle points, and top performers.
-   **Strength/Weakness Analysis**: AI analyzes quiz results to pinpoint specific subtopics where students are struggling.
-   **File Management**: Upload, list, and delete reference documents for RAG processing.
-   **Task Assignment**: Push topics to students that appear instantly on their dashboards.

### 🛡️ Admin Dashboard (New)

-   **System Oversight**: Monitor RAG data generation and system logs.
-   **Data Visualization**: Charts and tables showing content generation stats.
-   **Local Storage Management**: Manage the local PDF repository directly.

### 📚 Advanced Learning Tools

-   **📝 Smart Notes Generation**: AI-powered personalized notes based on topics
-   **❓ Adaptive Quiz Creation**: Quizzes that adjust to the student's level.
-   **📊 Progress Tracking**: Comprehensive learning analytics and goal setting
-   **📋 Task Management**: Structured learning paths with progress monitoring

### 🎙️ Voice & Audio Features

-   **🎤 Speech Recognition**: Voice-to-text input for hands-free interaction
-   **🔊 Text-to-Speech**: Audio output for accessibility and multitasking
-   **🎵 Background Audio**: Immersive learning environment

### 📱 User Experience

-   **💻 Responsive Design**: Seamless experience across desktop, tablet, and mobile
-   **🌙 Dark/Light Mode**: Customizable interface preferences
-   **📱 Mobile Optimization**: Touch-friendly controls and mobile-specific layouts
-   **⚡ Fast Loading**: Optimized performance with source map disabled for production

### 📅 Organization & Productivity

-   **📅 Smart Timetable**: Comprehensive exam and class schedule management
-   **📰 Global News Feed**: Integrated educational and general news updates
-   **👋 Interactive Guides**: Role-specific onboarding tours for students and staff
-   **⚡ Smart Caching**: High-performance response caching for frequently accessed topics

### ⏱️ Study Timer & Productivity Tools

-   **🎮 Pomodoro-Style Study Timer**: Multiple focus modes with customizable intervals including Quick Focus, Deep Dive, and Power Session.
-   **📊 Study Statistics**: Track sessions completed, time studied, and productivity metrics
-   **🎮 Gamified Break Activities**: Unlock games based on study session completion:
    -   **Tic-Tac-Toe (Aether Tactics)**
    -   **Memory Match (Aether Memory)**
    -   **Tricky Cup**
-   **🔓 Progressive Unlocking System**: Games unlock as students complete more study sessions

### 🏆 Gamification

-   **🎉 Achievement System**: Celebrations for completed tasks and high scores
-   **🏅 Leaderboards**: Competitive learning environment
-   **💫 Interactive Feedback**: Visual and audio rewards for progress
-   **🎮 Study Break Games**: Reward focused study time with entertaining mini-games

---

## 📱 Sidebar Features & Navigation

EduGen AI features a role-specific sidebar designed to streamline the workflow for both students and staff.

### 👨‍🎓 Student Sidebar

| Feature | Description | Unique Value |
| :--- | :--- | :--- |
| **📋 Tasks** | View daily topics assigned by staff. | Acts as the entry point for the 3-step learning flow. |
| **🎯 Goals** | Set and track personal academic milestones. | Encourages self-directed learning beyond assigned work. |
| **📝 Assignments** | Submit work and view grades/feedback. | Streamlined submission process with status tracking. |
| **🔥 Streaks** | Track daily learning consistency. | Gamifies attendance to build consistent study habits. |
| **📰 News** | Educational and global news updates. | Keeps students informed without leaving the platform. |
| **📺 YouTube** | Curated educational video content. | Distraction-free video learning environment. |
| **⏱️ Study Timer** | Pomodoro timer with gamified breaks. | **Unique:** Unlocks games only after study sessions are completed. |
| **💬 Staff Interaction** | Direct chat with teachers. | Removes barriers to asking for help. |
| **📊 Self Analysis** | Personal performance metrics. | Visualizes progress to boost confidence. |
| **🗒️ Notes** | Create and manage AI-assisted notes. | Integrated note-taking prevents context switching. |

### 👨‍🏫 Staff Sidebar

| Feature | Description | Unique Value |
| :--- | :--- | :--- |
| **📋 Tasks** | Post classroom topics for students. | **Unique:** Posting a topic instantly triggers the AI learning flow for all students. |
| **📝 Assignments** | Review and grade student submissions. | Centralized dashboard for all class work. |
| **📈 Results** | View detailed class performance. | Identify struggling students early with Strength/Weakness analysis. |
| **📂 RAG Uploads** | Upload Course Materials (PDFs). | Enables the AI to teach from **your** specific notes. |
| **👀 Monitor** | Track real-time student engagement. | See who is active and who is falling behind. |
| **💬 Student Interaction** | Chat with individual students. | Provide targeted support to specific students. |
| **📊 Quick Stats** | At-a-glance class overview. | Instant health check of the class performance. |
| **📅 Timetable Creator** | Manage class and exam schedules. | Keeps everyone aligned on important dates. |

---

## 🏗️ Project Architecture

### 📐 System Architecture Overview

EduGen AI follows a modern, event-driven architecture designed for real-time interaction and high availability.

#### 1. **User Entry & Authentication**

-   **Landing Page**: The gateway to the platform.
-   **Auth Flow**: Users (Student/Staff) authenticate via **Firebase Auth** (Google OAuth or Email/Password).
-   **Role Routing**: Upon login, the system checks the user's role in **Firestore** and routes them to the appropriate Dashboard.

#### 2. **Frontend Layer (React PWA)**

-   **Student Dashboard**: Connects to real-time listeners for Tasks, Messages, and Progress.
-   **Staff Dashboard**: Connects to real-time listeners for Student Activity, Submissions, and Analytics.
-   **Admin Dashboard**: Restricted visibility, connects to RAG logs and file system stats.

#### 3. **Backend Layer (Microservices Approach)**

-   **Node.js + Express (Primary)**:
    -   Handles general API requests, News, and lighter logic.
    -   Acts as a secure gateway to AI providers.
-   **Python Flask (RAG Service)**:
    -   **Heavy Lifting**: Handles PDF text extraction, vector embedding, and RAG context retrieval.
    -   **API**: Exposes endpoints like `/generate-answer` and `/generate-quiz` that use local documents.
-   **Firebase Admin SDK**:
    -   Manages privileged operations like user management and complex database queries.

#### 4. **Data & Storage Layer**

-   **Firestore (NoSQL Database)**: Real-time sync for user data, tasks, and results.
-   **Local Storage / File System**: The RAG service stores uploaded PDFs locally in a secure directory for fast processing.

#### 5. **AI Integration Layer**

-   **OpenRouter API / Groq**: Aggregates access to top-tier LLMs (Llama 3, Gemma).
-   **RAG Pipeline**:
    1.  PDF Upload -> Text Extraction -> Vector Chunking.
    2.  User Query -> Vector Similarity Search -> Variable Context Window.
    3.  LLM Query -> Context + Prompt -> Accurate Answer.

### Full Project Structure

```
EDUGEN_AI/
├── .vscode/             # VS Code configuration
├── build/               # Production build output
├── edugen-backend/      # Node.js backend server (Primary)
│   ├── server.js        # Main Express server
│   └── ...
├── rag model/           # Python RAG Service (Secondary)
│   ├── rag_api.py       # Flask API for RAG
│   ├── retrieve.py      # Core RAG logic
│   ├── pdfs/            # Local storage for documents
│   └── requirements.txt # Python dependencies
├── public/              # Static assets for React app
│   ├── games/           # Embedded HTML5 games
│   └── ...
├── src/                 # React application source code
│   ├── components/      # Reusable UI components
│   │   ├── AdminDashboard.js # New Admin Interface
│   │   ├── Chatbot.js
│   │   ├── Quiz.js
│   │   └── ...
│   ├── pages/           # Main application pages
│   ├── staff/           # Staff-specific components & logic
│   ├── students/        # Student-specific components & logic
│   ├── styles/          # CSS styling files
│   ├── App.js           # Main React App component
│   └── firebase.js      # Firebase configuration
├── .env                 # Environment variables
├── package.json         # Frontend dependencies and scripts
└── README.md            # Project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites

-   Node.js (v20.x or higher)
-   Python 3.10+
-   Firebase account and project
-   OpenRouter/Groq API key

### 1. Clone the Repository

```bash
git clone https://github.com/yagnarashagan6/EDUGEN_AI.git
cd EDUGEN_AI
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend (Node.js):**
```bash
cd edugen-backend
npm install
cd ..
```

**RAG Service (Python):**
```bash
cd "rag model"
pip install -r requirements.txt
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_id
# ... (other firebase config)

# AI API Configuration
OPENROUTER_API_KEY=your_key
REACT_APP_GOOGLE_API_KEY=your_key
REACT_APP_GROQ_API_KEY=your_key

# RAG Server Config
REACT_APP_RAG_API_URL=http://localhost:5000
```

### 4. Run the Application

You need to run 3 terminals:

**Terminal 1: Frontend**
```bash
npm start
```

**Terminal 2: Node Backend**
```bash
cd edugen-backend
npm start
```

**Terminal 3: Python RAG Service**
```bash
cd "rag model"
python rag_api.py
```

The application will be available at `http://localhost:3000`.

---

## 🔧 API Endpoints

### RAG API (Python)
-   **POST** `/api/rag/upload-pdf` - Upload course materials
-   **POST** `/api/rag/generate-answer` - Generate context-aware answers
-   **POST** `/api/rag/generate-quiz` - Generate quizzes from PDFs
-   **GET** `/api/rag/list-pdfs` - List available documents

### Main API (Node.js)
-   **POST** `/api/chat` - General chat support
-   **GET** `/api/news` - Fetch news
-   **POST** `/admin/logs` - Log system data

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

### Backend Services
-   **Node.js**: Deploy to Render/Railway.
-   **Python RAG**: Deploy to a service supporting Python/Flask with persistent storage (e.g., Render Disk, AWS EC2) to allow PDF storage.

---

## 🤝 Contributing

We welcome contributions! Please fork the repository and submit a Pull Request.

---

<div align="center">

**Built with ❤️ for Engineering Students**

[⭐ Star this repo](https://github.com/yagnarashagan6/EDUGEN_AI) | [📝 Report Issues](https://github.com/yagnarashagan6/EDUGEN_AI/issues)

</div>
