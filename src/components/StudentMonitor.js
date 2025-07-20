import React, { useState, useEffect, useCallback } from "react";
// import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
// import { db } from '../firebase';
// If you have specific styles in StudentMonitor.css, ensure it's correctly linked
// For this example, we're relying primarily on Tailwind CSS classes
import "../styles/StudentMonitor.css";

const StudentMonitor = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("All"); // Default to 'All'
  const [activityFilter, setActivityFilter] = useState("All"); // Default to 'All'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    uploadsToday: 0,
    activeStudentsToday: 0,
    totalRecentActivities: 0, // Renamed for clarity
  });

  // Define available subjects and activity types for filtering
  // These could also be fetched dynamically if they change often
  const subjects = [
    "All",
    "human_resource",
    "it",
    "agriculture",
    "Cyber Security",
    "Embedded System & IOT",
    "Software Testing",
    "General",
  ];
  const activityTypes = [
    "All",
    "uploaded note",
    "quiz started",
    "quiz completed",
    "login",
    "goal added",
    "feedback submitted",
  ];

  // Callback function to fetch activities from Firestore
  const fetchActivities = useCallback(async () => {
    // Firestore fetch is disabled
    setLoading(false);
    setError(null);
    // Optionally, setActivities([]); setFilteredActivities([]);
    // setSummaryStats({ uploadsToday: 0, activeStudentsToday: 0, totalRecentActivities: 0 });
  }, []); // Empty dependency array means this useCallback instance is created once

  // Effect for initial data fetch and setting up the refresh interval
  useEffect(() => {
    fetchActivities(); // Fetch on component mount

    const intervalId = setInterval(() => {
      fetchActivities();
    }, 60000); // Refresh data every 60 seconds

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [fetchActivities]); // Depend on fetchActivities callback

  // Effect to apply filters whenever activities, subjectFilter, or activityFilter change
  useEffect(() => {
    let currentFiltered = [...activities]; // Start with all fetched activities

    if (subjectFilter !== "All") {
      currentFiltered = currentFiltered.filter(
        (activity) => activity.subject === subjectFilter
      );
    }

    if (activityFilter !== "All") {
      currentFiltered = currentFiltered.filter(
        (activity) => activity.activity === activityFilter
      );
    }
    setFilteredActivities(currentFiltered);
  }, [subjectFilter, activityFilter, activities]);

  // Handler for subject filter change
  const handleSubjectFilterChange = (e) => {
    setSubjectFilter(e.target.value);
  };

  // Handler for activity type filter change
  const handleActivityFilterChange = (e) => {
    setActivityFilter(e.target.value);
  };

  // Conditional rendering for loading state
  if (loading && activities.length === 0) {
    // Show loading only on initial load
    return <div className="text-center p-4">Loading student activities...</div>;
  }

  // Conditional rendering for error state
  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="student-monitor">
      <h2 className="student-monitor-title">Student Activity Monitor</h2>

      {/* Summary Statistics Section */}
      <div className="student-monitor-summary">
        <div className="student-monitor-summary-card">
          <h3 className="student-monitor-summary-title">Uploads Today</h3>
          <p className="student-monitor-summary-value uploads">
            {summaryStats.uploadsToday}
          </p>
        </div>
        <div className="student-monitor-summary-card">
          <h3 className="student-monitor-summary-title">
            Active Students Today
          </h3>
          <p className="student-monitor-summary-value active">
            {summaryStats.activeStudentsToday}
          </p>
        </div>
        <div className="student-monitor-summary-card">
          <h3 className="student-monitor-summary-title">
            Total Recent Activities (Last 20)
          </h3>
          <p className="student-monitor-summary-value total">
            {summaryStats.totalRecentActivities}
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="student-monitor-filters">
        <div className="student-monitor-filter">
          <label
            htmlFor="subject-filter"
            className="student-monitor-filter-label"
          >
            Filter by Subject
          </label>
          <select
            id="subject-filter"
            value={subjectFilter}
            onChange={handleSubjectFilterChange}
            className="student-monitor-filter-select"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        <div className="student-monitor-filter">
          <label
            htmlFor="activity-filter"
            className="student-monitor-filter-label"
          >
            Filter by Activity Type
          </label>
          <select
            id="activity-filter"
            value={activityFilter}
            onChange={handleActivityFilterChange}
            className="student-monitor-filter-select"
          >
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Table Section */}
      <div className="student-monitor-table-container">
        <table className="student-monitor-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Activity Type</th>
              <th>Subject</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading && activities.length > 0 && (
              <tr>
                <td colSpan="4" className="student-monitor-table-refreshing">
                  Refreshing activities...
                </td>
              </tr>
            )}
            {!loading && filteredActivities.length === 0 ? (
              <tr>
                <td colSpan="4" className="student-monitor-table-empty">
                  No activities found matching your filters.
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity) => (
                <tr key={activity.id} className="student-monitor-table-row">
                  <td className="student-monitor-table-cell name">
                    {activity.name}
                  </td>
                  <td className="student-monitor-table-cell activity">
                    {activity.activity}
                  </td>
                  <td className="student-monitor-table-cell subject">
                    {activity.subject || "N/A"}
                  </td>
                  <td className="student-monitor-table-cell timestamp">
                    {activity.timestamp}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentMonitor;
