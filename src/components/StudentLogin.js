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
  const userInitiatedLogin = useRef(false);

  // Handle OAuth redirects only (not auto-login for cached sessions)
  useEffect(() => {
    let isInitialCheck = true;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Only process if we're on the login page
      if (window.location.pathname !== '/student-login') {
        return;
      }

      // Check if we're returning from an OAuth flow
      const oauthInProgress = localStorage.getItem('studentOAuthInProgress');
      if (oauthInProgress === 'true') {
        userInitiatedLogin.current = true;
        localStorage.removeItem('studentOAuthInProgress');
      }

      console.log("Auth state changed:", { 
        user: user?.email, 
        isInitialCheck, 
        userInitiated: userInitiatedLogin.current,
        hasChecked: hasCheckedAuth.current,
        oauthInProgress
      });

      // On initial mount, don't auto-redirect if user already has a session
      // Only process auth state changes that happen after user interaction (login/Google OAuth)
      if (isInitialCheck) {
        isInitialCheck = false;
        
        // If there's a user on initial load AND it's not from OAuth redirect
        if (user && !userInitiatedLogin.current) {
          console.log("Cached session found - user must explicitly login");
          // Sign out the cached session to prevent auto-login
          try {
            await auth.signOut();
            hasCheckedAuth.current = false; // Reset so new login can be processed
            userInitiatedLogin.current = false; // Reset user initiated flag
          } catch (err) {
            console.log("Error signing out cached session:", err);
          }
          return;
        }
        
        // If OAuth in progress, continue with auth processing
        if (userInitiatedLogin.current && user) {
          // Let it fall through to process the OAuth login
        } else {
          return;
        }
      }

      // Only process auth changes if user explicitly initiated login
      if (!userInitiatedLogin.current) {
        console.log("No user-initiated login - ignoring auth change");
        return;
      }

      // After initial check, process auth state changes (from user login actions)
      if (hasCheckedAuth.current) {
        console.log("Already processed auth - ignoring");
        return;
      }

      if (user) {
        hasCheckedAuth.current = true;
        console.log("Processing user login:", user.email);
        
        // Validate email for Google OAuth sign-in
        const emailMatch = user.email?.match(/^22aids(\d{3})@act\.edu\.in$/);
        const isYaknarashagan = user.email === "yaknarashagan2@gmail.com";
        let allowed = false;
        if (emailMatch) {
          const num = parseInt(emailMatch[1], 10);
          allowed = num >= 1 && num <= 58;
        }

        // If email is not allowed
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
            hasCheckedAuth.current = false;
            userInitiatedLogin.current = false;
          } catch (signOutError) {
            console.log("SignOut error (ignored):", signOutError.message);
          }
          return;
        }

        // Fetch student data
        const studentData = await fetchStudentData(user.uid);
        console.log("Student Data:", studentData);

        if (!studentData) {
          // No student record exists - create one and redirect to form
          console.log("Creating new student record");
          try {
            await updateStudentData(user.uid, {
              email: user.email,
              name: user.displayName || user.email?.split('@')[0] || 'Student',
              formFilled: false,
            });
            navigate("/student-form", { replace: true });
          } catch (error) {
            console.error("Error creating student record:", error);
            setError("Failed to create student account. Please try again.");
            hasCheckedAuth.current = false;
            userInitiatedLogin.current = false;
          }
        } else {
          // Student record exists - check if form is filled
          const isFormFilled = studentData.form_filled || studentData.formFilled;
          
          if (isFormFilled === true) {
            console.log("Redirecting to dashboard");
            navigate("/student-dashboard", { replace: true });
          } else {
            console.log("Redirecting to form");
            navigate("/student-form", { replace: true });
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Cleanup OAuth flag if it's been more than 5 minutes (abandoned OAuth flow)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localStorage.getItem('studentOAuthInProgress') === 'true') {
        console.log("Cleaning up stale OAuth flag");
        localStorage.removeItem('studentOAuthInProgress');
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearTimeout(timeout);
  }, []);

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
      setError(""); // Clear any previous errors
      userInitiatedLogin.current = true; // Mark as user-initiated
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // The onAuthStateChanged listener will handle the redirect
    } catch (err) {
      userInitiatedLogin.current = false; // Reset on error
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
      setError(""); // Clear any previous errors
      
      // Set flag in localStorage before OAuth redirect (persists across page reload)
      localStorage.setItem('studentOAuthInProgress', 'true');
      userInitiatedLogin.current = true; // Mark as user-initiated
      
      // Supabase OAuth will redirect to Google and back
      // The onAuthStateChanged listener in useEffect will handle the redirect
      await signInWithPopup(auth, googleProvider);
      // Note: The page will redirect, so code below won't execute
    } catch (err) {
      // Clean up on error
      localStorage.removeItem('studentOAuthInProgress');
      userInitiatedLogin.current = false; // Reset on error
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
