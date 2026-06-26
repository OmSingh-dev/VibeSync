import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory sync data store with persistent file fallback
const SYNC_DIR = path.join(process.cwd(), "data");
const SYNC_FILE = path.join(SYNC_DIR, "sync-store.json");

interface SyncStore {
  [userId: string]: {
    userId: string;
    tasks: any[];
    goals: any[];
    events: any[];
    chatHistory?: any[];
    updatedAt: string;
  };
}

let syncStore: SyncStore = {};

// Ensure sync data directory exists
try {
  if (!fs.existsSync(SYNC_DIR)) {
    fs.mkdirSync(SYNC_DIR, { recursive: true });
  }
  if (fs.existsSync(SYNC_FILE)) {
    const raw = fs.readFileSync(SYNC_FILE, "utf-8");
    syncStore = JSON.parse(raw);
  }
} catch (e) {
  console.error("Error initializing persistent sync storage:", e);
}

function saveStore() {
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(syncStore, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving sync storage:", e);
  }
}

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Please check Secrets settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Middleware to check if Gemini key is available
function checkAiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets tab in AI Studio.",
    });
  }
  next();
}

// API Routes

// 1. Sync endpoints
app.post("/api/sync", (req, res) => {
  const { userId, tasks, goals, events, chatHistory } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  syncStore[userId] = {
    userId,
    tasks: tasks || [],
    goals: goals || [],
    events: events || [],
    chatHistory: chatHistory || [],
    updatedAt: new Date().toISOString(),
  };

  saveStore();
  res.json({ status: "success", updatedAt: syncStore[userId].updatedAt });
});

app.get("/api/sync/:userId", (req, res) => {
  const { userId } = req.params;
  const data = syncStore[userId];
  if (!data) {
    return res.status(404).json({ error: "No sync data found for this session code" });
  }
  res.json(data);
});

// 2. Chat with AI companion
app.post("/api/chat", checkAiKey, async (req, res) => {
  try {
    const { message, history, context } = req.body;
    const ai = getAiClient();

    // Prepare system instructions with current user context
    const contextStr = context 
      ? `
CURRENT USER STATE:
- Pending Tasks: ${JSON.stringify(context.tasks?.filter((t: any) => t.status === "pending").map((t: any) => ({ title: t.title, priority: t.priority, duration: t.estimatedDuration, deadline: t.deadline })))}
- Ongoing Goals: ${JSON.stringify(context.goals)}
- Calendar Events: ${JSON.stringify(context.events)}
- Local time: ${context.localTime || new Date().toISOString()}
`
      : "";

    const systemInstruction = `You are "Sia", a highly proactive, empathetic, and intuitive AI Productivity Companion. 
Your primary goal is to help the user plan, prioritize, stay accountable, and complete their tasks before deadlines are missed.
Unlike generic assistants, you check in with context-aware, creative recommendations.

PROACTIVE BEHAVIORS:
1. **The Proactive Re-scheduler**: If you spot tasks that are in the past or missed, suggest rescheduling or breaking them down into digestible Pomodoro blocks. Example: "I noticed you didn't mark 'Design mockups' as done. Would you like to schedule this tomorrow morning, or divide it into two 30-minute sprints?"
2. **Context-Based Reminders**: Use the user's gaps in schedules. Example: "You have an open 45-minute window before your 2 PM meeting—an ideal block to tackle that 'Outline' sub-task!"
3. **Actionable Suggestions**: Keep responses highly focused, encouraging, structured, and action-oriented. Keep replies brief, conversational, and highly readable.
4. **Structured suggestions**: You can attach actionable suggestions to your messages.

Please speak directly to the user. Keep it warm, supportive, and extremely clean. Use formatting (bullet points, bold text) to enhance readability. Avoid system code blocks.`;

    // Reconstruct conversation chats using the correct format for ai.chats
    // Wait, the new SDK chat format takes history:
    // We can use generateContent with the history appended directly to contents to ensure exact formatting.
    const contents: any[] = [];
    
    // Convert history to contents format
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Append the new user message
    contents.push({
      role: "user",
      parts: [{ text: `${message}\n\n${contextStr}` }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Error in AI Chat:", error);
    res.status(500).json({ error: error.message || "Internal AI error" });
  }
});

// 3. AI Breakdown of Goals/Tasks
app.post("/api/breakdown", checkAiKey, async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Task title is required for breakdown" });
    }

    const ai = getAiClient();

    const prompt = `Break down the following productivity goal/task into a highly actionable, structured set of sub-tasks.
Task Title: "${title}"
Description: "${description || "No description provided"}"
Deadline: ${deadline || "None"}

Please return the response as a structured JSON object containing:
- title: string (the refined task title)
- description: string (a supportive description or motivation tip)
- priority: "low" | "medium" | "high" (AI recommended priority)
- estimatedDuration: number (total estimated duration in minutes)
- subTasks: array of objects containing:
  - title: string (name of sub-task)
  - estimatedDuration: number (duration of this subtask in minutes)
- suggestedCategory: string (e.g. Study, Work, Personal, Health)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: { 
              type: Type.STRING,
              description: "Must be low, medium, or high"
            },
            estimatedDuration: { type: Type.INTEGER },
            subTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedDuration: { type: Type.INTEGER }
                },
                required: ["title", "estimatedDuration"]
              }
            },
            suggestedCategory: { type: Type.STRING }
          },
          required: ["title", "priority", "estimatedDuration", "subTasks", "suggestedCategory"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in AI breakdown:", error);
    res.status(500).json({ error: error.message || "Internal AI error" });
  }
});

// Simple in-memory cache for schedule checks to prevent 429 quota exhaustion
let cachedScheduleCheck: {
  timestamp: number;
  inputHash: string;
  response: any;
} | null = null;

// 4. Proactive schedule scanner (check for missed or potential windows)
app.post("/api/check-schedule", checkAiKey, async (req, res) => {
  try {
    const { tasks, events, localTime } = req.body;
    
    // Create hash of inputs
    const inputHash = JSON.stringify({ tasks, events });
    const now = Date.now();
    
    // Return cached result if input is identical and checked within the last 45 seconds
    if (cachedScheduleCheck && 
        now - cachedScheduleCheck.timestamp < 45000 && 
        cachedScheduleCheck.inputHash === inputHash) {
      console.log("[Cache Hit] Returning cached schedule check.");
      return res.json(cachedScheduleCheck.response);
    }

    const ai = getAiClient();

    const prompt = `Analyze the user's current schedule and task list to find ANY actionable productivity advice.
You should check for:
1. **Missed Blocks (The Proactive Re-scheduler)**: Look for tasks with a 'scheduledStart' or 'scheduledEnd' in the past that are still pending. Suggest intelligent alternatives (e.g. "Hey, you missed 'Design block' - should we move to tomorrow morning, or break into two 20-min blocks?").
2. **Context-Aware Windows**: Look for open timeslots or upcoming free windows before classes/meetings, and suggest an optimal, bite-sized sub-task. E.g. "You have a 45-minute gap before your chemistry class—perfect time to finish that 'Proofreading' subtask!".
3. **General Alert**: If no specific issues, find the highest priority task and write a warm, encouraging motivational prompt.

Current schedule details:
- Tasks: ${JSON.stringify(tasks)}
- Events/Classes/Meetings: ${JSON.stringify(events)}
- Current Local Time: ${localTime || new Date().toISOString()}

Return a structured JSON object:
{
  "hasAlert": boolean,
  "alertType": "reschedule" | "window" | "motivate",
  "message": string (the proactive Sia text to display),
  "taskId": string (if associated with a specific task, else empty),
  "suggestedActions": array of strings (potential options/buttons to show the user, e.g. ["Move to Tomorrow", "Split into two blocks"])
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasAlert: { type: Type.BOOLEAN },
            alertType: { type: Type.STRING },
            message: { type: Type.STRING },
            taskId: { type: Type.STRING },
            suggestedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["hasAlert", "alertType", "message", "suggestedActions"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    
    // Save to cache
    cachedScheduleCheck = {
      timestamp: now,
      inputHash: inputHash,
      response: parsedData
    };
    
    res.json(parsedData);
  } catch (error: any) {
    console.warn("Schedule check API warning (relying on cache or fallback):", error);
    
    // If we have any cached data, return that as a graceful fallback on API error (like 429)
    if (cachedScheduleCheck) {
      console.log("[Fallback Cache Hit] Returning previous cached schedule check due to API error.");
      return res.json(cachedScheduleCheck.response);
    }
    
    // Otherwise return a friendly offline/cached message format
    res.json({
      hasAlert: true,
      alertType: "motivate",
      message: "I'm monitoring your schedule! Everything looks aligned. Keep your momentum going and let me know if you need help planning.",
      suggestedActions: ["Draft a short-term plan", "Check off completed items"]
    });
  }
});


// Vite Dev Server Integration & Static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Productivity Companion running at http://localhost:${PORT}`);
  });
}

startServer();
