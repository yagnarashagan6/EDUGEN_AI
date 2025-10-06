// Test script to verify caching functionality
import fetch from "node-fetch";

const BASE_URL = "http://localhost:10000";

async function testCaching() {
  console.log("🧪 Testing EduGen AI Caching Functionality\n");

  // Test 1: Health check
  console.log("1️⃣ Testing health endpoint...");
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return;
  }

  // Test 2: Chat endpoint with a sample question
  console.log("\n2️⃣ Testing chat endpoint with sample question...");
  const testQuestion = "What is machine learning?";

  try {
    console.log(`Sending question: "${testQuestion}"`);

    // First request - should be a cache MISS (fresh AI response)
    console.log("\n🔄 First request (should be cache MISS):");
    const start1 = Date.now();
    const response1 = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: testQuestion,
      }),
    });

    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    console.log(`⏱️ Response time: ${time1}ms`);
    console.log(
      `📝 Response length: ${data1.response?.length || 0} characters`
    );

    if (response1.ok) {
      console.log("✅ First request successful");
    } else {
      console.error("❌ First request failed:", data1);
      return;
    }

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Second request - should be a cache HIT (same question)
    console.log(
      "\n🔄 Second request with same question (should be cache HIT if staff topic):"
    );
    const start2 = Date.now();
    const response2 = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: testQuestion,
      }),
    });

    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    console.log(`⏱️ Response time: ${time2}ms`);
    console.log(
      `📝 Response length: ${data2.response?.length || 0} characters`
    );

    if (response2.ok) {
      console.log("✅ Second request successful");

      // Compare response times
      if (time2 < time1 * 0.5) {
        console.log(
          "🚀 Cache might be working! Second request was significantly faster."
        );
      } else {
        console.log(
          "🤔 Cache might not be active for this topic (not a staff-posted topic)."
        );
      }

      // Compare response content
      if (data1.response === data2.response) {
        console.log("✅ Responses are identical - cache is working!");
      } else {
        console.log(
          "⚠️ Responses are different - this might be a non-staff topic or new response generated."
        );
      }
    } else {
      console.error("❌ Second request failed:", data2);
    }
  } catch (error) {
    console.error("❌ Chat test failed:", error.message);
  }

  console.log("\n✨ Test completed!");
  console.log("\n📋 Notes:");
  console.log("- Caching only works for staff-posted topics in Firestore");
  console.log(
    "- If the test question is not a staff topic, it will always fetch fresh responses"
  );
  console.log(
    "- To test caching, add the test question as a staff task in your app first"
  );
}

// Run the test
testCaching().catch(console.error);
