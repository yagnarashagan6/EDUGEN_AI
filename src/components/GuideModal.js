import React, { useCallback, useEffect } from "react";
import "../styles/GuideModal.css";

const GuideModal = ({ isOpen, onClose, role }) => {
  // Move hooks before the conditional return
  const handleEscapeKey = useCallback(
    (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Add event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [handleEscapeKey, isOpen]);

  // Handle clicking outside modal
  const handleOverlayClick = (event) => {
    if (event.target.className === "modal-overlay") {
      onClose();
    }
  };

  if (!isOpen) return null;

  const guideContent =
    role === "staff"
      ? `
# Staff Feature Guide

## Dashboard Overview
- **Quick Stats**: View total students, active students, overall performance, and tasks. Click stat boxes to filter student lists.
- **Search Bar**: Search for students or assignments.

## Tasks Management
- **View Tasks**: See posted tasks with content, date, deadline, and completion status.
- **Post New Topic**: Add tasks by entering a topic. Tasks are categorized by your subject.
- **Delete Task**: Remove tasks with confirmation.

## Assignments
- **View Received Assignments**: Check student-submitted assignments with file links and dates.
- **Filter by Staff**: See only your assigned submissions.

## Results
- **Student Progress**: Track completed tasks vs. total tasks per student.

## Circulars
- **Upload Circulars**: Share PDF announcements.
- **View Circulars**: Access uploaded circulars with details.

## Staff Interaction (Chat)
- **Student Messaging**: Chat with students, send messages, view history, and delete sent messages.
- **Real-Time Updates**: Messages show read receipts (✓ for sent, ✓✓ for read).
- **Contact List**: Toggle between student list and chat.

## Student Statistics
- **Filtered Views**: Filter students by total, active (logged in within 7 days), or performance (progress ≥ 50%).
- **Student Details**: View names, streaks, progress, and photos.

## Settings
- **Edit Profile**: Update your profile.
- **Logout**: Sign out securely.

## Chatbot
- **AI Assistance**: Use EduGen AI Chatbot for support. Toggle on mobile.
  `
      : `
# Student Feature Guide

## Dashboard Overview
- **Profile Summary**: See your progress and weekly target completion.
- **Subjects & Assignments**: View subjects (e.g., Cyber Security) and assignments in grids.
- **Leaderboard**: Check your streak and progress ranking.
- **Search Bar**: Search for learning topics.

## Tasks
- **Subject-Based Tasks**: Browse tasks by subject. Click to view tasks.
- **Task Actions**: Copy task content to chatbot or start a quiz.
- **Quiz Mode**: Take quizzes on topics, updating progress. Only one quiz at a time.

## Goals
- **Set Goals**: Add goals with title, subject, due date, priority, and description.
- **Manage Goals**: Mark complete or delete. Completed goals boost progress.
- **Goal Form**: Toggle form to add goals.

## Streak & Leaderboard
- **Track Streak**: Daily login streak increments with consecutive logins.
- **Leaderboard**: View class rankings with detailed stats.

## Assignments
- **Upload Assignments**: Upload files (e.g., PDFs).
- **Send to Staff**: Send assignments to staff for review.
- **Delete Assignments**: Remove uploaded assignments.

## Circulars
- **View Circulars**: Access staff-shared announcements.

## Staff Interaction (Chat)
- **Staff Messaging**: Chat with staff, send messages, delete sent messages.
- **Real-Time Updates**: Messages show read receipts.
- **Overdue Task Reasons**: Send reasons for overdue tasks to staff.

## Self Analysis
- **Progress Metrics**: View learning rate, communication skill, and goal completion in progress bars.
- **Personalized Tips**: Get performance-based suggestions.
- **Feedback**: Submit learning experience feedback.

## Settings
- **Edit Profile**: Update your profile.
- **Logout**: Sign out securely.

## Chatbot
- **AI Support**: Use chatbot for topic explanations or quiz prep. Paste task topics for help.
  `;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{role === "staff" ? "Staff" : "Student"} Feature Guide</h2>
          <button className="close-icon" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {guideContent.split("\n").map((line, index) => {
            if (line.startsWith("# ")) {
              return <h3 key={index}>{line.replace("# ", "")}</h3>;
            } else if (line.startsWith("## ")) {
              return <h4 key={index}>{line.replace("## ", "")}</h4>;
            } else if (line.startsWith("- ")) {
              return <li key={index}>{line.replace("- ", "")}</li>;
            } else if (line.trim()) {
              return <p key={index}>{line}</p>;
            }
            return null;
          })}
        </div>
        <button className="modal-close-btn" onClick={onClose}>
          Close Guide
        </button>
      </div>
    </div>
  );
};

export default GuideModal;
