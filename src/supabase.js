import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://atvczvzygjsqrelrwtic.supabase.co";
const supabaseAnonKey = "sb_publishable_9_1I8G64_9dscsA6rAL9Ig_V-sG3fEW";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Normalize Supabase error objects into Error instances with readable messages
function normalizeError(err) {
  if (!err) return new Error("Unknown error");
  if (err instanceof Error) return err;
  try {
    const message = err?.message || (typeof err === "object" ? JSON.stringify(err) : String(err));
    return new Error(message);
  } catch (e) {
    return new Error(String(err));
  }
}

// Auth helper functions that mirror Firebase auth API
export const supabaseAuth = {
  currentUser: null,

  // Initialize auth state listener
  onAuthStateChanged(callback) {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser = session?.user
        ? {
          uid: session.user.id,
          email: session.user.email,
          displayName:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0],
        }
        : null;
      callback(this.currentUser);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser = session?.user
        ? {
          uid: session.user.id,
          email: session.user.email,
          displayName:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0],
        }
        : null;
      callback(this.currentUser);
    });

    // Return unsubscribe function
    return () => subscription.unsubscribe();
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw normalizeError(error);
    this.currentUser = null;
  },
};

// Sign in with email and password
export const signInWithEmailAndPassword = async (
  authInstance,
  email,
  password
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw normalizeError(error);

  // Update currentUser immediately
  supabaseAuth.currentUser = {
    uid: data.user.id,
    email: data.user.email,
    displayName:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0],
  };

  return {
    user: supabaseAuth.currentUser,
  };
};

// Create user with email and password
export const createUserWithEmailAndPassword = async (
  authInstance,
  email,
  password
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw normalizeError(error);

  // Update currentUser immediately
  supabaseAuth.currentUser = {
    uid: data.user.id,
    email: data.user.email,
    displayName:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0],
  };

  return {
    user: supabaseAuth.currentUser,
  };
};

// Sign in with Google OAuth
export const signInWithPopup = async (authInstance, provider) => {
  // Determine the correct redirect URL based on environment
  const baseUrl = window.location.origin;
  const currentPath = window.location.pathname;
  
  // For student login, redirect back to student-login page
  // For staff login, redirect back to staff-login page
  let redirectPath = '/student-login'; // default
  if (currentPath.includes('staff')) {
    redirectPath = '/staff-login';
  } else if (currentPath.includes('student')) {
    redirectPath = '/student-login';
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: baseUrl + redirectPath,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw normalizeError(error);

  // For OAuth, the redirect will happen and onAuthStateChange will handle the rest
  // Return a promise that never resolves (the page will redirect)
  return new Promise(() => { });
};

// Google provider placeholder (not used directly with Supabase, kept for API compatibility)
export const googleProvider = { providerId: "google.com" };

// ============================================
// NOTES FUNCTIONS
// ============================================

/**
 * Fetch all notes accessible to the current user
 * @returns {Promise<Array>} Array of notes
 */
export const fetchNotes = async () => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw normalizeError(error);

    // Filter notes based on sharedWith (all or includes current user's ID)
    const filtered = data.filter(
      (note) =>
        note.shared_with?.includes("all") ||
        note.shared_with?.includes(currentUser.uid)
    );

    return filtered;
  } catch (error) {
    console.error("Error fetching notes:", error);
    throw normalizeError(error);
  }
};

/**
 * Add a new note
 * @param {Object} noteData - Note data to add
 * @returns {Promise<Object>} Created note
 */
export const addNote = async (noteData) => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const noteToInsert = {
      title: noteData.title,
      description: noteData.description,
      url: noteData.url,
      type: noteData.type,
      subject: noteData.subject,
      shared_with: noteData.sharedWith || ["all"],
      user_id: currentUser.uid,
      name: noteData.name || currentUser.displayName,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notes")
      .insert([noteToInsert])
      .select()
      .single();

    if (error) throw normalizeError(error);

    return data;
  } catch (error) {
    console.error("Error adding note:", error);
    throw normalizeError(error);
  }
};

/**
 * Delete a note by ID
 * @param {string} noteId - ID of the note to delete
 * @returns {Promise<void>}
 */
export const deleteNote = async (noteId) => {
  try {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting note:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to real-time notes updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotes = (callback) => {
  const currentUser = supabaseAuth.currentUser;
  if (!currentUser) {
    console.warn("No authenticated user for notes subscription");
    return () => { };
  }

  const channel = supabase
    .channel("notes-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notes",
      },
      async (payload) => {
        // Fetch all notes and filter
        const notes = await fetchNotes();
        callback(notes);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch all students
 * @returns {Promise<Array>} Array of students
 */
export const fetchStudents = async () => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw normalizeError(error);

    return data.map((student) => ({
      id: student.id,
      name: student.name || "Unknown",
    }));
  } catch (error) {
    console.error("Error fetching students:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to real-time students updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToStudents = (callback) => {
  const channel = supabase
    .channel("students-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "students",
      },
      async (payload) => {
        // Fetch all students
        const students = await fetchStudents();
        callback(students);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch user name by user ID
 * @param {string} userId - User ID
 * @returns {Promise<string>} User name
 */
export const fetchUserName = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("name")
      .eq("id", userId)
      .single();

    if (error) throw normalizeError(error);

    return data?.name || "Unknown";
  } catch (error) {
    console.error("Error fetching user name:", error);
    return "Unknown";
  }
};

// ============================================
// MESSAGES/CHAT FUNCTIONS
// ============================================

/**
 * Send a message to a private chat between staff and student
 * @param {string} text - Message text
 * @param {string} selectedUserId - ID of the other user (staff or student)
 * @param {string} userRole - Current user's role ('staff' or 'student')
 * @returns {Promise<void>}
 */
export const sendMessage = async (text, selectedUserId, userRole) => {
  if (!text || !selectedUserId) return;

  const currentUser = supabaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  const userId = currentUser.uid;
  const isStaff = userRole === "staff";

  // Determine staff_id and student_id
  const staffId = isStaff ? userId : selectedUserId;
  const studentId = isStaff ? selectedUserId : userId;

  // Create unique ID for this conversation
  const conversationId = `${staffId}_${studentId}`;

  const newMessage = {
    text,
    sender: isStaff ? "staff" : "student",
    senderId: userId,
    timestamp: new Date().toISOString(),
    read: false,
  };

  try {
    // Fetch existing messages
    const { data: existingChat, error: fetchError } = await supabase
      .from("messages")
      .select("messages, id")
      .eq("staff_id", staffId)
      .eq("student_id", studentId)
      .single();

    let messages = [];
    let recordId = conversationId;

    if (existingChat && !fetchError) {
      messages = existingChat.messages || [];
      recordId = existingChat.id;
    }

    // Add new message
    messages.push(newMessage);

    // Upsert (insert or update)
    const { error: upsertError } = await supabase
      .from("messages")
      .upsert(
        {
          id: recordId,
          staff_id: staffId,
          student_id: studentId,
          messages: messages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) throw normalizeError(upsertError);
  } catch (error) {
    console.error("Error sending message:", error);
    throw normalizeError(error);
  }
};


/**
 * Subscribe to real-time messages in a private chat
 * @param {string} selectedUserId - ID of the other user
 * @param {string} userRole - Current user's role ('staff' or 'student')
 * @param {Function} setMessages - Callback to update messages
 * @returns {Function} Unsubscribe function
 */
export const subscribeToMessages = (selectedUserId, userRole, setMessages) => {
  const currentUser = supabaseAuth.currentUser;
  if (!currentUser) {
    console.warn("No authenticated user for messages subscription");
    setMessages([]);
    return () => { };
  }

  const userId = currentUser.uid;
  const isStaff = userRole === "staff";

  // Determine staff_id and student_id
  const staffId = isStaff ? userId : selectedUserId;
  const studentId = isStaff ? selectedUserId : userId;

  console.log("🔔 Setting up message subscription:", { staffId, studentId, userRole });

  // Subscribe to changes on the messages table
  const channel = supabase
    .channel(`messages:${staffId}_${studentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `id=eq.${staffId}_${studentId}`,
      },
      async (payload) => {
        console.log("📨 Real-time message update received:", payload);

        // Fetch the latest messages whenever there's a change
        const { data, error } = await supabase
          .from("messages")
          .select("messages")
          .eq("staff_id", staffId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (!error && data) {
          console.log("✅ Setting messages from real-time update:", data.messages);
          setMessages(data.messages || []);
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Subscription status:", status);
    });

  // Fetch initial messages
  console.log("📥 Fetching initial messages...");
  console.log("🔍 Query params:", {
    staff_id: staffId,
    student_id: studentId,
    currentUserId: userId,
    selectedUserId,
    userRole
  });

  supabase
    .from("messages")
    .select("*") // Select all columns to see what's there
    .eq("staff_id", staffId)
    .eq("student_id", studentId)
    .maybeSingle() // Use maybeSingle() to handle case when no messages exist yet
    .then(({ data, error }) => {
      console.log("📬 Initial messages fetch result:", { data, error });
      if (data && !error) {
        console.log("✅ Setting initial messages:", data.messages);
        setMessages(data.messages || []);
      } else {
        console.log("ℹ️ No messages found, setting empty array");
        console.log("💡 Try checking database with these IDs:", { staffId, studentId });
        setMessages([]);
      }
    })
    .catch((err) => {
      console.error("❌ Error fetching messages:", err);
      setMessages([]);
    });

  return () => {
    console.log("🔕 Unsubscribing from messages");
    supabase.removeChannel(channel);
  };
};

/**
 * Mark messages as read in a private chat
 * @param {string} selectedUserId - ID of the other user
 * @param {string} userRole - Current user's role ('staff' or 'student')
 * @returns {Promise<void>}
 */
export const markMessagesAsRead = async (selectedUserId, userRole) => {
  const currentUser = supabaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("No authenticated user");
  }

  const userId = currentUser.uid;
  const isStaff = userRole === "staff";

  // Determine staff_id and student_id
  const staffId = isStaff ? userId : selectedUserId;
  const studentId = isStaff ? selectedUserId : userId;

  try {
    // Fetch existing chat
    const { data: existingChat, error: fetchError } = await supabase
      .from("messages")
      .select("messages, id")
      .eq("staff_id", staffId)
      .eq("student_id", studentId)
      .single();

    if (fetchError || !existingChat) {
      console.warn("No messages to mark as read");
      return;
    }

    const messages = existingChat.messages || [];

    // Mark messages from the other user as read
    const updatedMessages = messages.map((msg) =>
      msg.sender !== (isStaff ? "staff" : "student") && !msg.read
        ? { ...msg, read: true }
        : msg
    );

    // Update in database
    const { error: updateError } = await supabase
      .from("messages")
      .update({
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingChat.id);

    if (updateError) throw normalizeError(updateError);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw normalizeError(error);
  }
};

// ============================================
// TASKS AND TASK STATUS FUNCTIONS
// ============================================

/**
 * Fetch all shared tasks
 * @returns {Promise<Array>} Array of tasks
 */
export const fetchTasks = async () => {
  try {
    // Tasks are stored in a single document with ID '00000000-0000-0000-0000-000000000001'
    const { data, error } = await supabase
      .from("tasks")
      .select("tasks")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" - that's okay
      throw normalizeError(error);
    }

    return data?.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

/**
 * Save/update all shared tasks
 * @param {Array} tasks - Array of task objects
 * @returns {Promise<void>}
 */
export const saveTasks = async (tasks) => {
  try {
    const { error } = await supabase
      .from("tasks")
      .upsert(
        {
          id: "00000000-0000-0000-0000-000000000001",
          tasks: tasks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving tasks:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to real-time tasks updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTasks = (callback) => {
  const channel = supabase
    .channel("tasks-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: "id=eq.00000000-0000-0000-0000-000000000001",
      },
      async (payload) => {
        if (payload.new && payload.new.tasks) {
          callback(payload.new.tasks);
        } else {
          const tasks = await fetchTasks();
          callback(tasks);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Save task completion status for a student
 * @param {Object} task - Task object with id or content
 * @returns {Promise<void>}
 */
export const saveTaskCompletion = async (task) => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const taskId =
      task?.id || task?.content?.toLowerCase().replace(/\s+/g, "_");

    const { error } = await supabase.from("task_status").upsert(
      {
        student_id: currentUser.uid,
        task_id: taskId,
        completed: true,
        topic: task.content,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,task_id" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving task completion:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch task completion statuses for a student
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @returns {Promise<Object>} Object with taskId as key and status as value
 */
export const fetchTaskStatuses = async (studentId = null) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    const { data, error } = await supabase
      .from("task_status")
      .select("*")
      .eq("student_id", userId);

    if (error) throw normalizeError(error);

    // Convert array to object with task_id as key
    const taskStatuses = {};
    data.forEach((status) => {
      taskStatuses[status.task_id] = {
        completed: status.completed,
        topic: status.topic,
        completedAt: status.completed_at,
      };
    });

    return taskStatuses;
  } catch (error) {
    console.error("Error fetching task statuses:", error);
    return {};
  }
};

/**
 * Subscribe to real-time task status updates for a student
 * @param {string} studentId - Student ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskStatuses = (studentId, callback) => {
  const userId = studentId || supabaseAuth.currentUser?.uid;
  if (!userId) {
    console.warn("No user ID for task status subscription");
    return () => { };
  }

  // Initial fetch
  fetchTaskStatuses(userId).then(callback);

  const channel = supabase
    .channel(`task-status-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "task_status",
        filter: `student_id=eq.${userId}`,
      },
      async (payload) => {
        // Refetch all statuses
        const statuses = await fetchTaskStatuses(userId);
        callback(statuses);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Delete a task status
 * @param {string} taskId - Task ID
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @returns {Promise<void>}
 */
export const deleteTaskStatus = async (taskId, studentId = null) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    const { error } = await supabase
      .from("task_status")
      .delete()
      .eq("student_id", userId)
      .eq("task_id", taskId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting task status:", error);
    throw normalizeError(error);
  }
};

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Upload a file to Supabase Storage
 * @param {File} file - File to upload
 * @param {string} folder - Folder name (e.g., 'notes', 'assignments')
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadFile = async (file, folder = "notes") => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}_${file.name}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("files") // bucket name
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw normalizeError(error);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("files").getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw normalizeError(error);
  }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileUrl) => {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split("/files/");
    if (urlParts.length < 2) {
      throw new Error("Invalid file URL");
    }
    const filePath = urlParts[1];

    const { error } = await supabase.storage.from("files").remove([filePath]);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw normalizeError(error);
  }
};

// ============================================
// STUDENT PROFILE FUNCTIONS
// ============================================

/**
 * Fetch student data by ID
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @returns {Promise<Object>} Student data
 */
export const fetchStudentData = async (studentId = null) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      throw normalizeError(error);
    }

    // Convert snake_case fields to camelCase for frontend compatibility
    if (data) {
      return {
        ...data,
        regNumber: data.reg_number || data.regNumber,
        rollNumber: data.roll_number || data.rollNumber,
        bloodGroup: data.blood_group || data.bloodGroup,
        studentContact: data.student_contact || data.studentContact,
        photoURL: data.photo_url || data.photoURL || data.image,
        lastLogin: data.last_login || data.lastLogin,
        quizCount: data.quiz_count || data.quizCount,
        totalTimeSpentInMs: data.total_time_spent_ms || data.totalTimeSpentInMs,
        formFilled: data.form_filled || data.formFilled,
      };
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching student data:", error);
    return null;
  }
};

/**
 * Update student data
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateStudentData = async (studentId = null, data) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    // Convert field names to snake_case
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.displayName !== undefined) updateData.display_name = data.displayName;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.streak !== undefined) updateData.streak = data.streak;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.quizCount !== undefined) updateData.quiz_count = data.quizCount;
    if (data.lastLogin !== undefined) updateData.last_login = data.lastLogin;
    if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.totalTimeSpentInMs !== undefined)
      updateData.total_time_spent_ms = data.totalTimeSpentInMs;
    if (data.dailySessions !== undefined)
      updateData.daily_sessions = data.dailySessions;
    if (data.formFilled !== undefined) updateData.form_filled = data.formFilled;
    if (data.regNumber !== undefined) updateData.reg_number = data.regNumber;
    if (data.rollNumber !== undefined) updateData.roll_number = data.rollNumber;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.bloodGroup !== undefined) updateData.blood_group = data.bloodGroup;
    if (data.studentContact !== undefined) updateData.student_contact = data.studentContact;

    updateData.updated_at = new Date().toISOString();

    console.log("Updating student data:", { id: userId, ...updateData });

    // Use upsert to handle both update and creation of student records
    const { data: result, error } = await supabase
      .from("students")
      .upsert({ id: userId, ...updateData }, { onConflict: "id" })
      .select();

    if (error) {
      console.error("Supabase error details:", error);
      const message = error?.message || '';
      
      // Handle duplicate email constraint
      if (message.includes('students_email_key') || message.includes('duplicate key')) {
        console.warn('Duplicate email detected - student record may already exist');
        // Try to fetch the existing student data instead
        const existingData = await fetchStudentData(userId);
        if (existingData) {
          console.log('Found existing student data, returning it instead');
          return existingData;
        }
        throw new Error('Student record with this email already exists. Please ensure RLS policies are configured correctly.');
      }
      
      // If row-level security is preventing client-side upsert, fallback to server endpoint
      if (message.toLowerCase().includes('row-level security') || message.toLowerCase().includes('using expression')) {
        try {
          console.warn('RLS detected - delegating upsert to backend');
          const serviceSecret = process.env.REACT_APP_SERVICE_SECRET || '';
          // Determine backend URL: use explicit env var, otherwise default to localhost:10000 in dev
          const backendUrl =
            process.env.REACT_APP_BACKEND_URL ||
            (window.location.hostname === 'localhost'
              ? 'http://localhost:10000'
              : window.location.origin);
          const resp = await fetch(`${backendUrl}/api/upsert-student`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-service-secret': serviceSecret,
            },
            body: JSON.stringify({ id: userId, data: data }),
          });

          if (!resp.ok) {
            const text = await resp.text();
            throw new Error('Server upsert failed: ' + text);
          }

          return await resp.json();
        } catch (backendErr) {
          console.error('Backend upsert failed:', backendErr);
          throw normalizeError(backendErr);
        }
      }

      throw normalizeError(error);
    }

    console.log("Student data updated successfully:", result);
    return result;
  } catch (error) {
    console.error("Error updating student data:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch all students
 * @returns {Promise<Array>} Array of students
 */
export const fetchAllStudents = async () => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw normalizeError(error);

    // Convert snake_case to camelCase for compatibility
    return data.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      dob: student.dob,
      streak: student.streak,
      progress: student.progress,
      quizCount: student.quiz_count,
      lastLogin: student.last_login,
      photoURL: student.photo_url,
      totalTimeSpentInMs: student.total_time_spent_ms,
      dailySessions: student.daily_sessions,
    }));
  } catch (error) {
    console.error("Error fetching all students:", error);
    return [];
  }
};

// ============================================
// STAFF PROFILE FUNCTIONS
// ============================================

/**
 * Fetch staff data by ID
 * @param {string} staffId - Staff ID (optional, defaults to current user)
 * @returns {Promise<Object>} Staff data
 */
export const fetchStaffData = async (staffId = null) => {
  try {
    const userId = staffId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw normalizeError(error);
    }

    // Convert snake_case to camelCase for frontend compatibility
    if (data) {
      return {
        ...data,
        staffId: data.staff_id || data.staffId,
        contactNumber: data.contact_number || data.contactNumber,
        formFilled: data.form_filled || data.formFilled,
        photoURL: data.photo_url || data.photoURL || data.image,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching staff data:", error);
    return null;
  }
};

/**
 * Update staff stats
 * @param {string} staffId - Staff ID
 * @param {Object} stats - Stats object to update
 * @returns {Promise<void>}
 */
export const updateStaffStats = async (staffId, stats) => {
  try {
    const { error } = await supabase
      .from("staff")
      .upsert(
        {
          id: staffId,
          stats: stats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error updating staff stats:", error);
    throw normalizeError(error);
  }
};

/**
 * Update staff data
 * @param {string} staffId - Staff ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateStaffData = async (staffId, data) => {
  try {
    const updateData = {
      id: staffId, // Always include id for upsert
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    // The `staff` table does not have a `display_name` column; map displayName to `name` instead
    if (data.displayName !== undefined) updateData.name = data.displayName;
    if (data.username !== undefined) updateData.username = data.username;

    // Log payload for debugging Supabase requests
    console.log("Upserting staff data:", updateData);
    if (data.staffId !== undefined) updateData.staff_id = data.staffId;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.contactNumber !== undefined) updateData.contact_number = data.contactNumber;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.formFilled !== undefined)
      updateData.form_filled = data.formFilled;
    if (data.stats !== undefined) updateData.stats = data.stats;

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("staff")
      .upsert(updateData, { onConflict: "email" });

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error updating staff data:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to a single staff member or all staff members
 * @param {string|Function} staffIdOrCallback - Staff ID or callback function
 * @param {Function} callback - Callback function (if staffId is provided)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToStaff = (staffIdOrCallback, callback) => {
  // If only one argument, subscribe to all staff
  if (typeof staffIdOrCallback === 'function') {
    const cb = staffIdOrCallback;
    const channel = supabase
      .channel("staff-all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "staff",
        },
        () => {
          // Fetch all staff when any change occurs
          fetchAllStaff().then(cb);
        }
      )
      .subscribe();

    // Fetch initial data
    fetchAllStaff().then(cb);

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Subscribe to a single staff member
  const staffId = staffIdOrCallback;
  const channel = supabase
    .channel(`staff-${staffId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "staff",
        filter: `id=eq.${staffId}`,
      },
      () => {
        // Fetch staff data when change occurs
        fetchStaffData(staffId).then(callback);
      }
    )
    .subscribe();

  // Fetch initial data
  fetchStaffData(staffId).then(callback);

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch all staff members
 * @returns {Promise<Array>} Array of staff
 */
const fetchAllStaff = async () => {
  try {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw normalizeError(error);

    // Convert snake_case to camelCase
    return (data || []).map((staff) => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      displayName: staff.display_name || staff.name || null,
      photoURL: staff.photo_url || "/default-staff.png",
      role: staff.role,
      department: staff.department,
      subject: staff.subject,
      stats: staff.stats,
    }));
  } catch (error) {
    console.error("Error fetching all staff:", error);
    return [];
  }
};


// ============================================
// GOALS FUNCTIONS
// ============================================

/**
 * Fetch goals for a student
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @returns {Promise<Array>} Array of goals
 */
export const fetchGoals = async (studentId = null) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    } 

    const { data, error } = await supabase
      .from("goals")
      .select("*")  // Select all columns to avoid 406 errors
      .eq("student_id", userId)
      .maybeSingle();  // Use maybeSingle instead of single to handle non-existent records

    if (error) {
      console.error("Supabase goals fetch error:", error);
      // Don't throw on 406 or PGRST116, just return empty array
      if (error.code === "PGRST116" || error.message?.includes("406")) {
        console.warn("No goals found or 406 error, returning empty array");
        return [];
      }
      throw normalizeError(error);
    }

    return data?.goals || [];
  } catch (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
};

/**
 * Save goals for a student
 * @param {string} studentId - Student ID (optional, defaults to current user)
 * @param {Array} goals - Array of goal objects
 * @returns {Promise<void>}
 */
export const saveGoals = async (studentId = null, goals) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    const { error } = await supabase.from("goals").upsert(
      {
        student_id: userId,
        goals: goals,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving goals:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to real-time goals updates for a student
 * @param {string} studentId - Student ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToGoals = (studentId, callback) => {
  const userId = studentId || supabaseAuth.currentUser?.uid;
  if (!userId) {
    console.warn("No user ID for goals subscription");
    return () => { };
  }

  // Initial fetch
  fetchGoals(userId).then(callback);

  const channel = supabase
    .channel(`goals-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "goals",
        filter: `student_id=eq.${userId}`,
      },
      async (payload) => {
        if (payload.new && payload.new.goals) {
          callback(payload.new.goals);
        } else {
          const goals = await fetchGoals(userId);
          callback(goals);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};



// ============================================
// ASSIGNMENTS FUNCTIONS
// ============================================

/**
 * Fetch all assignments
 * @param {string} staffId - Optional staff ID to filter by
 * @returns {Promise<Array>} Array of assignments
 */
export const fetchAssignments = async (staffId = null) => {
  try {
    let query = supabase
      .from("assignments")
      .select("*")
      .order("posted_at", { ascending: false });

    if (staffId) {
      query = query.eq("staff_id", staffId);
    }

    const { data, error } = await query;

    if (error) throw normalizeError(error);

    // Convert snake_case to camelCase
    return data.map((assignment) => ({
      id: assignment.id,
      subject: assignment.subject,
      driveLink: assignment.drive_link,
      deadline: assignment.deadline,
      postedAt: assignment.posted_at,
      staffId: assignment.staff_id,
    }));
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return [];
  }
};

/**
 * Add a new assignment
 * @param {Object} assignmentData - Assignment data
 * @returns {Promise<Object>} Created assignment
 */
export const addAssignment = async (assignmentData) => {
  try {
    const { data, error } = await supabase
      .from("assignments")
      .insert([
        {
          subject: assignmentData.subject,
          drive_link: assignmentData.driveLink,
          deadline: assignmentData.deadline,
          posted_at: assignmentData.postedAt || new Date().toISOString(),
          staff_id: assignmentData.staffId,
        },
      ])
      .select()
      .single();

    if (error) throw normalizeError(error);

    return {
      id: data.id,
      subject: data.subject,
      driveLink: data.drive_link,
      deadline: data.deadline,
      postedAt: data.posted_at,
      staffId: data.staff_id,
    };
  } catch (error) {
    console.error("Error adding assignment:", error);
    throw normalizeError(error);
  }
};

/**
 * Delete an assignment
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<void>}
 */
export const deleteAssignment = async (assignmentId) => {
  try {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting assignment:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch a student's submission for a specific assignment
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<Object|null>} Submission data or null if not found
 */
export const fetchSubmission = async (studentId, assignmentId) => {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error when no rows

    // maybeSingle() returns null if no rows found, which is fine
    if (error) {
      // Only throw if it's a real error, not "no rows"
      if (error.code !== "PGRST116") {
        throw normalizeError(error);
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching submission:", error);
    return null; // Return null instead of throwing to avoid breaking the UI
  }
};

/**
 * Subscribe to real-time assignments updates
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAssignments = (callback) => {
  // Initial fetch
  fetchAssignments().then(callback);

  const channel = supabase
    .channel("assignments-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "assignments",
      },
      async (payload) => {
        const assignments = await fetchAssignments();
        callback(assignments);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// SUBMISSIONS FUNCTIONS
// ============================================

/**
  }
};

/**
 * Save submission for a student and assignment
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @param {Object} submissionData - Submission data
 * @returns {Promise<void>}
 */
export const saveSubmission = async (studentId, assignmentId, submissionData) => {
  try {
    const { error } = await supabase.from("submissions").upsert(
      {
        student_id: studentId,
        assignment_id: assignmentId,
        link: submissionData.link,
        download_link: submissionData.downloadLink,
        submitted_at: submissionData.submittedAt || new Date().toISOString(),
        file_name: submissionData.fileName,
        file_type: submissionData.fileType,
        resource_type: submissionData.resourceType,
        public_id: submissionData.publicId,
      },
      { onConflict: "student_id,assignment_id" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving submission:", error);
    throw normalizeError(error);
  }
};

/**
 * Delete submission for a student and assignment
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<void>}
 */
export const deleteSubmission = async (studentId, assignmentId) => {
  try {
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting submission:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to real-time submission updates
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSubmission = (studentId, assignmentId, callback) => {
  // Initial fetch
  fetchSubmission(studentId, assignmentId).then(callback);

  const channel = supabase
    .channel(`submission-${studentId}-${assignmentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "submissions",
        filter: `student_id=eq.${studentId},assignment_id=eq.${assignmentId}`,
      },
      async (payload) => {
        const submission = await fetchSubmission(studentId, assignmentId);
        callback(submission);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// MARKS FUNCTIONS
// ============================================

/**
 * Fetch marks for a student and assignment
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<Object|null>} Marks data or null
 */
export const fetchMarks = async (studentId, assignmentId) => {
  try {
    const { data, error } = await supabase
      .from("marks")
      .select("*")
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw normalizeError(error);
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching marks:", error);
    return null;
  }
};

/**
 * Save marks for a student and assignment
 * @param {string} studentId - Student ID
 * @param {string} assignmentId - Assignment ID
 * @param {Object} marksData - Marks data (marks, feedback)
 * @returns {Promise<void>}
 */
export const saveMarks = async (studentId, assignmentId, marksData) => {
  try {
    const { error } = await supabase.from("marks").upsert(
      {
        student_id: studentId,
        assignment_id: assignmentId,
        marks: marksData.marks,
        feedback: marksData.feedback,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,assignment_id" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving marks:", error);
    throw normalizeError(error);
  }
};




// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

/**
 * Fetch leaderboard data
 * @param {number} limit - Optional limit for top N students
 * @returns {Promise<Array>} Array of leaderboard entries
 */
export const fetchLeaderboard = async (limit = null) => {
  try {
    let query = supabase
      .from("leaderboard")
      .select("*")
      .order("progress", { ascending: false })
      .order("streak", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw normalizeError(error);

    return data || [];
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

/**
 * Update leaderboard entry for a student
 * @param {string} studentId - Student ID
 * @param {string} name - Student name
 * @param {number} streak - Student streak
 * @param {number} progress - Student progress
 * @returns {Promise<void>}
 */
export const updateLeaderboard = async (studentId, name, streak, progress) => {
  try {
    const { error } = await supabase.from("leaderboard").upsert(
      {
        student_id: studentId,
        name: name,
        streak: streak,
        progress: progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    throw normalizeError(error);
  }
};

// ============================================
// SETTINGS FUNCTIONS
// ============================================

/**
 * Fetch settings by key
 * @param {string} settingKey - Setting key (e.g., 'youtube')
 * @returns {Promise<Object|null>} Setting value or null
 */
export const fetchSettings = async (settingKey) => {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .single();

    if (error && error.code !== "PGRST116") {
      throw normalizeError(error);
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
};

/**
 * Save settings
 * @param {string} settingKey - Setting key (e.g., 'youtube')
 * @param {Object} settingValue - Setting value object
 * @param {string} updatedBy - User ID who updated the setting
 * @returns {Promise<void>}
 */
export const saveSettings = async (settingKey, settingValue, updatedBy = null) => {
  try {
    const userId = updatedBy || supabaseAuth.currentUser?.uid;

    const { error } = await supabase.from("settings").upsert(
      {
        setting_key: settingKey,
        setting_value: settingValue,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error saving settings:", error);
    throw normalizeError(error);
  }
};

/**
 * Subscribe to settings changes
 * @param {string} settingKey - Setting key to subscribe to
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSettings = (settingKey, callback) => {
  const channel = supabase
    .channel(`settings-${settingKey}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "settings",
        filter: `setting_key=eq.${settingKey}`,
      },
      (payload) => {
        callback(payload.new?.setting_value || null);
      }
    )
    .subscribe();

  // Also fetch initial value
  fetchSettings(settingKey).then((value) => {
    callback(value);
  });

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// CIRCULARS FUNCTIONS
// ============================================

/**
 * Fetch all circulars
 * @returns {Promise<Array>} Array of circulars
 */
export const fetchCirculars = async () => {
  try {
    const { data, error } = await supabase
      .from("circulars")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw normalizeError(error);

    return data || [];
  } catch (error) {
    console.error("Error fetching circulars:", error);
    return [];
  }
};

/**
 * Add a new circular
 * @param {Object} circularData - Circular data
 * @returns {Promise<Object>} Created circular
 */
export const addCircular = async (circularData) => {
  try {
    const { data, error } = await supabase
      .from("circulars")
      .insert([
        {
          title: circularData.title,
          content: circularData.content,
          circular_data: circularData.circularData || circularData,
        },
      ])
      .select()
      .single();

    if (error) throw normalizeError(error);

    return data;
  } catch (error) {
    console.error("Error adding circular:", error);
    throw normalizeError(error);
  }
};

/**
 * Delete a circular
 * @param {string} circularId - Circular ID
 * @returns {Promise<void>}
 */
export const deleteCircular = async (circularId) => {
  try {
    const { error } = await supabase
      .from("circulars")
      .delete()
      .eq("id", circularId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting circular:", error);
    throw normalizeError(error);
  }
};




// ============================================
// STAFF UTILITY FUNCTIONS
// ============================================

/**
 * Reset all student streaks to zero
 * @returns {Promise<Object>} Result object with success status and count
 */
export const resetAllStreaksToZero = async () => {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("id");

    if (error) throw normalizeError(error);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateString = today.toISOString().split("T")[0];

    let resetCount = 0;

    for (const student of students) {
      const { error: updateError } = await supabase
        .from("students")
        .update({
          streak: 0,
          last_login: new Date().toISOString(),
          daily_sessions: {
            [todayDateString]: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", student.id);

      if (!updateError) resetCount++;
    }

    return {
      success: true,
      message: `Reset streaks for ${resetCount} students`,
      resetCount,
    };
  } catch (error) {
    console.error("Error resetting streaks:", error);
    throw new Error("Failed to reset streaks: " + error.message);
  }
};

/**
 * Delete all students with "Unknown" name
 * @returns {Promise<Object>} Result object with success status and count
 */
export const deleteUnknownStudents = async () => {
  try {
    const { data: students, error } = await supabase
      .from("students")
      .select("id, name");

    if (error) throw normalizeError(error);

    const unknownStudentIds = students
      .filter(
        (student) =>
          student.name === "Unknown" ||
          !student.name ||
          student.name.trim() === ""
      )
      .map((student) => student.id);

    let deleteCount = 0;

    for (const studentId of unknownStudentIds) {
      const { error: deleteError } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (!deleteError) deleteCount++;
    }

    return {
      success: true,
      message: `Deleted ${deleteCount} unknown students`,
      deleteCount,
    };
  } catch (error) {
    console.error("Error deleting unknown students:", error);
    throw new Error("Failed to delete unknown students: " + error.message);
  }
};

/**
 * Calculate and store overall performance for a staff member
 * @param {Array} allStudents - Array of all students
 * @param {string} staffId - Staff ID
 * @param {Array} allTasks - Array of all tasks
 * @returns {Promise<number>} Overall percentage
 */
export const calculateAndStoreOverallPerformance = async (
  allStudents,
  staffId,
  allTasks
) => {
  try {
    // Filter tasks posted by this staff
    const staffTasks = allTasks.filter((task) => task.staffId === staffId);

    // If no tasks posted by this staff
    if (!staffTasks || staffTasks.length === 0) {
      await updateStaffStats(staffId, {
        overallPercentage: 0,
        totalStudents: allStudents.length,
        activeStudents: 0,
        lastUpdated: new Date().toISOString(),
        totalProgressPoints: 0,
        maxPossiblePoints: 0,
      });
      return 0;
    }

    // If no students
    if (!allStudents || allStudents.length === 0) {
      await updateStaffStats(staffId, {
        overallPercentage: 0,
        totalStudents: 0,
        activeStudents: 0,
        lastUpdated: new Date().toISOString(),
        totalProgressPoints: 0,
        maxPossiblePoints: 0,
      });
      return 0;
    }

    let totalProgressPoints = 0;
    let activeStudents = 0;
    const maxPossiblePoints = allStudents.length * staffTasks.length;

    // Calculate progress for each student
    for (const student of allStudents) {
      const taskStatuses = await fetchTaskStatuses(student.id);
      let studentProgress = 0;

      for (const task of staffTasks) {
        const taskId =
          task.id || task.content?.toLowerCase().replace(/\s+/g, "_");
        if (taskStatuses[taskId]?.completed) {
          studentProgress++;
        }
      }

      totalProgressPoints += studentProgress;
      if (studentProgress > 0) {
        activeStudents++;
      }
    }

    const overallPercentage =
      maxPossiblePoints > 0
        ? Math.round((totalProgressPoints / maxPossiblePoints) * 100)
        : 0;

    // Store stats
    await updateStaffStats(staffId, {
      overallPercentage,
      totalStudents: allStudents.length,
      activeStudents,
      lastUpdated: new Date().toISOString(),
      totalProgressPoints,
      maxPossiblePoints,
    });

    return overallPercentage;
  } catch (error) {
    console.error("Error calculating overall performance:", error);
    throw normalizeError(error);
  }
};

// ============================================
// QUIZ ANALYTICS FUNCTIONS
// ============================================

/**
 * Calculate quiz analytics (strengths, weaknesses, average) from quiz data
 * @param {Object} quizData - Quiz data with questions and answers
 * @returns {Object} Analytics object with strengths, weaknesses, and average
 */
export const calculateQuizAnalytics = (quizData) => {
  try {
    const { questions, answers, subtopic: defaultSubtopic } = quizData;
    
    // Group performance by subtopic
    const subtopicPerformance = {};
    
    questions.forEach((question, index) => {
      const answer = answers[index];
      const subtopic = question.subtopic || defaultSubtopic || 'General';
      
      if (!subtopicPerformance[subtopic]) {
        subtopicPerformance[subtopic] = { correct: 0, total: 0 };
      }
      
      subtopicPerformance[subtopic].total++;
      if (answer && answer.isCorrect) {
        subtopicPerformance[subtopic].correct++;
      }
    });
    
    // Calculate strengths (>=75%), weaknesses (<50%), and average
    const strengths = [];
    const weaknesses = [];
    let totalPercentage = 0;
    let subtopicCount = 0;
    
    Object.entries(subtopicPerformance).forEach(([subtopic, data]) => {
      const percentage = (data.correct / data.total) * 100;
      totalPercentage += percentage;
      subtopicCount++;
      
      const subtopicInfo = {
        subtopic,
        percentage: parseFloat(percentage.toFixed(1)),
        score: `${data.correct}/${data.total}`,
        correct: data.correct,
        total: data.total
      };
      
      if (percentage >= 75) {
        strengths.push(subtopicInfo);
      } else if (percentage < 50) {
        weaknesses.push(subtopicInfo);
      }
    });
    
    const average = subtopicCount > 0 
      ? parseFloat((totalPercentage / subtopicCount).toFixed(1))
      : 0;
    
    return {
      strengths,
      weaknesses,
      average,
      subtopicPerformance
    };
  } catch (error) {
    console.error("Error calculating quiz analytics:", error);
    return {
      strengths: [],
      weaknesses: [],
      average: 0,
      subtopicPerformance: {}
    };
  }
};

/**
 * Save quiz results to database with analytics
 * @param {Object} quizData - Quiz completion data
 * @returns {Promise<Object>} Saved quiz attempt data
 */
export const saveQuizResults = async (quizData) => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // Calculate analytics
    const analytics = calculateQuizAnalytics(quizData);
    
    // Prepare quiz attempt record
    const quizAttempt = {
      student_id: quizData.student_id || currentUser.uid,
      student_name: quizData.student_name,
      topic: quizData.topic,
      subtopic: quizData.subtopic || null,
      score: quizData.score,
      total_questions: quizData.total_questions,
      percentage: quizData.percentage,
      answers: quizData.answers, // JSONB array of answer objects
      questions: quizData.questions, // JSONB array of question objects
      strengths: analytics.strengths, // JSONB array
      weaknesses: analytics.weaknesses, // JSONB array
      average: analytics.average,
      submitted_at: quizData.completed_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    // Insert into quiz_attempts table
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([quizAttempt])
      .select()
      .single();

    if (error) {
      console.error("Error saving quiz results:", error);
      throw normalizeError(error);
    }

    console.log("✅ Quiz results saved successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in saveQuizResults:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch quiz analytics for a specific student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Aggregated quiz analytics
 */
export const fetchQuizAnalytics = async (studentId) => {
  try {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    // Fetch all quiz attempts for the student
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      throw normalizeError(error);
    }

    if (!attempts || attempts.length === 0) {
      return {
        totalQuizzes: 0,
        average: 0,
        strengths: [],
        weaknesses: [],
        history: [],
        overallPercentage: 0
      };
    }

    // Aggregate strengths and weaknesses across all quizzes
    const allStrengths = {};
    const allWeaknesses = {};
    let totalPercentage = 0;

    attempts.forEach(attempt => {
      totalPercentage += attempt.percentage || 0;
      
      // Aggregate strengths
      if (attempt.strengths && Array.isArray(attempt.strengths)) {
        attempt.strengths.forEach(strength => {
          const key = strength.subtopic;
          if (!allStrengths[key]) {
            allStrengths[key] = {
              subtopic: key,
              count: 0,
              totalPercentage: 0,
              scores: []
            };
          }
          allStrengths[key].count++;
          allStrengths[key].totalPercentage += strength.percentage;
          allStrengths[key].scores.push(strength.score);
        });
      }
      
      // Aggregate weaknesses
      if (attempt.weaknesses && Array.isArray(attempt.weaknesses)) {
        attempt.weaknesses.forEach(weakness => {
          const key = weakness.subtopic;
          if (!allWeaknesses[key]) {
            allWeaknesses[key] = {
              subtopic: key,
              count: 0,
              totalPercentage: 0,
              scores: []
            };
          }
          allWeaknesses[key].count++;
          allWeaknesses[key].totalPercentage += weakness.percentage;
          allWeaknesses[key].scores.push(weakness.score);
        });
      }
    });

    // Calculate average strengths and weaknesses
    const strengths = Object.values(allStrengths).map(s => ({
      subtopic: s.subtopic,
      percentage: parseFloat((s.totalPercentage / s.count).toFixed(1)),
      occurrences: s.count,
      scores: s.scores
    })).sort((a, b) => b.percentage - a.percentage);

    const weaknesses = Object.values(allWeaknesses).map(w => ({
      subtopic: w.subtopic,
      percentage: parseFloat((w.totalPercentage / w.count).toFixed(1)),
      occurrences: w.count,
      scores: w.scores
    })).sort((a, b) => a.percentage - b.percentage);

    const overallAverage = attempts.length > 0
      ? parseFloat((totalPercentage / attempts.length).toFixed(1))
      : 0;

    // Format history
    const history = attempts.map(attempt => ({
      id: attempt.id,
      topic: attempt.topic,
      subtopic: attempt.subtopic,
      score: attempt.score,
      total_questions: attempt.total_questions,
      percentage: attempt.percentage,
      completed_at: attempt.submitted_at,
      strengths: attempt.strengths,
      weaknesses: attempt.weaknesses,
      average: attempt.average
    }));

    return {
      totalQuizzes: attempts.length,
      average: overallAverage,
      strengths,
      weaknesses,
      history,
      overallPercentage: overallAverage
    };
  } catch (error) {
    console.error("Error fetching quiz analytics:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch quiz history for a student
 * @param {string} studentId - Student ID
 * @param {number} limit - Maximum number of quizzes to fetch
 * @returns {Promise<Array>} Array of quiz attempts
 */
export const fetchQuizHistory = async (studentId, limit = 20) => {
  try {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw normalizeError(error);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    return [];
  }
};

/**
 * Fetch all students' quiz analytics (for staff dashboard)
 * @returns {Promise<Array>} Array of student quiz analytics
 */
export const fetchAllStudentsQuizAnalytics = async () => {
  try {
    // Get all students
    const students = await fetchAllStudents();
    
    // Fetch analytics for each student
    const analyticsPromises = students.map(async (student) => {
      const analytics = await fetchQuizAnalytics(student.id);
      return {
        student_id: student.id,
        student_name: student.name,
        ...analytics
      };
    });

    const allAnalytics = await Promise.all(analyticsPromises);
    
    // Filter out students with no quizzes
    return allAnalytics.filter(a => a.totalQuizzes > 0);
  } catch (error) {
    console.error("Error fetching all students quiz analytics:", error);
    return [];
  }
};

/**
 * Subscribe to real-time quiz attempts updates
 * @param {string} studentId - Student ID (optional, for specific student)
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToQuizAttempts = (studentId, callback) => {
  const filter = studentId ? `student_id=eq.${studentId}` : undefined;
  
  const channel = supabase
    .channel('quiz-attempts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quiz_attempts',
        filter
      },
      async (payload) => {
        // Refetch analytics when there's a change
        if (studentId) {
          const analytics = await fetchQuizAnalytics(studentId);
          callback(analytics);
        } else {
          const allAnalytics = await fetchAllStudentsQuizAnalytics();
          callback(allAnalytics);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

