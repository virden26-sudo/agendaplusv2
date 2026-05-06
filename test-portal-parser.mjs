import fetch from 'node-fetch';

async function testParser() {
    console.log("Testing portal-parser API...");

    const testData = {
        portalText: "Announcement: Exam next week. Discussion: Project ideas due tomorrow. Assignment: Math homework due 2026-05-15.",
        currentDate: "2026-05-08"
    };

    try {
        const response = await fetch('http://localhost:9002/api/parse-portal', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            console.error(`Status: ${response.status}`);
            const text = await response.text();
            console.error(`Response: ${text}`);
            return;
        }

        const result = await response.json();
        console.log("Parser Output:", JSON.stringify(result, null, 2));

        if (result.assignments && result.assignments.length > 0) {
            console.log("✅ Successfully extracted assignments");
        } else {
            console.log("❌ Failed to extract assignments");
        }

    } catch (error) {
        console.error("Error during test:", error);
    }
}

// Note: This requires the server to be running.
// testParser();
console.log("Test script created. Run it while the Next.js server is active.");
