/**
 * Test script to verify ChatGPT-style compound sentence extraction
 *
 * Tests that the new system preserves compound sentences instead of chopping them up
 */

const testCases = [
  {
    input: "I love sushi and went to Tokyo last April for my birthday",
    expected: {
      shouldContain: "Tokyo",
      shouldContain2: "sushi",
      shouldContain3: "birthday",
      description: "Should keep compound sentence together with multiple categories"
    }
  },
  {
    input: "She's vegetarian, allergic to peanuts, and her birthday is June 10th",
    expected: {
      shouldContain: "vegetarian",
      shouldContain2: "peanuts",
      shouldContain3: "June",
      description: "Should preserve multiple related health notes and dates"
    }
  },
  {
    input: "He plays tennis and loves hiking in Colorado",
    expected: {
      shouldContain: "tennis",
      shouldContain2: "hiking",
      shouldContain3: "Colorado",
      description: "Should keep related interests and places together"
    }
  }
];

async function testExtraction() {
  console.log("🧪 Testing ChatGPT-style Compound Sentence Extraction\n");
  console.log("=" .repeat(60));

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\nTest ${i + 1}: ${testCase.expected.description}`);
    console.log(`Input: "${testCase.input}"`);

    try {
      const response = await fetch("http://localhost:5000/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testCase.input,
          messageId: `test-${i + 1}`
        }),
      });

      if (!response.ok) {
        console.log(`❌ FAILED: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log("\n📊 Results:");
      console.log("Interests:", data.interests?.map(i => i.value) || []);
      console.log("Dates:", data.importantDates?.map(d => d.value) || []);
      console.log("Places:", data.places?.map(p => p.value) || []);
      console.log("Notes:", data.notes?.map(n => n.value) || []);

      // Verify compound sentences are preserved
      const allValues = [
        ...(data.interests || []),
        ...(data.importantDates || []),
        ...(data.places || []),
        ...(data.notes || [])
      ].map(item => item.value);

      const hasCompoundSentence = allValues.some(v =>
        v.includes(testCase.expected.shouldContain) &&
        v.includes(testCase.expected.shouldContain2)
      );

      if (hasCompoundSentence) {
        console.log("✅ PASS: Compound sentence preserved!");
      } else {
        console.log("⚠️  WARNING: Might have split compound sentence");
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✨ Testing complete!\n");
}

// Run tests
testExtraction().catch(console.error);
