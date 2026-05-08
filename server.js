import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

/**
 * MEMORY STORE (in RAM)
 * chatId -> message history
 */
const chats = {};

/**
 * CHAT STREAM + MEMORY
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, model, chatId } = req.body;

    if (!chatId) return res.status(400).send("Missing chatId");

    if (!chats[chatId]) chats[chatId] = [];

    chats[chatId].push({ role: "user", content: message });

    const messages = [
      {
        role: "system",
        content:
          "You are TempestAI, a helpful assistant that remembers the conversation."
      },
      ...chats[chatId].slice(-30)
    ];

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
          messages
        })
      }
    );

    if (!response.ok || !response.body) {
      const err = await response.text();
      console.error(err);
      return res.status(500).send("Groq API error");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    let full = "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        full += chunk;
        res.write(chunk);
      }
    } catch (e) {
      console.log("Stream aborted");
    }

    chats[chatId].push({
      role: "assistant",
      content: full
    });

    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

/**
 * GET CHAT HISTORY
 */
app.get("/api/history/:id", (req, res) => {
  res.json(chats[req.params.id] || []);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("TempestAI running on " + PORT);
});
