import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db, doc, setDoc } from '../firebase';
import '../styles/Form.css';

const StudentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const userData = location.state?.userData || {};

  const [formData, setFormData] = useState({
    regNumber: userData.regNumber || '',
    rollNumber: userData.rollNumber || '',
    course: userData.course || '',
    name: userData.name || '',
    dob: userData.dob || '',
    gender: userData.gender || '',
    bloodGroup: userData.bloodGroup || '',
    studentContact: userData.studentContact || '',
    email: userData.email || '',
    aadhaar: userData.aadhaar || '',
    image: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError('User not authenticated.');
      return;
    }

    const { image, ...data } = formData;
    setLoading(true);

    try {
      let imageData = userData.image || null;
      if (image) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          imageData = reader.result;
          const studentData = {
            ...data,
            image: imageData,
            formFilled: true,
          };

          try {
            await setDoc(doc(db, 'students', user.uid), studentData, { merge: true });
            console.log('Student form data saved successfully, formFilled set to true for UID:', user.uid);
            navigate('/student-dashboard', { replace: false });
          } catch (err) {
            setError('Error saving data: ' + err.message);
            console.error('Error saving student form data:', err);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(image);
      } else {
        const studentData = {
          ...data,
          image: imageData,
          formFilled: true,
        };
        await setDoc(doc(db, 'students', user.uid), studentData, { merge: true });
        console.log('Student form data saved successfully, formFilled set to true for UID:', user.uid);
        navigate('/student-dashboard', { replace: false });
      }
    } catch (err) {
      setError('Error processing form: ' + err.message);
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/student-login');
  };

  return (
    <div className="form-page">
      <div className="container">
        <h2>{isEdit ? 'Edit Profile' : 'Registration Form'}</h2>
        <p>Fill out the form carefully to {isEdit ? 'update your profile' : 'register'}</p>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div>
              <label>Register Number:</label>
              <input
                type="text"
                id="regNumber"
                pattern="[0-9]{12}"
                value={formData.regNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Roll Number:</label>
              <input
                type="text"
                id="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <div>
              <label>Course:</label>
              <input
                type="text"
                id="course"
                value={formData.course}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Name:</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <div>
              <label>Date of Birth:</label>
              <input
                type="date"
                id="dob"
                value={formData.dob}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Gender:</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <div>
              <label>Blood Group:</label>
              <input
                type="text"
                id="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Student Contact Number:</label>
              <input
                type="text"
                id="studentContact"
                pattern="[0-9]{10}"
                value={formData.studentContact}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <div>
              <label>Email ID:</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Aadhaar No.:</label>
              <input
                type="text"
                id="aadhaar"
                pattern="[0-9]{12}"
                value={formData.aadhaar}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div>
            <label>Upload Image:</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleChange}
              required={!isEdit}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : isEdit ? 'Update Profile' : 'Submit'}
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={handleBackToLogin}
              style={{ marginTop: '10px', background: '#f4a900' }}
            >
              Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default StudentForm;