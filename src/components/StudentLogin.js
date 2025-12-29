import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabaseAuth as auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  fetchStudentData,
  updateStudentData,
} from "../supabase";
import studentIcon from "../assets/student.png";
import "../styles/Login.css";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const hasCheckedAuth = useRef(false);

  // Add useEffect for auto-redirect if already signed in
  // We need onAuthStateChanged for Google OAuth to work
  useEffect(() => {
    // Reset the flag when component mounts (user navigates to login page)
    hasCheckedAuth.current = false;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Only process if we're on the login page
      if (window.location.pathname !== '/student-login') {
        return;
      }

      // Prevent repeated processing of the same auth state
      if (hasCheckedAuth.current) {
        return;
      }

      if (user) {
        hasCheckedAuth.current = true;
        console.log("Auth state changed on login page for:", user.email);
        
        // Validate email for Google OAuth sign-in
        const emailMatch = user.email?.match(/^22aids(\d{3})@act\.edu\.in$/);
        const isYaknarashagan = user.email === "yaknarashagan2@gmail.com";
        let allowed = false;
        if (emailMatch) {
          const num = parseInt(emailMatch[1], 10);
          allowed = num >= 1 && num <= 58;
        }

        // If email is not allowed and it's not from direct login (Google OAuth)
        if (
          !allowed &&
          !isYaknarashagan &&
          !user.email?.endsWith("@act.edu.in")
        ) {
          setError(
            "Google sign-in is only allowed for 22aids001@act.edu.in to 22aids058@act.edu.in"
          );
          try {
            await auth.signOut();
            hasCheckedAuth.current = false; // Reset so user can try again
          } catch (signOutError) {
            // Ignore signOut errors (session might not exist)
            console.log("SignOut error (ignored):", signOutError.message);
          }
          return;
        }

        // Fetch student data
        const studentData = await fetchStudentData(user.uid);
        console.log("Login check - Student Data:", studentData);

        if (!studentData) {
          // No student record exists - create one and redirect to form
          console.log("No student data found - creating new record");
          try {
            await updateStudentData(user.uid, {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || 'Student',
              formFilled: false,
            });
            console.log("Student record created successfully");
            navigate("/student-form", { replace: true });
          } catch (error) {
            console.error("Error creating student record:", error);
            setError("Failed to create student account. Please try again.");
            hasCheckedAuth.current = false; // Reset so user can try again
          }
        } else {
          // Student record exists - check if form is filled
          // Use form_filled (snake_case from DB) or formFilled (camelCase)
          const isFormFilled = studentData.form_filled || studentData.formFilled;
          
          if (isFormFilled === true) {
            // Form is filled, go to dashboard
            console.log("Form already filled, redirecting to dashboard");
            navigate("/student-dashboard", { replace: true });
          } else {
            // Form not filled, go to form page
            console.log("Form not filled, redirecting to form");
            navigate("/student-form", { replace: true });
          }
        }
      } else {
        // No user signed in - this is expected on login page
        console.log("No user signed in - showing login form");
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Helper function to validate allowed usernames
  const isAllowedUsername = (username) => {
    // Allow specific email
    if (username === "kappiyan22@gmail.com") return true;
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

      const studentData = await fetchStudentData(user.uid);

      if (studentData && studentData.formFilled) {
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
    try {
      await auth.signOut?.();
    } catch (signOutError) {
      // Ignore signOut errors
      console.log("SignOut error (ignored):", signOutError.message);
    }
    return;
  };

  const handleGoogleSignIn = async () => {
    try {
      // Supabase OAuth will redirect to Google and back
      // The onAuthStateChanged listener in useEffect will handle the redirect
      await signInWithPopup(auth, googleProvider);
      // Note: The page will redirect, so code below won't execute
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
