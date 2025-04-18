
const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


async function getCompletion(promptText = "Write a haiku about AI.") {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: promptText }],
    });

    console.log("🧠 GPT Reply:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  getCompletion();
}

module.exports = { getCompletion };
