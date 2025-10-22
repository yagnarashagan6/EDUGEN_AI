// StudentDashboardUtils.js
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // Assuming firebase.js is in this path

// --- UTILITY FUNCTIONS ---

export const saveTaskCompletion = async (task) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const taskId =
      task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");
    // Firestore rule: /students/{studentId}/task_status/{taskId}
    const taskStatusRef = doc(db, "students", user.uid, "task_status", taskId);
    await setDoc(taskStatusRef, {
      completed: true,
      topic: task.content,
      completedAt: new Date(),
    });
  } catch (err) {
    console.error("❌ Error saving task completion:", err);
  }
};

export const generateQuizWithFallback = async (requestBody) => {
  const primaryUrl =
    process.env.NODE_ENV === "production"
      ? "https://edugen-backend-zbjr.onrender.com/api/generate-quiz"
      : "http://localhost:10000/api/generate-quiz";
  const fallbackUrl =
    "https://edugen-ai-backend.onrender.com/api/generate-quiz";

  let lastError = null;

  // Try primary backend first (Node.js)
  try {
    // console.log(`Attempting primary quiz backend: ${primaryUrl}`);
    const response = await fetch(primaryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // If quota reached (429) or server error (5xx), try fallback
    if (response.status === 429 || response.status >= 500) {
      // console.log(
      //   `Primary quiz backend failed with status ${response.status}, trying fallback...`
      // );
      throw new Error(`Primary backend failed: ${response.status}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    return response;
  } catch (error) {
    lastError = error;
    // console.log(`Primary quiz backend failed: ${error.message}`);
  }

  // Try fallback backend (Python)
  try {
    // console.log(`Attempting fallback quiz backend: ${fallbackUrl}`);
    const response = await fetch(fallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Fallback server error: ${response.status}`
      );
    }

    return response;
  } catch (error) {
    console.error(`Fallback quiz backend also failed: ${error.message}`);
    // If fallback also fails, throw the last error
    throw lastError || error;
  }
};

export const formatTimeSpent = (ms) => {
  if (ms <= 0) return "0 minutes";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  let readableTime = "";
  if (hours > 0) readableTime += `${hours} hour${hours > 1 ? "s" : ""} `;
  if (minutes > 0 || hours === 0)
    readableTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return readableTime.trim() || "Less than a minute";
};

// Helper function to get overdue state from localStorage
export function getOverdueState(userId, taskId) {
  const taskIdentifier =
    taskId?.id || taskId?.content?.toLowerCase().replace(/\s+/g, "_") || taskId;
  const reasonKey = `overdueReason_${userId}_${taskIdentifier}`;
  const data = JSON.parse(localStorage.getItem(reasonKey) || "{}");

  // Debug logging
  // console.log(`Overdue state for task ${taskIdentifier}:`, data);

  return {
    submitted: !!data.submittedAt,
    canceledAt: data.canceledAt || null,
  };
}

// --- CONSTANTS ---

export const loadingIcons = [
  "fas fa-book",
  "fas fa-flask",
  "fas fa-calculator",
  "fas fa-lightbulb",
  "fas fa-brain",
  "fas fa-atom",
  "fas fa-graduation-cap",
  "fas fa-laptop-code",
  "fas fa-globe",
  "fas fa-microscope",
];

export const newsCategories = [
  { value: "general", label: "General" },
  { value: "technology", label: "Technology" },
  { value: "education", label: "Education" },
  { value: "science", label: "Science" },
  { value: "health", label: "Health" },
  { value: "business", label: "Business" },
  { value: "sports", label: "Sports" },
  { value: "entertainment", label: "Entertainment" },
];
