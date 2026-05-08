import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(
  express.static(path.join(__dirname, "public"))
);

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({
        reply: "No message provided."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },

        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",

              content: `
You are TempestAI.

You are a futuristic AI assistant.

Keep responses helpful and concise.
`
            },

            {
              role: "user",
              content: message
            }
          ],

          temperature: 0.7,
          max_tokens: 1024
        })
      }
    );

    const data = await response.json();

    console.log(data);

    if (!response.ok) {
      return res.status(500).json({
        reply:
          data.error?.message ||
          "Groq API error."
      });
    }

    res.json({
      reply:
        data.choices?.[0]?.message?.content ||
        "No response."
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
      reply: "Internal server error."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `TempestAI server running on port ${PORT}`
  );
});
