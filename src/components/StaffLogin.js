import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabaseAuth as auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  fetchStaffData,
  updateStaffData,
} from "../supabase";
import staffIcon from "../assets/staff.png";
import "../styles/Login.css";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const allowedEmails = [
    "yaknarashagan2@gmail.com",
    "aidshod@act.edu.in",
    "amala.aids@act.edu.in",
    "rupavathy.aids@act.edu.in",
    "pandiselvi.aids@act.edu.in",
    "gayathiri.aids@act.edu.in",
    "vinotha.aids@act.edu.in",
    "kappiyan22@gmail.com",
  ];

  const isEmailAllowed = (email) => allowedEmails.includes(email);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Validate email for Google OAuth sign-in
          if (!isEmailAllowed(user.email)) {
            setError("Access denied. Your email is not authorized.");
            await auth.signOut();
            setIsLoading(false);
            return;
          }

          const staffData = await fetchStaffData(user.uid);

          if (!staffData) {
            await updateStaffData(user.uid, {
              email: user.email,
              displayName: user.displayName,
              formFilled: false,
            });
            navigate("/staff-form", { replace: true });
          } else if (staffData.formFilled === true || staffData.form_filled === true) {
            navigate("/staff-dashboard", { replace: true });
          } else {
            navigate("/staff-form", { replace: true });
          }
        } catch (error) {
          console.error("Error checking staff profile:", error);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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
      if (!isEmailAllowed(user.email)) {
        setError("Access denied. Your email is not authorized.");
        await auth.signOut();
        return;
      }
      const staffData = await fetchStaffData(user.uid);
      console.log(
        "Login - Supabase data:",
        staffData ? staffData : "No data"
      );

      if (staffData && staffData.formFilled === true) {
        navigate("/staff-dashboard", { replace: true });
      } else {
        navigate("/staff-form", { replace: true });
      }
    } catch (err) {
      setError("Invalid username or password. Please check your credentials.");
      console.error("Login error:", err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const email = `${username}@example.com`;
    if (!isEmailAllowed(email)) {
      setError("Access denied. Your email is not authorized for registration.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await updateStaffData(user.uid, {
        username,
        email,
        formFilled: false,
      });
      navigate("/staff-form", { replace: true });
    } catch (err) {
      setError("Error during registration: " + err.message);
      console.error("Registration error:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Supabase OAuth will redirect to Google and back
      // The onAuthStateChanged listener in useEffect will handle the redirect
      await signInWithPopup(auth, googleProvider);
      // Note: The page will redirect, so code below won't execute
    } catch (err) {
      setError("Error during Google Sign-In: " + err.message);
      console.error("Google Sign-In error:", err);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // Show loading if still checking auth state
  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-title">STAFF LOGIN</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-title">STAFF LOGIN</div>
        <img src={staffIcon} alt="Staff" />
        <form onSubmit={handleLogin}>
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

export default StaffLogin;
