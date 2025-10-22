// StaffDashboardUtils.js
import {
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  getDocsFromServer,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase"; // Assuming firebase.js is in this path

// YouTube constants for controller
export const LANGUAGES = [
  { code: "ta", name: "Tamil" },
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
];

export const API_KEY = process.env.REACT_APP_YT_API_KEY;

export async function resolveChannelId(id) {
  if (id.startsWith("UC") && id.length === 24) return id;
  if (id.includes("youtube.com/channel/")) {
    const match = id.match(/youtube\.com\/channel\/([UC][^/?]+)/);
    return match ? match[1] : id;
  }
  if (id.includes("@")) {
    const handle = id.split("@")[1].split("/")[0];
    try {
      // Use channels API with forHandle for @handles
      const params = new URLSearchParams({
        key: API_KEY,
        part: "id",
        forHandle: handle,
      });
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?${params}`
      );
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
    } catch (e) {
      // Error resolving channel ID
    }
  }
  return id; // return original if can't resolve
}

export const CHANNELS = [
  {
    id: "UCrx-FlNM6BWOJvu3re6HH7w",
    name: "4G Silver Academy родрооро┐ро┤рпН",
    category: "Engineering",
    language: "ta",
  },
  {
    id: "UCwr-evhuzGZgDFrq_1pLt_A",
    name: "Error Makes Clever",
    category: "Coding",
    language: "ta",
  },
  {
    id: "UC4SVo0Ue36XCfOyb5Lh1viQ",
    name: "Bro Code",
    category: "Coding",
    language: "en",
  },
  {
    id: "UC8GD4akofUsOzgNpaiAisdQ",
    name: "Mathematics kala",
    category: "Maths",
    language: "ta",
  },
];

export const CATEGORY_LIST = Array.from(
  new Set(CHANNELS.map((c) => c.category))
);

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

// Reset all student streaks to 0
export const resetAllStreaksToZero = async () => {
  try {
    const studentsRef = collection(db, "students");
    const studentSnapshots = await getDocs(studentsRef);

    let resetCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateString = today.toISOString().split("T")[0];

    for (const studentDoc of studentSnapshots.docs) {
      const studentId = studentDoc.id;
      const studentRef = doc(db, "students", studentId);

      // Reset streak to 0 and initialize daily session tracking
      await updateDoc(studentRef, {
        streak: 0,
        lastLogin: Timestamp.now(),
        dailySessions: {
          [todayDateString]: false,
        },
        lastStreakResetDate: Timestamp.now(),
        totalSessionTime: 0,
      });

      resetCount++;
    }

    return {
      success: true,
      message: `Reset streaks for ${resetCount} students`,
      resetCount,
    };
  } catch (error) {
    throw new Error("Failed to reset streaks: " + error.message);
  }
};

// Delete all students with "Unknown" name from Firebase
export const deleteUnknownStudents = async () => {
  try {
    const studentsRef = collection(db, "students");
    const studentSnapshots = await getDocs(studentsRef);

    let deleteCount = 0;
    const unknownStudentIds = [];

    // Find all students with "Unknown" name
    for (const studentDoc of studentSnapshots.docs) {
      const studentData = studentDoc.data();
      if (
        studentData.name === "Unknown" ||
        !studentData.name ||
        studentData.name.trim() === ""
      ) {
        unknownStudentIds.push(studentDoc.id);
      }
    }

    // Delete each unknown student
    for (const studentId of unknownStudentIds) {
      await deleteDoc(doc(db, "students", studentId));
      deleteCount++;
    }

    return {
      success: true,
      message: `Deleted ${deleteCount} unknown students`,
      deleteCount,
    };
  } catch (error) {
    throw new Error("Failed to delete unknown students: " + error.message);
  }
};

// Calculate overall performance based on tasks posted by the staff
export const calculateAndStoreOverallPerformance = async (
  allStudents,
  staffId,
  allTasks
) => {
  try {
    // Filter tasks posted by this staff
    const staffTasks = allTasks.filter((task) => task.staffId === staffId);

    // --- OPTIMIZATION ---
    // Add a guard clause for if no tasks are posted by this staff.
    if (!staffTasks || staffTasks.length === 0) {
      // Store in staff document under stats field
      const overallStatsRef = doc(db, "staff", staffId);
      await setDoc(
        overallStatsRef,
        {
          stats: {
            overallPercentage: 0,
            totalStudents: allStudents.length,
            activeStudents: 0,
            lastUpdated: Timestamp.now(),
            totalProgressPoints: 0,
            maxPossiblePoints: 0,
          },
        },
        { merge: true }
      );
      return 0;
    }

    if (!allStudents || allStudents.length === 0) {
      const overallStatsRef = doc(db, "staff", staffId);
      await setDoc(
        overallStatsRef,
        {
          stats: {
            overallPercentage: 0,
            totalStudents: 0,
            activeStudents: 0,
            lastUpdated: Timestamp.now(),
            totalProgressPoints: 0,
            maxPossiblePoints: 0,
          },
        },
        { merge: true }
      );
      return 0;
    }

    let totalProgressPoints = 0;
    let activeStudentsCount = 0;

    // For each student, calculate completion rate for this staff's tasks
    for (const student of allStudents) {
      try {
        const taskStatusRef = collection(
          db,
          "students",
          student.id,
          "task_status"
        );
        const taskStatusSnap = await getDocs(taskStatusRef);
        const taskStatuses = {};
        taskStatusSnap.docs.forEach((doc) => {
          taskStatuses[doc.id] = doc.data();
        });

        let completedCount = 0;
        staffTasks.forEach((task) => {
          const taskId =
            task.id || task.content?.toLowerCase().replace(/\s+/g, "_");
          if (taskStatuses[taskId]?.completed) {
            completedCount++;
          }
        });

        const studentProgress =
          staffTasks.length > 0
            ? (completedCount / staffTasks.length) * 100
            : 0;
        totalProgressPoints += studentProgress;

        if (studentProgress > 0) {
          activeStudentsCount++;
        }
      } catch (err) {
        console.warn(
          `Error calculating progress for student ${student.id}:`,
          err
        );
      }
    }

    const maxPossiblePoints = allStudents.length * 100; // Each student can have max 100% for this staff's tasks
    const overallPerformancePercentage = Math.round(
      (totalProgressPoints / maxPossiblePoints) * 100
    );

    // Store in staff document under stats field
    const overallStatsRef = doc(db, "staff", staffId);
    await setDoc(
      overallStatsRef,
      {
        stats: {
          overallPercentage: overallPerformancePercentage,
          totalStudents: allStudents.length,
          activeStudents: activeStudentsCount,
          lastUpdated: Timestamp.now(),
          totalProgressPoints: totalProgressPoints,
          maxPossiblePoints: maxPossiblePoints,
        },
      },
      { merge: true }
    );

    return overallPerformancePercentage;
  } catch (error) {
    console.error("Error calculating overall performance:", error);
    return 0;
  }
};
