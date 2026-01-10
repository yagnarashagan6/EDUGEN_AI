import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import studentIcon from "../assets/student.png";
import staffIcon from "../assets/staff.png";
import facebookIcon from "../assets/facebook.png";
import twitterIcon from "../assets/x.png";
import linkedinIcon from "../assets/linkedin.png";
import "../styles/LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  // Handle OAuth callback if tokens are in URL hash
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if there's an access_token in the URL hash (OAuth callback)
      const hashParams = window.location.hash;
      if (hashParams && hashParams.includes('access_token')) {
        console.log('OAuth callback detected on landing page');
        
        // Let Supabase handle the session from URL
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          console.log('Session found, redirecting to appropriate dashboard');
          // Check localStorage for OAuth type
          const studentOAuth = localStorage.getItem('studentOAuthInProgress');
          const staffOAuth = localStorage.getItem('staffOAuthInProgress');
          
          if (studentOAuth === 'true') {
            navigate('/student-login', { replace: true });
          } else if (staffOAuth === 'true') {
            navigate('/staff-login', { replace: true });
          } else {
            // Default to student login if we can't determine
            navigate('/student-login', { replace: true });
          }
        }
      }
    };
    
    handleOAuthCallback();
  }, [navigate]);

  const redirectTo = (userType) => {
    if (userType === "student") {
      navigate("/student-login");
    } else if (userType === "staff") {
      navigate("/staff-login");
    }
  };

  return (
    <div className="landing-page">
      <div className="content-wrapper">
        <div className="title-container">
          <h1 className="main-title">EduGen AI</h1>
          <p className="subtitle">FOR ENGINEERING STUDENTS</p>
        </div>

        <div className="options-container">
          <div className="option-card" onClick={() => redirectTo("student")}>
            <img src={studentIcon} alt="Student" className="option-icon" />
            <strong className="option-label">STUDENT</strong>
          </div>
          <div className="option-card" onClick={() => redirectTo("staff")}>
            <img src={staffIcon} alt="Staff" className="option-icon" />
            <strong className="option-label">STAFF</strong>
          </div>
        </div>

        <div className="social-icons">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={facebookIcon} alt="Facebook" className="social-icon" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={twitterIcon} alt="Twitter" className="social-icon" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={linkedinIcon} alt="LinkedIn" className="social-icon" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
