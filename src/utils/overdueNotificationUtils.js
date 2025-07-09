// Utility to get/set overdue notification state in localStorage
export const getOverdueState = (taskId, userId) => {
  const key = `overdueState_${userId || "default"}`;
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  return data[taskId] || {};
};

export const setOverdueState = (taskId, userId, state) => {
  const key = `overdueState_${userId || "default"}`;
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  data[taskId] = { ...data[taskId], ...state };
  localStorage.setItem(key, JSON.stringify(data));
};