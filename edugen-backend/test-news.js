// Simple test script to verify news endpoint works
import fetch from "node-fetch";

const testNewsAPI = async () => {
  try {
    console.log("Testing GNews API directly...");

    const apiKey = "23ab6517111b7f89ae1b385dde66dee5";
    const apiUrl = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=us&max=5&page=1&apikey=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "EduGen-AI/1.0",
      },
    });

    if (!response.ok) {
      console.error("GNews API failed:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ GNews API working successfully!");
    console.log("Articles received:", data.articles?.length || 0);
    console.log("Total articles available:", data.totalArticles || "Unknown");

    if (data.articles && data.articles.length > 0) {
      console.log("Sample article:", {
        title: data.articles[0].title,
        source: data.articles[0].source?.name,
        publishedAt: data.articles[0].publishedAt,
      });
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

testNewsAPI();
