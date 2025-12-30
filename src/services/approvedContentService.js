// approvedContentService.js - Functions for managing staff-approved answers and quizzes
import { supabase, supabaseAuth } from '../supabase';

const normalizeError = (err) => {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  if (err?.message) return new Error(err.message);
  return new Error('An unknown error occurred');
};

/**
 * Save staff-approved answer and quiz for a topic
 * @param {Object} approvedData - Approved content data
 * @returns {Promise<Object>} Saved record
 */
export const saveApprovedContent = async (approvedData) => {
  try {
    const currentUser = supabaseAuth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    const contentRecord = {
      subject: approvedData.subject,
      topic: approvedData.topic,
      subtopic: approvedData.subtopic || null,
      ai_answer: approvedData.aiAnswer,
      quiz_questions: approvedData.quizQuestions,
      quiz_config: approvedData.quizConfig,
      difficulty: approvedData.difficulty,
      staff_id: currentUser.uid,
      staff_name: approvedData.staffName,
      files_used: approvedData.filesUsed || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert based on subject and topic (update if exists, insert if not)
    const { data, error } = await supabase
      .from('approved_content')
      .upsert([contentRecord], { 
        onConflict: 'subject,topic',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving approved content:", error);
      throw normalizeError(error);
    }

    console.log("✅ Approved content saved successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in saveApprovedContent:", error);
    throw normalizeError(error);
  }
};

/**
 * Fetch approved content for a specific subject and topic
 * @param {string} subject - Subject name
 * @param {string} topic - Topic name
 * @returns {Promise<Object|null>} Approved content or null
 */
export const fetchApprovedContent = async (subject, topic) => {
  try {
    const { data, error } = await supabase
      .from('approved_content')
      .select('*')
      .eq('subject', subject)
      .eq('topic', topic)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw normalizeError(error);
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching approved content:", error);
    return null;
  }
};

/**
 * Check if approved content exists for a subject and topic
 * @param {string} subject - Subject name
 * @param {string} topic - Topic name
 * @returns {Promise<boolean>} True if exists, false otherwise
 */
export const hasApprovedContent = async (subject, topic) => {
  try {
    const content = await fetchApprovedContent(subject, topic);
    return content !== null;
  } catch (error) {
    console.error("Error checking approved content:", error);
    return false;
  }
};

/**
 * Fetch all approved content (for staff dashboard)
 * @returns {Promise<Array>} Array of approved content
 */
export const fetchAllApprovedContent = async () => {
  try {
    const { data, error } = await supabase
      .from('approved_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw normalizeError(error);

    return data || [];
  } catch (error) {
    console.error("Error fetching all approved content:", error);
    return [];
  }
};

/**
 * Delete approved content
 * @param {string} contentId - Content ID
 * @returns {Promise<void>}
 */
export const deleteApprovedContent = async (contentId) => {
  try {
    const { error } = await supabase
      .from('approved_content')
      .delete()
      .eq('id', contentId);

    if (error) throw normalizeError(error);
  } catch (error) {
    console.error("Error deleting approved content:", error);
    throw normalizeError(error);
  }
};
