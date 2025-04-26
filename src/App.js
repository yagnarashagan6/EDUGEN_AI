

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import LandingPage from './components/LandingPage';
import StudentLogin from './components/StudentLogin';
import StaffLogin from './components/StaffLogin';
import StudentForm from './components/StudentForm';
import StaffForm from './components/StaffForm';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Profile from './pages/Profile';



function App() {
  return (
    <div>
      <div className="app-content">
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/student-form" element={<StudentForm />} />
            <Route path="/staff-form" element={<StaffForm />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
