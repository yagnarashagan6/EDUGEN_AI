import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabaseAuth as auth } from "../supabase";
import { fetchStudentData, fetchStaffData } from "../supabase";
import "../styles/Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/student-login");
        return;
      }

      const passedRole = location.state?.role;
      if (!passedRole || !["student", "staff"].includes(passedRole)) {
        navigate("/");
        return;
      }

      setRole(passedRole);

      try {
        const data = passedRole === "student"
          ? await fetchStudentData(user.uid)
          : await fetchStaffData(user.uid);

        if (data) {
          setUserData(data);
        } else {
          navigate(`/${passedRole}-login`);
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
        navigate("/");
      }
    };

    fetchUserData();
  }, [navigate, location]);

  const goBack = () => navigate(`/${role}-dashboard`);

  if (!userData) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  const commonFields = [
    { label: "Name", value: userData.name },
    { label: "Date of Birth", value: userData.dob },
    { label: "Gender", value: userData.gender },
    { label: "Email", value: userData.email },
  ];

  const studentFields = [
    { label: "Register Number", value: userData.regNumber },
    { label: "Roll Number", value: userData.rollNumber },
    { label: "Department", value: userData.department },
    { label: "Blood Group", value: userData.bloodGroup },
    { label: "Student Contact", value: userData.studentContact },
  ];

  const staffFields = [
    { label: "Staff ID", value: userData.staffId },
    { label: "Department", value: userData.department },
    { label: "Contact Number", value: userData.contactNumber },
    { label: "Subject", value: userData.subject },
  ];

  const detailsToShow =
    role === "student"
      ? [...studentFields, ...commonFields]
      : [...staffFields, ...commonFields];

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2 className="profile-header">
          {role === "student" ? "Student" : "Staff"} Profile
        </h2>
        <img
          src={userData.image || "/default-profile.jpg"}
          alt="Profile"
          className="profile-image"
        />
        <div className="profile-details">
          {detailsToShow.map((item, index) => (
            <div className="profile-field" key={index}>
              <label>{item.label}</label>
              <span>{item.value || "N/A"}</span>
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
