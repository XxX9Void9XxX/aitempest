import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/**
 * STREAMING CHAT ROUTE
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, model } = req.body;

    if (!message) {
      return res.status(400).send("No message provided");
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
          model: model || "llama-3.3-70b-versatile",
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are TempestAI, a helpful AI assistant."
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    if (!response.ok || !response.body) {
      const errText = await response.text();
      console.error("Groq error:", errText);
      return res.status(500).send("Groq API error");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      res.write(chunk);
    }

    res.end();

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Internal server error");
  }
});

/**
 * FRONTEND ROUTE
 */
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TempestAI running on port ${PORT}`);
});
