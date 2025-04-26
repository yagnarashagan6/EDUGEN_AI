import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, doc, getDoc } from '../firebase';
import '../styles/Dashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated.');
        navigate('/student-login');
        return;
      }

      const docRef = doc(db, 'students', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setError('No data found.');
        navigate('/student-form');
      }
    };
    fetchData();
  }, [navigate]);

  if (!userData) return <div>Loading...</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <h2>Welcome to Student Dashboard</h2>
        {error && <p className="error-message">{error}</p>}
        <div className="user-details">
          <h3>Your Details</h3>
          <p><strong>Username:</strong> {userData.username || 'N/A'}</p>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Register Number:</strong> {userData.regNumber}</p>
          <p><strong>Roll Number:</strong> {userData.rollNumber}</p>
          <p><strong>Course:</strong> {userData.course}</p>
          <p><strong>Name:</strong> {userData.name}</p>
          <p><strong>Date of Birth:</strong> {userData.dob}</p>
          <p><strong>Gender:</strong> {userData.gender}</p>
          <p><strong>Blood Group:</strong> {userData.bloodGroup}</p>
          <p><strong>Contact Number:</strong> {userData.studentContact}</p>
          <p><strong>Aadhaar No.:</strong> {userData.aadhaar}</p>
          {userData.image && <img src={userData.image} alt="Profile" className="profile-image" />}
        </div>
        <button onClick={() => auth.signOut().then(() => navigate('/'))}>Logout</button>
      </div>
    </div>
  );
};

export default StudentDashboard;