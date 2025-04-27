import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/student-login');
        return;
      }

      const passedRole = location.state?.role;
      if (!passedRole || !['student', 'staff'].includes(passedRole)) {
        navigate('/');
        return;
      }

      setRole(passedRole);
      const collectionName = passedRole === 'student' ? 'students' : 'staff';
      const docRef = doc(db, collectionName, user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        navigate(`/${passedRole}-login`);
      }
    };

    fetchUserData().catch((err) => {
      console.error('Error fetching profile data:', err);
      navigate('/');
    });
  }, [navigate, location]);

  const goBack = () => navigate(`/${role}-dashboard`);

  if (!userData) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  const commonFields = [
    { label: 'Name', value: userData.name },
    { label: 'Date of Birth', value: userData.dob },
    { label: 'Gender', value: userData.gender },
    { label: 'Email', value: userData.email },
  ];

  const studentFields = [
    { label: 'Register Number', value: userData.regNumber },
    { label: 'Roll Number', value: userData.rollNumber },
    { label: 'Course', value: userData.course },
    { label: 'Blood Group', value: userData.bloodGroup },
    { label: 'Student Contact', value: userData.studentContact },
    { label: 'Aadhaar No.', value: userData.aadhaar },
  ];

  const staffFields = [
    { label: 'Staff ID', value: userData.staffId },
    { label: 'Department', value: userData.department },
    { label: 'Contact Number', value: userData.contactNumber },
  ];

  const detailsToShow = role === 'student'
    ? [...studentFields, ...commonFields]
    : [...staffFields, ...commonFields];

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-header">{role === 'student' ? 'Student' : 'Staff'} Profile</h2>
        <img
          src={userData.image || '/default-profile.jpg'}
          alt="Profile"
          className="profile-image"
        />
        <div className="profile-details">
          {detailsToShow.map((item, index) => (
            <div className="profile-field" key={index}>
              <label>{item.label}</label>
              <span>{item.value || 'N/A'}</span>
            </div>
          ))}
        </div>
        <button className="profile-button" onClick={goBack}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Profile;