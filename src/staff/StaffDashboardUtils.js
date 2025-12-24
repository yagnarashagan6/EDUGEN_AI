// StaffDashboardUtils.js
// Export utility functions from Supabase
export {
  resetAllStreaksToZero,
  deleteUnknownStudents,
  calculateAndStoreOverallPerformance,
} from "../supabase";

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
