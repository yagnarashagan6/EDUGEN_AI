import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  db,
  doc,
  setDoc,
  getDoc,
} from "../firebase";
import studentIcon from "../assets/student.png";
import "../styles/Login.css";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Add useEffect for auto-redirect if already signed in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, "students", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().formFilled) {
          navigate("/student-dashboard");
        } else {
          navigate("/student-form");
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Helper function to validate allowed usernames
  const isAllowedUsername = (username) => {
    if (username === "yaknarashagan2") return true;
    const match = username.match(/^22aids(\d{3})$/);
    if (!match) return false;
    const num = parseInt(match[1], 10);
    return num >= 1 && num <= 58;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isAllowedUsername(username)) {
      setError("Only users with IDs from 22aids001 to 22aids058 can login.");
      return;
    }
    const email =
      username === "yaknarashagan2"
        ? "yaknarashagan2@gmail.com"
        : `${username}@act.edu.in`;
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const docRef = doc(db, "students", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().formFilled) {
        navigate("/student-dashboard");
      } else {
        navigate("/student-form");
      }
    } catch (err) {
      setError("Invalid username or password.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(
      "Google sign-in is only allowed for 22aids001@act.edu.in to 22aids058@act.edu.in"
    );
    // Optionally sign out if needed (not required for registration, but for consistency):
    await auth.signOut?.();
    return;
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Restrict Google sign-in to allowed student emails or yaknarashagan2@gmail.com
      const emailMatch = user.email.match(/^22aids(\d{3})@act\.edu\.in$/);
      const isYaknarashagan = user.email === "yaknarashagan2@gmail.com";
      let allowed = false;
      if (emailMatch) {
        const num = parseInt(emailMatch[1], 10);
        allowed = num >= 1 && num <= 58;
      }
      if (!allowed && !isYaknarashagan) {
        setError(
          "Google sign-in is only allowed for 22aids001@act.edu.in to 22aids058@act.edu.in"
        );
        await auth.signOut();
        return;
      }

      const docRef = doc(db, "students", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          email: user.email,
          displayName: user.displayName,
          formFilled: false,
        });
        navigate("/student-form");
      } else if (docSnap.data().formFilled) {
        navigate("/student-dashboard");
      } else {
        navigate("/student-form");
      }
    } catch (err) {
      setError("Error during Google Sign-In: " + err.message);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-title">STUDENT LOGIN</div>
        <img src={studentIcon} alt="Student" />
        <form onSubmit={handleLogin}>
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
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="eye-icon" onClick={togglePasswordVisibility}>
              {showPassword ? "👁️‍🗨️" : "👁"}
            </span>
          </div>
          {error && <p className="error-messages">{error}</p>}
          <button type="submit" className="login-btn">
            LOGIN
          </button>
        </form>
        <button onClick={handleGoogleSignIn} className="login-btn google-btn">
          Sign in with Google
        </button>
        {/* Registration temporarily disabled */}
        {/* <p>
          Don't have an account?{" "}
          <a href="#" onClick={() => setIsRegistering(!isRegistering)}>
            Register here
          </a>
        </p> */}
      </div>
    </div>
  );
};

export default StudentLogin;
