import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
// Ensure this path is correct for your project structure
import { db } from '../firebase'; 
// If you have specific styles in StudentMonitor.css, ensure it's correctly linked
// For this example, we're relying primarily on Tailwind CSS classes
import '../styles/StudentMonitor.css'; 

const StudentMonitor = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('All'); // Default to 'All'
  const [activityFilter, setActivityFilter] = useState('All'); // Default to 'All'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryStats, setSummaryStats] = useState({
    uploadsToday: 0,
    activeStudentsToday: 0,
    totalRecentActivities: 0, // Renamed for clarity
  });

  // Define available subjects and activity types for filtering
  // These could also be fetched dynamically if they change often
  const subjects = ['All', 'human_resource', 'it', 'agriculture', 'Cyber Security', 'Embedded System & IOT', 'Software Testing', 'General'];
  const activityTypes = ['All', 'uploaded note', 'quiz started', 'quiz completed', 'login', 'goal added', 'feedback submitted'];

  // Callback function to fetch activities from Firestore
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null); // Reset error state on new fetch
    try {
      const activitiesRef = collection(db, 'student_activities');
      // Query to get the last 20 activities, ordered by timestamp descending
      const q = query(activitiesRef, orderBy('timestamp', 'desc'), firestoreLimit(20));
      const snapshot = await getDocs(q);
      
      const activityData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Format timestamp for display
          // Ensure timestamp is a valid date string or Firebase Timestamp object
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString(),
        };
      });

      setActivities(activityData);
      // setFilteredActivities(activityData); // Apply filters will handle this in the useEffect below

      // Calculate summary statistics
      const todayDateString = new Date().toDateString();
      
      const uploadsToday = activityData.filter(
        (activity) =>
          activity.activity === 'uploaded note' &&
          new Date(activity.timestamp).toDateString() === todayDateString
      ).length;

      const activeStudentNamesToday = new Set();
      activityData.forEach((activity) => {
        if (new Date(activity.timestamp).toDateString() === todayDateString) {
          activeStudentNamesToday.add(activity.name);
        }
      });
      const activeStudentsToday = activeStudentNamesToday.size;

      setSummaryStats({
        uploadsToday,
        activeStudentsToday,
        totalRecentActivities: activityData.length,
      });

    } catch (err) {
      console.error('Error fetching student activities:', err);
      setError('Failed to load student activities. Please try again later.');
    } finally {
      setLoading(false);
    }
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

    if (subjectFilter !== 'All') {
      currentFiltered = currentFiltered.filter((activity) => activity.subject === subjectFilter);
    }

    if (activityFilter !== 'All') {
      currentFiltered = currentFiltered.filter((activity) => activity.activity === activityFilter);
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
  if (loading && activities.length === 0) { // Show loading only on initial load
    return <div className="text-center p-4">Loading student activities...</div>;
  }

  // Conditional rendering for error state
  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  return (
    <div className="student-monitor p-4 md:p-6 bg-gray-50 min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-800">Student Activity Monitor</h2>

      {/* Summary Statistics Section */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-md lg:text-lg font-semibold text-gray-700">Uploads Today</h3>
          <p className="text-xl lg:text-2xl font-bold text-blue-600">{summaryStats.uploadsToday}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-md lg:text-lg font-semibold text-gray-700">Active Students Today</h3>
          <p className="text-xl lg:text-2xl font-bold text-green-600">{summaryStats.activeStudentsToday}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-md lg:text-lg font-semibold text-gray-700">Total Recent Activities (Last 20)</h3>
          <p className="text-xl lg:text-2xl font-bold text-purple-600">{summaryStats.totalRecentActivities}</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg shadow-md">
        <div className="flex-1">
          <label htmlFor="subject-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Subject
          </label>
          <select
            id="subject-filter"
            value={subjectFilter}
            onChange={handleSubjectFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="activity-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Activity Type
          </label>
          <select
            id="activity-filter"
            value={activityFilter}
            onChange={handleActivityFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Activity Type
              </th>
              <th className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-4 py-3 md:px-6 md:py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && activities.length > 0 && ( // Show subtle loading indicator during refresh
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-400 text-sm">
                  Refreshing activities...
                </td>
              </tr>
            )}
            {!loading && filteredActivities.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  No activities found matching your filters.
                </td>
              </tr>
            ) : (
              filteredActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-800">{activity.name}</td>
                  <td className="px-4 py-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600">{activity.activity}</td>
                  <td className="px-4 py-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600">{activity.subject || 'N/A'}</td>
                  <td className="px-4 py-4 md:px-6 md:py-4 whitespace-nowrap text-sm text-gray-600">{activity.timestamp}</td>
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
