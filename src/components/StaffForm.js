import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db, doc, setDoc } from "../firebase";
import "../styles/Form.css";

const StaffForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.state?.isEdit || false;
  const userData = location.state?.userData || {};

  const [formData, setFormData] = useState({
    staffId: userData.staffId || "",
    name: userData.name || "",
    department: userData.department || "",
    subject: userData.subject || "",
    dob: userData.dob || "",
    gender: userData.gender || "",
    contactNumber: userData.contactNumber || "",
    email: userData.email || "",
    image: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const departments = [
    "Artificial Intelligence and Data Science",
    "Computer Science Engineering",
    "Information Technology",
    "Electronics and Communication Engineering",
    "Electrical and Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Biomedical Engineering",
    "Aerospace Engineering",
  ];

  const subjects = [
    "Human Resource and Management",
    "Human Values and Ethics",
    "Industrial Hygiene",
    "Traditional Indian Foods",
    "IT in Agricultural System",
  ];

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
      setError("User not authenticated.");
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
          const staffData = {
            ...data,
            image: imageData,
            formFilled: true,
          };

          try {
            await setDoc(doc(db, "staff", user.uid), staffData, {
              merge: true,
            });
            console.log(
              "Staff form data saved successfully for UID:",
              user.uid
            );
            navigate("/staff-dashboard", { replace: false });
          } catch (err) {
            setError("Error saving data: " + err.message);
            console.error("Error saving staff form data:", err);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(image);
      } else {
        const staffData = {
          ...data,
          image: imageData,
          formFilled: true,
        };
        await setDoc(doc(db, "staff", user.uid), staffData, { merge: true });
        console.log("Staff form data saved successfully for UID:", user.uid);
        navigate("/staff-dashboard", { replace: false });
      }
    } catch (err) {
      setError("Error processing form: " + err.message);
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/staff-login");
  };

  return (
    <div className="form-page">
      <div className="container">
        <h2>{isEdit ? "Edit Profile" : "Staff Registration Form"}</h2>
        <p>
          Fill out the form carefully to{" "}
          {isEdit ? "update your profile" : "register"}
        </p>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div>
              <label>Staff ID:</label>
              <input
                type="text"
                id="staffId"
                placeholder="enter only five digit number : 12345"
                pattern="[0-9]{5}"
                value={formData.staffId}
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
              <label>Department:</label>
              <select
                id="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept, index) => (
                  <option key={index} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Subject:</label>
              <select
                id="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject, index) => (
                  <option key={index} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
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
              <label>Contact Number:</label>
              <input
                type="text"
                id="contactNumber"
                pattern="[0-9]{10}"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>
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
            {loading ? "Submitting..." : isEdit ? "Update Profile" : "Submit"}
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={handleBackToLogin}
              style={{ marginTop: "10px", background: "#f4a900" }}
            >
              Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default StaffForm;
