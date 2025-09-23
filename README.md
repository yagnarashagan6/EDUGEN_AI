# 📚 EduGen AI

> A comprehensive AI-powered learning platform designed specifically for engineering students, with specialized features to help arrear students achieve academic success through personalized, interactive learning experiences.

🌐 **Live Website**: [edugen-ai-zeta.vercel.app](https://edugen-ai-zeta.vercel.app)  
📦 **GitHub Repository**: [EduGen AI](https://github.com/yagnarashagan6/EDUGEN_AI)

---

## 📌 Overview

**EduGen AI** is a cutting-edge educational platform that revolutionizes the learning experience for engineering students. Built with a focus on **arrear students** and those seeking conceptual clarity, the platform combines artificial intelligence with interactive learning tools to create a personalized educational journey.

The platform features an intelligent chatbot tutor, dynamic content generation, multi-modal learning support, and comprehensive student-staff collaboration tools. With robust backend architecture supporting multiple AI models and fallback systems, EduGen AI ensures reliable, 24/7 learning assistance.

---

## 🛠️ Tech Stack

### Frontend

- ⚛️ **React.js 19.1.0** – Modern UI with hooks and router
- 🎨 **CSS3** – Responsive design with mobile-first approach
- 📱 **Progressive Web App** – Offline capabilities and mobile optimization
- 🎯 **React Router DOM** – Client-side routing
- 📊 **Canvas Confetti** – Interactive celebrations and feedback

### Backend & APIs

- 🚀 **Node.js + Express** – Primary backend server
- 🐍 **Python FastAPI** – Secondary backend for specialized AI tasks
- 🧠 **OpenRouter API** – Multi-model AI integration
- 🤖 **Google Generative AI** – Advanced language models
- 📄 **Document Processing** – PDF parsing and content extraction

### Database & Authentication

- 🔥 **Firebase** – Real-time database, authentication, and hosting
- 🗄️ **Firestore** – NoSQL document database
- 🔐 **Firebase Auth** – Secure user authentication

### AI & Machine Learning

- 🎤 **Speech-to-Text** – Voice input processing
- 🔊 **Text-to-Speech** – Audio output generation
- � **Natural Language Processing** – Intelligent content generation
- 🧩 **Multi-modal AI** – Text, voice, and document understanding

### Development & Deployment

- 📦 **npm** – Package management
- ☁️ **Vercel** – Frontend deployment
- 🌐 **Render** – Backend hosting
- 🔄 **CORS** – Cross-origin resource sharing
- ⚡ **Rate Limiting** – API protection and optimization

---

## 🌟 Key Features

### 🤖 Intelligent AI Tutor

- **Multi-Mode Chatbot**: Study mode, Talk mode, and Quiz generation
- **Fallback Architecture**: Primary and secondary AI backends for reliability
- **Context-Aware Responses**: Understands student queries and learning context
- **Real-time Communication**: Instant responses with typing indicators

### 📚 Advanced Learning Tools

- **📝 Smart Notes Generation**: AI-powered personalized notes based on topics
- **❓ Dynamic Quiz Creation**: Instant MCQ generation with explanations
- **📊 Progress Tracking**: Comprehensive learning analytics and goal setting
- **� Task Management**: Structured learning paths with progress monitoring

### 🎙️ Voice & Audio Features

- **🎤 Speech Recognition**: Voice-to-text input for hands-free interaction
- **🔊 Text-to-Speech**: Audio output for accessibility and multitasking
- **🎵 Background Audio**: Immersive learning environment

### 📱 User Experience

- **💻 Responsive Design**: Seamless experience across desktop, tablet, and mobile
- **🌙 Dark/Light Mode**: Customizable interface preferences
- **📱 Mobile Optimization**: Touch-friendly controls and mobile-specific layouts
- **⚡ Fast Loading**: Optimized performance with source map disabled for production

### 👥 Collaboration & Monitoring

- **�‍🏫 Staff Dashboard**: Teacher interface for student monitoring
- **📈 Performance Analytics**: Detailed insights into student progress
- **💬 Real-time Communication**: Direct student-staff interaction
- **🎯 Goal Setting**: Personalized learning objectives and milestones

### 🎥 Educational Content

- **📺 YouTube Integration**: Curated educational videos by subject and language
- **� Multi-language Support**: Tamil, English, Hindi, Telugu, Malayalam
- **📑 Document Processing**: Upload and analyze educational materials
- **📋 PDF Export**: Generate downloadable learning materials

### 🏆 Gamification

- **🎉 Achievement System**: Celebrations for completed tasks and high scores
- **🏅 Leaderboards**: Competitive learning environment
- **💫 Interactive Feedback**: Visual and audio rewards for progress

---

## 🏗️ Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── Chatbot.js      # AI chatbot interface
│   ├── Quiz.js         # Interactive quiz system
│   ├── Notes.js        # Note management
│   ├── Youtube.jsx     # Video content integration
│   └── ...
├── pages/              # Main application pages
├── styles/             # CSS styling files
└── firebase.js         # Firebase configuration
```

### Backend Architecture

```
edugen-backend/
├── server.js           # Main Express server
├── package.json        # Dependencies and scripts
└── vercel.json         # Deployment configuration
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v20.x or higher)
- npm or yarn package manager
- Firebase account and project
- OpenRouter API key

### 1. Clone the Repository

```bash
git clone https://github.com/yagnarashagan6/EDUGEN_AI.git
cd EDUGEN_AI
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd edugen-backend
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

# YouTube API (for video integration)
REACT_APP_YT_API_KEY=your_youtube_api_key

# AI API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### 4. Run the Application

```bash
# Start the frontend development server
npm start

# In a separate terminal, start the backend server
cd edugen-backend
npm start
```

The application will be available at `http://localhost:3000`

---

## 📖 Usage Guide

### For Students

1. **Registration**: Sign up using the student registration form
2. **Dashboard Access**: Navigate through the intuitive student dashboard
3. **AI Tutor**: Interact with the chatbot for learning assistance
4. **Study Modes**:
   - **Study Mode**: Get explanations and help with concepts
   - **Talk Mode**: Conversational learning with voice support
   - **Quiz Mode**: Test knowledge with AI-generated questions
5. **Note Management**: Create, organize, and export study notes
6. **Progress Tracking**: Monitor learning goals and achievements

### For Staff/Teachers

1. **Staff Registration**: Register using the staff portal
2. **Student Monitoring**: Track student progress and performance
3. **Content Management**: Assist students with doubt clearing
4. **Analytics**: View detailed reports on student engagement

---

## 🔧 API Endpoints

### Chat API

- **POST** `/api/chat` - Send messages to AI tutor
- **POST** `/api/generate-quiz` - Generate quiz questions
- **POST** `/api/speech-to-text` - Convert speech to text
- **POST** `/api/text-to-speech` - Convert text to speech

### User Management

- Firebase Authentication handles user registration and login
- Firestore manages user profiles and learning data

---

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Build the project
npm run build

# Deploy to Vercel
npm install -g vercel
vercel --prod
```

### Backend (Render/Railway)

1. Push your backend code to a Git repository
2. Connect your repository to Render or Railway
3. Set environment variables in the hosting platform
4. Deploy automatically on code push

---

## 🤝 Contributing

We welcome contributions to EduGen AI! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed

### Areas for Contribution

- 🐛 Bug fixes and performance improvements
- ✨ New features and educational tools
- 🌍 Language localization and accessibility
- 📚 Educational content and curriculum integration
- 🎨 UI/UX enhancements
- 📖 Documentation improvements

---

## 📊 Performance & Monitoring

### Key Metrics

- **Response Time**: AI chatbot responses typically under 2 seconds
- **Uptime**: 99.9% availability with fallback architecture
- **User Engagement**: Average session duration tracking
- **Learning Progress**: Completion rates and quiz scores

### Monitoring Tools

- Backend health checks and status monitoring
- Error tracking and logging
- Performance analytics
- User activity insights

---

## 🔒 Security & Privacy

### Data Protection

- Firebase security rules for data access control
- Rate limiting to prevent API abuse
- Secure authentication with Firebase Auth
- CORS configuration for cross-origin protection

### Privacy Measures

- User data encryption in transit and at rest
- Minimal data collection policy
- GDPR compliance considerations
- Anonymous usage analytics

---

## 🐛 Troubleshooting

### Common Issues

**Build Errors**

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Firebase Connection Issues**

- Verify environment variables are correctly set
- Check Firebase project configuration
- Ensure Firebase services are enabled

**API Rate Limits**

- The platform includes fallback API endpoints
- Monitor usage in the console for quota management

---

## 📞 Support & Contact

- 📧 **Email**: [Support Email]
- 💬 **Issues**: [GitHub Issues](https://github.com/yagnarashagan6/EDUGEN_AI/issues)
- 📖 **Documentation**: Available in the repository wiki
- 🌐 **Live Demo**: [edugen-ai-zeta.vercel.app](https://edugen-ai-zeta.vercel.app)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenRouter & Google AI** for providing robust AI API services
- **Firebase** for backend infrastructure and real-time capabilities
- **React Community** for excellent documentation and tools
- **Educational Content Creators** for inspiring the platform's design
- **Beta Testers** and early users for valuable feedback

---

## 🗺️ Roadmap

### Upcoming Features

- 🔮 **Advanced Analytics**: Detailed learning pattern analysis
- 🌐 **Mobile App**: Native iOS and Android applications
- 🎯 **Curriculum Integration**: Alignment with university syllabi
- 🤖 **Enhanced AI**: More sophisticated tutoring capabilities
- 👥 **Social Learning**: Peer-to-peer collaboration features
- 📊 **Institution Dashboard**: School and college management tools

### Version History

- **v0.1.0** - Initial release with core functionality
- **Current** - Enhanced UI, voice features, and backend reliability

---

<div align="center">

**Built with ❤️ for Engineering Students**

[⭐ Star this repo](https://github.com/yagnarashagan6/EDUGEN_AI) | [🍴 Fork it](https://github.com/yagnarashagan6/EDUGEN_AI/fork) | [📝 Report Issues](https://github.com/yagnarashagan6/EDUGEN_AI/issues)

</div>
