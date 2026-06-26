# VibeSync: AI-Powered Proactive Study Companion

VibeSync is an immersive, high-efficiency, full-stack proactive study companion designed to empower students with intelligent task deconstruction, real-time focus scheduling, active-recall synthesis, and cross-device session synchronization. 

---

## 1. Problem Statement Selected

### The Student Productivity Paradox
Modern students are overloaded with vast syllabi, complex assignment structures, and high-frequency digital distractions. This leads to several systemic challenges:
1. **Last-Minute Panic (The Deadline Wall):** Students struggle to conceptualize how long a massive academic goal (e.g., "Prepare for Finals") will actually take, leading to procrastinated, low-quality cramming.
2. **Cognitive Overload in Planning:** Manually breaking down large syllabi into incremental, micro-actions requires heavy executive function. Students end up spending more time organizing their work than actually studying.
3. **Passive Study Decay:** Reading and highlighting notes create an "illusion of competence" but fail to produce durable long-term retention compared to active recall.
4. **Device Fragmentation:** Students shift between laptops, tablets, and phones, often losing their task lists, focus timers, and current context across devices.
5. **System-Noise Fatigue:** Standard productivity tools bombard users with complex menus, custom status credits, telemetry overlays, and cluttered dashboards, adding to academic stress.

---

## 2. Solution Overview

**VibeSync** acts as a distraction-free, zero-friction, context-aware companion that synchronizes your learning flow. It simplifies organization down to a single-view, distraction-free dashboard while delivering massive structural enhancements under the hood.

```
       +-----------------------------------------------------------+
       |                         VIBESYNC                          |
       |  (Intelligent Orchestration & Distraction-Free Flow)      |
       +-----------------------------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
         v                           v                           v
+------------------+       +-------------------+       +------------------+
| Dynamic Planner  |       | Active Recall     |       | Cross-Device     |
| & Pomo Tracker   |       | & Notes engine    |       | SQLite/LocalSync |
+------------------+       +-------------------+       +------------------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                                     v
                  +-------------------------------------+
                  |   Gemini Proactive Cognitive Core   |
                  | (AI Task Deconstruction & Strategy) |
                  +-------------------------------------+
```

### Core Architecture Pillars:
- **Intelligent Goal Deconstruction:** Turns ambiguous goals (e.g., "Master Organic Chemistry") into micro-milestones with assigned Pomodoro weights in a single click using Gemini API.
- **Active-Recall Synthesis:** Translates raw unstructured study notes from the built-in scratchpad into self-testing flashcards instantly.
- **Unified Cross-Platform Sync:** Saves entire local browser states into light, secure session tokens without needing complex password accounts.
- **Dual-Mode Visual Ergonomics:** A high-contrast minimalist interface featuring physical **Zen Light** and **Cosmic Slate Dark** palettes to keep cognitive friction to an absolute minimum.

---

## 3. Key Features

- 🎯 **VibeSync Planner & Study Dashboard:** 
  - Study Companion status banner.
  - Multi-tab container switching seamlessly between the **Productivity Planner**, **Active Recall Testing**, and the **Interactive Study Scratchpad (Notepad)**.
- ⚡ **AI Task Deconstruction Engine:**
  - Instantly deconstructs high-level objectives into progressive micro-tasks, complete with estimated durations and structured subtasks.
- ⏱️ **Immersive Pomodoro Focus Module:**
  - Standard, short, and long study-break intervals paired with elegant animated radial counters.
  - Integrated audio chimes to signal work/break thresholds.
  - **Immersive Deep Focus mode:** A dedicated full-screen workspace that filters out secondary dashboard elements, displaying only active timer counters, soothing ambient focus guides, and a list of active sub-tasks.
- 📳 **Proactive Push Alerts:**
  - Browser-level active notifications that nudge the student when timers conclude, even if the browser window is out of focus.
- 🔄 **Zero-Login State Synchronization:**
  - Generates secure, short-form Sync Keys allowing real-time backup and loading of state profiles on any companion device instantly.

---

## 4. Workflows & Architecture Diagrams

### Workflow 1: AI Goal Deconstruction
```
[User inputs Goal] -> (GoalPlanner UI) -> [Sends payload to server API /api/deconstruct]
                                                    |
                                                    v
[Gemini parses syllabus requirements] <---- [Enriches prompt using context & temporal rules]
         |
         +-----> [Generates JSON payload: Milestones, Estimated Pomodoros, and Priority]
                                                    |
                                                    v
[Dashboard UI receives payload] -> [Updates Local State] -> [Refreshes Deadlines, Planner & Calendar]
```

### Workflow 2: Active Recall Generation Loop
```
[User enters text in Notepad] -> [Clicks "Generate Flashcards"] -> [Requests /api/recall API]
                                                                             |
                                                                             v
[Synthesizes interactive Q&A Flashcards] <------------------------ [Gemini 2.5 Cognitive parser]
         |
         +-----> [Appends flashcard list to user's Active Recall deck]
                                                    |
                                                    v
[User tests knowledge via interactive Flip-Cards] -> [Logs score & adjusts daily completion metrics]
```

---

## 5. Technologies Used

- **Framework:** React 18 with Vite (TypeScript build system).
- **Styling:** Tailwind CSS (configured with direct import utilities).
- **Animation:** `motion` (formerly Framer Motion) for smooth tab switches, slide-over modals, and radial timer transitions.
- **Icons:** `lucide-react` for uniform vector graphics.
- **Data Persistence:** Offline-first standard HTML5 `localStorage` wrapped with an Express back-end session sync proxy.

---

## 6. Google Technologies Utilized

### Google Gemini API (via `@google/genai` SDK)
VibeSync employs Gemini models on the server to act as a co-pilot for academic productivity:
1. **Dynamic Task Deconstruction (`gemini-2.5-flash`):**
   - Ingests user study goals and outputs structured JSON schema containing micro-tasks.
   - Computes estimated completion durations using realistic cognitive load models.
2. **Contextual Study Companion Strategy:**
   - Evaluates the current state of pending tasks, active focus streaks, and local hours to output proactive contextual suggestions.
3. **Active Recall synthesis:**
   - Synthesizes highly focused, curriculum-appropriate self-assessment flashcards from unstructured user notes.
