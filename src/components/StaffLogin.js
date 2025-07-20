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
import staffIcon from "../assets/staff.png";
import "../styles/Login.css";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = `${username}@example.com`;
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const docRef = doc(db, "staff", user.uid);
      const docSnap = await getDoc(docRef);
      console.log(
        "Login - Firestore data:",
        docSnap.exists() ? docSnap.data() : "No data"
      );

      if (docSnap.exists() && docSnap.data().formFilled === true) {
        navigate("/staff-dashboard");
      } else {
        navigate("/staff-form");
      }
    } catch (err) {
      setError("Invalid username or password. Please check your credentials.");
      console.error("Login error:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const email = `${username}@example.com`;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await setDoc(
        doc(db, "staff", user.uid),
        { username, email, formFilled: false },
        { merge: true }
      );
      navigate("/staff-form");
    } catch (err) {
      setError("Error during registration: " + err.message);
      console.error("Registration error:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const docRef = doc(db, "staff", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().formFilled === true) {
        navigate("/staff-dashboard");
      } else {
        if (!docSnap.exists()) {
          await setDoc(
            docRef,
            {
              email: user.email,
              displayName: user.displayName || username,
              formFilled: false,
            },
            { merge: true }
          );
        }
        navigate("/staff-form");
      }
    } catch (err) {
      setError("Error during Google Sign-In: " + err.message);
      console.error("Google Sign-In error:", err);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      <div
        className={`login-container ${
          isRegistering ? "registration-container" : ""
        }`}
      >
        <div className="login-title">
          {isRegistering ? "CREATE STAFF ACCOUNT" : "STAFF LOGIN"}
        </div>
        <img src={staffIcon} alt="Staff" />
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="input-group">
            <i className="fas fa-user"></i>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="eye-icon" onClick={togglePasswordVisibility}>
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="login-btn">
            {isRegistering ? "CREATE" : "LOGIN"}
          </button>
        </form>
        {!isRegistering && (
          <button onClick={handleGoogleSignIn} className="login-btn google-btn">
            Sign in with Google
          </button>
        )}
        <p>
          {isRegistering
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <a href="#" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Login here" : "Register here"}
          </a>
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;
