import React from "react";
import { useNavigate } from "react-router-dom";
import studentIcon from "../assets/student.png";
import staffIcon from "../assets/staff.png";
import facebookIcon from "../assets/facebook.png";
import twitterIcon from "../assets/x.png";
import linkedinIcon from "../assets/linkedin.png";
import "../styles/LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

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
