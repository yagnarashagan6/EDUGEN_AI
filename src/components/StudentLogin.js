import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, db, doc, setDoc, getDoc } from '../firebase';
import studentIcon from '../assets/student.png';
import '../styles/Login.css';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Removed useEffect with onAuthStateChanged to prevent auto-redirect on page load

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = `${username}@example.com`;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, 'students', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().formFilled) {
        navigate('/student-dashboard');
      } else {
        navigate('/student-form');
      }
    } catch (err) {
      setError('Invalid username or password.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const email = `${username}@example.com`;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'students', user.uid), {
        username,
        email,
        formFilled: false,
      });

      navigate('/student-form');
    } catch (err) {
      setError('Error during registration: ' + err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      const docRef = doc(db, 'students', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          email: user.email,
          displayName: user.displayName,
          formFilled: false,
        });
        navigate('/student-form');
      } else if (docSnap.data().formFilled) {
        navigate('/student-dashboard');
      } else {
        navigate('/student-form');
      }
    } catch (err) {
      setError('Error during Google Sign-In: ' + err.message);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      <div className={`login-container ${isRegistering ? 'registration-container' : ''}`}>
        <div className="login-title">{isRegistering ? 'CREATE ACCOUNT' : 'STUDENT LOGIN'}</div>
        <img src={studentIcon} alt="Student" />
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="input-group">
            <i>👤</i>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <i>🔒</i>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="eye-icon" onClick={togglePasswordVisibility}>
              {showPassword ? '👁️‍🗨️' : '👁'}
            </span>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-btn">
            {isRegistering ? 'CREATE' : 'LOGIN'}
          </button>
        </form>
        {!isRegistering && (
          <button onClick={handleGoogleSignIn} className="login-btn google-btn">
            Sign in with Google
          </button>
        )}
        <p>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <a href="#" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Login here' : 'Register here'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default StudentLogin;