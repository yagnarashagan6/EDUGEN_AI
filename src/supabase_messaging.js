// ============================================
// MESSAGING FUNCTIONS
// ============================================

/**
 * Fetch messages between staff and student
 * @param {string} staffId - Staff user ID
 * @param {string} studentId - Student user ID
 * @returns {Promise<Array>} Array of messages
 */
export const fetchMessages = async (staffId, studentId) => {
    try {
        const chatId = [staffId, studentId].sort().join("_");

        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("id", chatId)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // No messages yet, return empty array
                return [];
            }
            throw new Error(error.message || JSON.stringify(error));
        }

        return data?.messages || [];
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
};

/**
 * Send a message between staff and student
 * @param {string} staffId - Staff user ID
 * @param {string} studentId - Student user ID
 * @param {string} message - Message text
 * @param {string} sender - 'staff' or 'student'
 * @returns {Promise<boolean>} Success status
 */
export const sendMessage = async (staffId, studentId, message, sender) => {
    try {
        const chatId = [staffId, studentId].sort().join("_");

        // Fetch existing messages
        const { data: existing } = await supabase
            .from("messages")
            .select("*")
            .eq("id", chatId)
            .single();

        const newMessage = {
            text: message,
            sender: sender,
            timestamp: new Date().toISOString(),
            read: false,
        };

        if (existing) {
            // Update existing conversation
            const updatedMessages = [...(existing.messages || []), newMessage];

            const { error } = await supabase
                .from("messages")
                .update({
                    messages: updatedMessages,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", chatId);

            if (error) throw new Error(error.message || JSON.stringify(error));
        } else {
            // Create new conversation
            const { error } = await supabase.from("messages").insert({
                id: chatId,
                staff_id: staffId,
                student_id: studentId,
                messages: [newMessage],
            });

            if (error) throw new Error(error.message || JSON.stringify(error));
        }

        return true;
    } catch (error) {
        console.error("Error sending message:", error);
        throw new Error(error.message || JSON.stringify(error));
    }
};

/**
 * Mark messages as read
 * @param {string} staffId - Staff user ID
 * @param {string} studentId - Student user ID
 * @param {string} reader - 'staff' or 'student'
 * @returns {Promise<boolean>} Success status
 */
export const markMessagesAsRead = async (staffId, studentId, reader) => {
    try {
        const chatId = [staffId, studentId].sort().join("_");

        const { data: existing } = await supabase
            .from("messages")
            .select("*")
            .eq("id", chatId)
            .single();

        if (!existing) return false;

        // Mark messages from the other party as read
        const updatedMessages = (existing.messages || []).map((msg) => {
            if (msg.sender !== reader && !msg.read) {
                return { ...msg, read: true };
            }
            return msg;
        });

        const { error } = await supabase
            .from("messages")
            .update({
                messages: updatedMessages,
                updated_at: new Date().toISOString(),
            })
            .eq("id", chatId);

        if (error) throw new Error(error.message || JSON.stringify(error));
        return true;
    } catch (error) {
        console.error("Error marking messages as read:", error);
        return false;
    }
};

/**
 * Subscribe to messages between staff and student
 * @param {string} staffId - Staff user ID
 * @param {string} studentId - Student user ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const subscribeToMessages = (staffId, studentId, callback) => {
    const chatId = [staffId, studentId].sort().join("_");

    const channel = supabase
        .channel(`messages-${chatId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "messages",
                filter: `id=eq.${chatId}`,
            },
            () => {
                fetchMessages(staffId, studentId).then(callback);
            }
        )
        .subscribe();

    // Fetch initial messages
    fetchMessages(staffId, studentId).then(callback);

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Count unread messages for staff from all students
 * @param {string} staffId - Staff user ID
 * @param {Array} studentIds - Array of student IDs
 * @returns {Promise<Object>} Object with studentId as key and unread count as value
 */
export const countUnreadMessages = async (staffId, studentIds) => {
    try {
        const unreadCounts = {};

        for (const studentId of studentIds) {
            const messages = await fetchMessages(staffId, studentId);
            const unreadCount = messages.filter(
                (msg) => msg.sender === "student" && !msg.read
            ).length;

            if (unreadCount > 0) {
                unreadCounts[studentId] = unreadCount;
            }
        }

        return unreadCounts;
    } catch (error) {
        console.error("Error counting unread messages:", error);
        return {};
    }
};
