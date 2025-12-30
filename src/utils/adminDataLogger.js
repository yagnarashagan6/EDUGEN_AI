// adminDataLogger.js - Utility functions to log RAG data to admin dashboard

/**
 * Save topic/subtopic RAG data to localStorage for admin dashboard
 * @param {Object} data - The data to save
 * @param {string} data.topic - Topic name
 * @param {string} data.subtopic - Subtopic name (optional)
 * @param {string} data.pdfSource - PDF source file name (optional)
 * @param {string} data.ragContext - RAG extracted context
 * @param {string} data.aiAnswer - AI generated answer
 * @param {number} data.ragChunksFound - Number of RAG chunks found
 * @param {string} data.staffId - Staff ID who posted the task
 * @param {string} data.taskId - Task ID
 * @param {string} data.difficulty - Difficulty level
 * @param {number} data.questionCount - Number of questions
 */
export const saveTopicDataToAdmin = (data) => {
  try {
    // Get existing data
    const existingData = localStorage.getItem('admin_topic_data');
    const topicData = existingData ? JSON.parse(existingData) : [];

    // Create new entry
    const newEntry = {
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      topic: data.topic || 'N/A',
      subtopic: data.subtopic || '',
      pdfSource: data.pdfSource || '',
      ragContext: data.ragContext || '',
      aiAnswer: data.aiAnswer || '',
      ragChunksFound: data.ragChunksFound || 0,
      staffId: data.staffId || '',
      taskId: data.taskId || '',
      difficulty: data.difficulty || '',
      questionCount: data.questionCount || 0,
    };

    // Add to array
    topicData.unshift(newEntry); // Add to beginning

    // Keep only last 100 entries to prevent localStorage overflow
    if (topicData.length > 100) {
      topicData.splice(100);
    }

    // Save back to localStorage
    localStorage.setItem('admin_topic_data', JSON.stringify(topicData));

    console.log('[Admin Logger] Topic data saved successfully:', newEntry.id);
    return true;
  } catch (error) {
    console.error('[Admin Logger] Error saving topic data:', error);
    return false;
  }
};

/**
 * Save quiz RAG data to localStorage for admin dashboard
 * @param {Object} data - The data to save
 * @param {string} data.topic - Topic name
 * @param {string} data.subtopic - Subtopic name (optional)
 * @param {string} data.pdfSource - PDF source file name (optional)
 * @param {string} data.ragContext - RAG extracted context
 * @param {Array} data.questions - Generated quiz questions
 * @param {number} data.ragChunksFound - Number of RAG chunks found
 * @param {string} data.difficulty - Difficulty level
 * @param {string} data.cognitiveLevel - Cognitive level
 * @param {string} data.staffId - Staff ID who posted the task
 * @param {string} data.taskId - Task ID
 */
export const saveQuizDataToAdmin = (data) => {
  try {
    // Get existing data
    const existingData = localStorage.getItem('admin_quiz_data');
    const quizData = existingData ? JSON.parse(existingData) : [];

    // Create new entry
    const newEntry = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      topic: data.topic || 'N/A',
      subtopic: data.subtopic || '',
      pdfSource: data.pdfSource || '',
      ragContext: data.ragContext || '',
      questions: data.questions || [],
      ragChunksFound: data.ragChunksFound || 0,
      difficulty: data.difficulty || '',
      cognitiveLevel: data.cognitiveLevel || '',
      staffId: data.staffId || '',
      taskId: data.taskId || '',
    };

    // Add to array
    quizData.unshift(newEntry); // Add to beginning

    // Keep only last 100 entries to prevent localStorage overflow
    if (quizData.length > 100) {
      quizData.splice(100);
    }

    // Save back to localStorage
    localStorage.setItem('admin_quiz_data', JSON.stringify(quizData));

    console.log('[Admin Logger] Quiz data saved successfully:', newEntry.id);
    return true;
  } catch (error) {
    console.error('[Admin Logger] Error saving quiz data:', error);
    return false;
  }
};

/**
 * Clear all admin data from localStorage
 */
export const clearAllAdminData = () => {
  try {
    localStorage.removeItem('admin_topic_data');
    localStorage.removeItem('admin_quiz_data');
    console.log('[Admin Logger] All admin data cleared');
    return true;
  } catch (error) {
    console.error('[Admin Logger] Error clearing admin data:', error);
    return false;
  }
};

/**
 * Get all topic data from localStorage
 */
export const getTopicData = () => {
  try {
    const data = localStorage.getItem('admin_topic_data');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Admin Logger] Error getting topic data:', error);
    return [];
  }
};

/**
 * Get all quiz data from localStorage
 */
export const getQuizData = () => {
  try {
    const data = localStorage.getItem('admin_quiz_data');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Admin Logger] Error getting quiz data:', error);
    return [];
  }
};
