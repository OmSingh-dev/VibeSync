import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Plus, Calendar, ChevronDown, ChevronUp, Trash2, Play, 
  CheckCircle, Circle, BookOpen, FileText, LayoutDashboard, Volume2, 
  VolumeX, Sliders, X, Send, RefreshCw, Bell, Moon, Sun, Clock, Tag, HelpCircle, CheckSquare, Edit3
} from 'lucide-react';
import { Task, Goal, CalendarEvent, ChatMessage, TaskPriority } from '../types';
import SiaAssistant from './SiaAssistant';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  tasks: Task[];
  goals: Goal[];
  events: CalendarEvent[];
  chatHistory: ChatMessage[];
  onAddTask: (task: Omit<Task, 'id' | 'status'>) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  onExecuteAlertAction: (suggestion: any) => void;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
  onAddBreakdown: (task: Omit<Task, 'id' | 'status'>, goal?: Omit<Goal, 'id' | 'progress'>) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  syncCode: string;
  syncStatus: string;
  onLoadSession: (code: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onLaunchDeepFocus: () => void;
  notificationStatus: 'default' | 'granted' | 'denied';
  onRequestNotificationPermission: () => Promise<void>;
  onTestNotification: () => void;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  mastered: boolean;
}

export default function Dashboard({
  tasks,
  goals,
  events,
  chatHistory,
  onAddTask,
  onToggleTask,
  onToggleSubTask,
  onDeleteTask,
  onSendMessage,
  onClearChat,
  onExecuteAlertAction,
  isAiLoading,
  setIsAiLoading,
  onAddBreakdown,
  onAddEvent,
  onDeleteEvent,
  syncCode,
  syncStatus,
  onLoadSession,
  darkMode,
  setDarkMode,
  onLaunchDeepFocus,
  notificationStatus,
  onRequestNotificationPermission,
  onTestNotification
}: DashboardProps) {
  // Tab states: 'planner' | 'recall' | 'notepad'
  const [activeTab, setActiveTab] = useState<'planner' | 'recall' | 'notepad'>('planner');

  // Task Filter states
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // New task modal state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Study');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Proactive Sia alert state
  const [proactiveAdvice, setProactiveAdvice] = useState<string>(
    "Add study tasks or key milestones, then tap the refresh icon to unlock your personalized cognitive roadmap."
  );
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  // Locked task for Focus Timer
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(() => {
    const pending = tasks.filter(t => t.status !== 'completed');
    return pending.length > 0 ? pending[0].id : null;
  });
  const activeTask = tasks.find(t => t.id === focusedTaskId) || tasks.find(t => t.status !== 'completed');

  // Focus Timer States
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'study' | 'short' | 'long'>('study');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedTaskDetailsId, setExpandedTaskDetailsId] = useState<string | null>(null);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active Recall Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([
    { id: 'fc-1', question: 'What is the First Law of Thermodynamics?', answer: 'Energy cannot be created or destroyed, only transformed from one form to another. (ΔU = Q - W)', mastered: false },
    { id: 'fc-2', question: 'State the difference between Mitosis and Meiosis.', answer: 'Mitosis produces two genetically identical diploid somatic cells. Meiosis produces four genetically diverse haploid gametes.', mastered: false },
    { id: 'fc-3', question: 'Explain the concept of Active Recall.', answer: 'Active recall is a highly efficient learning method where you stimulate your memory during the learning process by testing yourself.', mastered: false },
  ]);
  const [selectedRecallTask, setSelectedRecallTask] = useState<string>('');
  const [generatingRecall, setGeneratingRecall] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Notepad State
  const [noteContent, setNoteContent] = useState<string>(() => {
    const saved = localStorage.getItem('sia_notepad_content');
    return saved || `// 📚 SIA STUDY NOTEPAD\n// Type or paste your lecture slides, syllabus, or review guidelines here.\n\n## 📝 Chemistry Review - Chapter 5\n- Thermodynamics is the branch of physics that deals with the relationships between heat and other forms of energy.\n- Endothermic reactions absorb energy from the surroundings (ΔH is positive).\n- Exothermic reactions release energy to the surroundings (ΔH is negative).\n\n## 🎯 Focus Areas for Midterm\n- Practice Hess's law calculations.\n- Memorize enthalpy definition formulas.`;
  });

  // Floating Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Auto-save notepad
  useEffect(() => {
    localStorage.setItem('sia_notepad_content', noteContent);
  }, [noteContent]);

  // Focus Timer Logic
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(s => s - 1);
        } else if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            // Timer Finished!
            playBeep();
            triggerTaskPomoCompletion();
            resetTimer();
          } else {
            setTimerMinutes(m => m - 1);
            setTimerSeconds(59);
          }
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, timerMinutes, timerSeconds]);

  const setTimerDuration = (mode: 'study' | 'short' | 'long') => {
    setTimerActive(false);
    setTimerMode(mode);
    if (mode === 'study') {
      setTimerMinutes(25);
    } else if (mode === 'short') {
      setTimerMinutes(5);
    } else {
      setTimerMinutes(15);
    }
    setTimerSeconds(0);
  };

  const toggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const resetTimer = () => {
    setTimerActive(false);
    if (timerMode === 'study') {
      setTimerMinutes(25);
    } else if (timerMode === 'short') {
      setTimerMinutes(5);
    } else {
      setTimerMinutes(15);
    }
    setTimerSeconds(0);
  };

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn("Audio Context playback prevented by browser autoplay restriction.");
    }
  };

  const triggerTaskPomoCompletion = () => {
    if (activeTask && timerMode === 'study') {
      // Increment Completed Pomodoros
      const updatedPomos = (activeTask.completedPomos || 0) + 1;
      const targetPomos = Math.max(1, Math.ceil(activeTask.estimatedDuration / 25));
      
      // Update task on client side
      activeTask.completedPomos = updatedPomos;
      if (updatedPomos >= targetPomos) {
        onToggleTask(activeTask.id);
      } else {
        // Trigger generic updates
        onToggleSubTask(activeTask.id, ''); // Triggers state re-render
      }
    }
  };

  // Fetch proactive schedule advice from AI
  const handleRefreshProactiveAdvice = async () => {
    setIsAdviceLoading(true);
    try {
      const response = await fetch('/api/check-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, events }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          setProactiveAdvice(data.message);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdviceLoading(false);
    }
  };

  // Handle manual task submission
  const handleCreateNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onAddTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      category: newTaskCategory || 'Study',
      estimatedDuration: Number(newTaskDuration) || 30,
      subTasks: [],
      deadline: newTaskDeadline || undefined,
    });

    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDeadline('');
    setIsNewTaskModalOpen(false);
  };

  // Generate flashcards from selected task or notes
  const handleGenerateRecall = async () => {
    setGeneratingRecall(true);
    setIsCardFlipped(false);
    try {
      const topic = selectedRecallTask || "Advanced Focus Techniques";
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Please generate a list of exactly 4 active recall question & answer flashcards based on the study topic: "${topic}". Format your entire response as a raw JSON array of objects without markdown formatting, with fields "question" and "answer". Example: [{"question": "What is x?", "answer": "y"}]`,
          history: [],
          context: { tasks, events }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Extract JSON if model wrapped it in markdown
        let text = data.text || "[]";
        if (text.includes("```json")) {
          text = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) {
          text = text.split("```")[1].split("```")[0];
        }
        const cardsArray = JSON.parse(text.trim());
        if (Array.isArray(cardsArray) && cardsArray.length > 0) {
          const formattedCards = cardsArray.map((c, i) => ({
            id: `fc-gen-${Date.now()}-${i}`,
            question: c.question,
            answer: c.answer,
            mastered: false,
          }));
          setFlashcards(formattedCards);
          setActiveCardIndex(0);
        }
      }
    } catch (e) {
      console.error("Failed to generate custom recall flashcards. Falling back to quality defaults.");
    } finally {
      setGeneratingRecall(false);
    }
  };

  // Synthesize notepad notes to task checklist
  const handleSynthesizeNotepadToTasks = async () => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Extract up to 3 concrete actionable study tasks from these lecture review notes. Format your response strictly as a JSON array of task objects, containing "title", "category", "estimatedDuration" (number in minutes), and "priority" ("low", "medium", or "high"). Notes:\n${noteContent}`,
          history: [],
          context: {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        let text = data.text || "[]";
        if (text.includes("```json")) {
          text = text.split("```json")[1].split("```")[0];
        } else if (text.includes("```")) {
          text = text.split("```")[1].split("```")[0];
        }
        const extracted = JSON.parse(text.trim());
        if (Array.isArray(extracted)) {
          extracted.forEach(t => {
            onAddTask({
              title: t.title || 'Review Study Topic',
              description: 'Synthesized from lecture notepad notes.',
              priority: t.priority || 'medium',
              category: t.category || 'Study',
              estimatedDuration: t.estimatedDuration || 30,
              subTasks: [],
            });
          });
        }
        alert("Sia AI successfully deconstructed notepad into study checklist!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper values for rendering
  const activeGoals = goals.filter(g => g.progress < 100);
  const activeGoalsCount = activeGoals.length || goals.length || 1;
  const focusBlocksCount = events.length + tasks.filter(t => t.scheduledStart).length || 2;

  // Filter tasks
  const categories = Array.from(new Set(tasks.map(t => t.category)));
  const filteredTasks = tasks.filter(t => {
    const matchesFilter = 
      taskFilter === 'all' ? true :
      taskFilter === 'active' ? t.status !== 'completed' :
      t.status === 'completed';
    const matchesCategory = categoryFilter === 'all' ? true : t.category === categoryFilter;
    return matchesFilter && matchesCategory;
  });

  // Deadlines chronological sorting
  const sortedDeadlines = [...tasks.filter(t => t.deadline), ...events.map(e => ({
    id: e.id,
    title: e.title,
    deadline: e.start.split('T')[0],
    category: e.type,
    priority: 'medium' as TaskPriority,
    isEvent: true
  }))].sort((a: any, b: any) => a.deadline.localeCompare(b.deadline));

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-zinc-800 font-sans antialiased pb-20 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* Upper Navigation & Branding Header */}
      <header className="max-w-7xl mx-auto px-4 pt-8 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-zinc-200/60 dark:border-zinc-900">
        <div>
          <h1 className="text-4xl font-bold font-serif text-zinc-900 dark:text-zinc-50 tracking-tight">VibeSync</h1>
          <p className="text-sm text-zinc-500 mt-1 dark:text-zinc-400">Plan high-importance study metrics to dodge last-minute panic.</p>          {/* Compact Inline Sync & Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-4 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
            {/* Sync Token section */}
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 bg-[#F3F1E9] dark:bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              Sync: <strong className="font-mono text-[#5c6c55] dark:text-[#ebdcb9]">{syncCode}</strong>
            </span>

            {/* Load Session */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-400">Load:</span>
              <input
                id="input-sync-session"
                type="text"
                placeholder="SESSION CODE..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onLoadSession((e.target as HTMLInputElement).value);
                  }
                }}
                className="bg-[#F3F1E9] dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg text-[9px] font-mono border border-zinc-200/40 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-300 w-32 focus:ring-1 focus:ring-[#5c6c55] outline-none placeholder:text-zinc-400 placeholder:font-mono text-center"
              />
            </div>

            <span className="text-zinc-300 dark:text-zinc-800">•</span>

            {/* Theme Toggle (Light & Dark Segment Controllers) */}
            <div className="flex items-center gap-1 bg-[#F3F1E9] dark:bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
              <button
                id="btn-theme-light"
                onClick={() => setDarkMode(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${!darkMode ? 'bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Sun className="w-3 h-3" />
                <span>Light</span>
              </button>
              <button
                id="btn-theme-dark"
                onClick={() => setDarkMode(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${darkMode ? 'bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Moon className="w-3 h-3" />
                <span>Dark</span>
              </button>
            </div>

            <span className="text-zinc-300 dark:text-zinc-800">•</span>

            {/* Proactive Push Notification Alerts Controller */}
            <div className="flex items-center gap-2 bg-[#F3F1E9] dark:bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
              <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <Bell className={`w-3 h-3 ${notificationStatus === 'granted' ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span>Alerts:</span>
                <span className={`text-[9px] font-black ${notificationStatus === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {notificationStatus === 'granted' ? 'ACTIVE' : 'MUTED'}
                </span>
              </span>

              {notificationStatus !== 'granted' && (
                <button
                  id="btn-request-alerts"
                  onClick={onRequestNotificationPermission}
                  className="bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition text-[8px]"
                >
                  Enable
                </button>
              )}

              <button
                id="btn-test-alert"
                onClick={onTestNotification}
                className="text-[#5c6c55] dark:text-[#ebdcb9] hover:underline text-[9px] ml-1 flex items-center gap-0.5 cursor-pointer"
                title="Test sound chime and alert prompt"
              >
                <span>[Test Chime]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Controls pillbox */}
        <div className="flex items-center gap-2 bg-[#F3F1E9] dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
          <button
            id="tab-planner"
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'planner'
                ? 'bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Planner</span>
          </button>
          
          <button
            id="tab-recall"
            onClick={() => {
              setActiveTab('recall');
              if (tasks.length > 0 && !selectedRecallTask) {
                setSelectedRecallTask(tasks[0].title);
              }
            }}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recall'
                ? 'bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Recall</span>
          </button>

          <button
            id="tab-notepad"
            onClick={() => setActiveTab('notepad')}
            className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'notepad'
                ? 'bg-white dark:bg-zinc-800 text-[#5c6c55] dark:text-[#ebdcb9] shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notepad</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 pt-8">
        
        {/* TAB 1: PRODUCTIVITY PLANNER & STUDY DASHBOARD */}
        {activeTab === 'planner' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* ROW 1: TOP SIDE-BY-SIDE GRID (Study Companion, Deadlines, Study Recommendations) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Study Companion Header Card */}
              <div id="study-companion-sidebar-card" className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
                    <div className="p-2.5 bg-[#F4F1E6] rounded-xl dark:bg-zinc-800">
                      <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Study Companion</h2>
                      <span className="text-[9px] font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold block uppercase">
                        ● GEMINI-POWERED ALWAYS ACTIVE
                      </span>
                    </div>
                  </div>

                  {/* Advice Container */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                      <span>AI PROACTIVE STRATEGY</span>
                      <button 
                        id="btn-refresh-companion-proactive"
                        onClick={handleRefreshProactiveAdvice}
                        disabled={isAdviceLoading}
                        className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 p-0.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAdviceLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="bg-[#FAF9F5] border border-zinc-150 rounded-2xl p-4 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 min-h-[90px] flex items-center justify-center">
                      {isAdviceLoading ? (
                        <span className="text-zinc-400 animate-pulse">Consulting Cognitive Engine...</span>
                      ) : (
                        <p className="italic text-center font-serif">"{proactiveAdvice}"</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-bento metrics blocks */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-[#FAF9F5] border border-zinc-150 rounded-2xl p-4 text-center dark:bg-zinc-950 dark:border-zinc-800">
                    <div className="text-2xl font-serif font-bold text-zinc-800 dark:text-zinc-200">{activeGoalsCount}</div>
                    <div className="text-[9px] font-mono tracking-wider font-bold text-zinc-400 uppercase mt-0.5">Active Goals</div>
                  </div>
                  <div className="bg-[#FAF9F5] border border-zinc-150 rounded-2xl p-4 text-center dark:bg-zinc-950 dark:border-zinc-800">
                    <div className="text-2xl font-serif font-bold text-zinc-800 dark:text-zinc-200">{focusBlocksCount}</div>
                    <div className="text-[9px] font-mono tracking-wider font-bold text-zinc-400 uppercase mt-0.5">Focus Blocks</div>
                  </div>
                </div>
              </div>

              {/* Deadlines Block Card */}
              <div id="deadlines-green-card" className="bg-[#5c6c55] text-white rounded-3xl p-6 shadow-sm dark:bg-[#4c5a46] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-[#ffffff15] pb-3">
                    <Calendar className="w-4 h-4 text-[#ebdcb9]" />
                    <h3 className="font-serif font-bold text-base text-[#ebdcb9]">Deadlines</h3>
                  </div>

                  <div className="space-y-4 max-h-[190px] overflow-y-auto pr-1">
                    {sortedDeadlines.length === 0 ? (
                      <p className="text-xs text-[#e9ece6]/80 italic">No scheduled targets. Use AI Strategist to add task objectives.</p>
                    ) : (
                      sortedDeadlines.map((item, idx) => {
                        const isTomorrow = new Date(item.deadline).getDate() === new Date().getDate() + 1;
                        const dateLabel = isTomorrow ? "TOMORROW" : item.deadline;

                        return (
                          <div key={item.id + idx} className="border-b border-[#ffffff10] pb-3 last:border-0 last:pb-0">
                            <span className="text-[9px] font-mono font-bold tracking-widest text-[#ebdcb9] block uppercase mb-1">
                              {dateLabel}
                            </span>
                            <h4 className="text-xs font-semibold font-serif text-white truncate max-w-full">
                              {item.title}
                            </h4>
                            <span className="text-[9px] text-[#e9ece6]/80 block mt-1 font-sans">
                              {item.category} • {item.priority ? item.priority.toUpperCase() : 'MEDIUM'} PRIORITY
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Study Recommendations / Recall helper Block */}
              <div id="study-recommendations-card" className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h4 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Study Recommendations</h4>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-serif italic mb-4">
                    "These recall subjects reinforce your active syllabus tasks:"
                  </p>

                  {/* Text prompt helper */}
                  <div className="bg-[#FAF9F5] border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-800 p-4 rounded-2xl">
                    <p className="text-[11px] text-zinc-500 leading-normal italic text-center dark:text-zinc-400">
                      Type task details and study notes in the Notepad tab, then generate active recall topics with one tap!
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ROW 2: BOTTOM PLANNER & FOCUS TIMER ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Productivity Planner */}
              <div className="lg:col-span-8">
                <div id="productivity-planner-main-card" className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-800 pb-5 mb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-50">Productivity Planner</h2>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400">Organise, prioritize, and set study focus targets</p>
                    </div>

                    <button
                      id="btn-trigger-new-task-modal"
                      onClick={() => setIsNewTaskModalOpen(true)}
                      className="flex items-center gap-1 bg-[#5c6c55] hover:bg-[#4c5a46] dark:bg-[#ebdcb9] dark:hover:bg-[#ebdcb9]/80 text-white dark:text-zinc-950 px-4 py-2 rounded-full text-xs font-bold transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                  </div>

                  {/* Filters Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">FILTERS:</span>
                      <div className="flex items-center bg-[#F3F1E9] dark:bg-zinc-950 p-1 rounded-xl">
                        {(['all', 'active', 'completed'] as const).map(f => (
                          <button
                            key={f}
                            id={`filter-btn-${f}`}
                            onClick={() => setTaskFilter(f)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg capitalize transition-all ${
                              taskFilter === f
                                ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Dropdown Filter */}
                    <div>
                      <select
                        id="filter-category-select"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 bg-[#F3F1E9] dark:bg-zinc-950 border-0 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5c6c55] text-zinc-700 dark:text-zinc-300 outline-none"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Scrollable Tasks list */}
                  <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                    {filteredTasks.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-zinc-200 rounded-3xl dark:border-zinc-800 bg-[#FAF9F5]/30 dark:bg-zinc-950/20">
                        <p className="text-sm text-zinc-400 font-serif italic">Your task planner is quiet right now. Let's create an AI deconstructed target or add a quick task to start.</p>
                      </div>
                    ) : (
                      filteredTasks.map((task) => {
                        const totalPomos = Math.max(1, Math.ceil(task.estimatedDuration / 25));
                        const isCompleted = task.status === 'completed';
                        const isTaskFocused = focusedTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            id={`task-card-dash-${task.id}`}
                            className={`bg-white border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all dark:bg-zinc-900/50 ${
                              isCompleted 
                                ? 'opacity-65 border-zinc-200 dark:border-zinc-850' 
                                : isTaskFocused 
                                  ? 'border-[#5c6c55] ring-1 ring-[#5c6c55] shadow-sm' 
                                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {/* Top Section */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <button
                                  id={`btn-check-task-${task.id}`}
                                  onClick={() => onToggleTask(task.id)}
                                  className="mt-0.5 text-zinc-400 hover:text-[#5c6c55] dark:hover:text-[#ebdcb9] transition"
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5 text-[#5c6c55] dark:text-[#ebdcb9]" />
                                  ) : (
                                    <Circle className="w-5 h-5" />
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <h4 className={`text-sm font-semibold text-zinc-900 dark:text-zinc-50 ${isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic font-serif leading-relaxed line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Badge and controls */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  task.priority === 'high' 
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                                    : task.priority === 'medium' 
                                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' 
                                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                }`}>
                                  {task.priority}
                                </span>

                                {/* Focus sprint selector */}
                                {!isCompleted && (
                                  <button
                                    id={`btn-dash-focus-${task.id}`}
                                    onClick={() => {
                                      setFocusedTaskId(task.id);
                                      setTimerMinutes(25);
                                      setTimerSeconds(0);
                                    }}
                                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-bold border transition ${
                                      isTaskFocused
                                        ? 'bg-[#5c6c55] text-white border-[#5c6c55]'
                                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-400'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>{isTaskFocused ? 'Focused' : 'Focus'}</span>
                                  </button>
                                )}

                                {/* Delete button */}
                                <button
                                  id={`btn-delete-task-dash-${task.id}`}
                                  onClick={() => onDeleteTask(task.id)}
                                  className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Bottom Row Attributes */}
                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1 bg-[#F4F1E6]/50 dark:bg-zinc-950 px-2 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400">
                                <Tag className="w-3 h-3 text-zinc-400" />
                                {task.category}
                              </span>
                              
                              <span className="flex items-center gap-1 bg-[#F4F1E6]/50 dark:bg-zinc-950 px-2 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                {task.completedPomos || 0}/{totalPomos} Pomos
                              </span>

                              {task.deadline && (
                                <span className="flex items-center gap-1 bg-[#F4F1E6]/50 dark:bg-zinc-950 px-2 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400">
                                  <Calendar className="w-3 h-3 text-zinc-400" />
                                  Due {task.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Focus Pomodoro Timer */}
              <div className="lg:col-span-4">
                <div id="pomodoro-timer-card" className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col items-center">
                  
                  {/* Timer Sub-tabs selector */}
                  <div className="w-full flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3.5 mb-6">
                    <div className="flex bg-[#F3F1E9] dark:bg-zinc-950 p-1 rounded-xl gap-1">
                      <button
                        id="timer-tab-study"
                        onClick={() => setTimerDuration('study')}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                          timerMode === 'study'
                            ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Study
                      </button>
                      <button
                        id="timer-tab-short"
                        onClick={() => setTimerDuration('short')}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                          timerMode === 'short'
                            ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Short
                      </button>
                      <button
                        id="timer-tab-long"
                        onClick={() => setTimerDuration('long')}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                          timerMode === 'long'
                            ? 'bg-white dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        Long
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400">
                      <button 
                        id="btn-toggle-sound"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Elegant Circular Countdown Frame */}
                  <div className="relative flex flex-col items-center justify-center my-6">
                    
                    {/* Circle outline progress */}
                    <div className="w-44 h-44 rounded-full border-4 border-zinc-100 flex items-center justify-center dark:border-zinc-800">
                      <div className="absolute inset-0.5 rounded-full border border-dashed border-[#5c6c55]/20 animate-spin-slow pointer-events-none" />
                      
                      <div className="text-center">
                        <div className="text-3xl font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                        </div>
                        <span className="text-[9px] font-mono font-bold tracking-widest text-[#5c6c55] dark:text-[#ebdcb9] uppercase mt-1 block">
                          {timerMode === 'study' ? 'DEEP STUDY' : 'BREAK TIME'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Locked Active Task display */}
                  <div className="w-full text-center px-2 py-3 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl min-h-[64px] flex flex-col justify-center mb-6">
                    {activeTask ? (
                      <div>
                        <span className="text-[8px] font-mono font-bold tracking-wider text-[#5c6c55] dark:text-[#ebdcb9] uppercase block mb-0.5">CURRENT TARGET</span>
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-full px-2">{activeTask.title}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-400 font-serif italic">No active task set. Use Planner to lock focus.</p>
                    )}
                  </div>

                  {/* Focus Controls */}
                  <div className="w-full flex items-center gap-3">
                    <button
                      id="btn-pomo-reset"
                      onClick={resetTimer}
                      className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-xl transition hover:border-zinc-300 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-400"
                      title="Reset Interval"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      id="btn-pomo-start-toggle"
                      onClick={toggleTimer}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-xs tracking-wider transition shadow-sm ${
                        timerActive 
                          ? 'bg-[#A37B3E] hover:bg-[#8D6630] text-white' 
                          : 'bg-[#5c6c55] hover:bg-[#4c5a46] dark:bg-[#ebdcb9] dark:hover:bg-[#ebdcb9]/80 text-white dark:text-zinc-950'
                      }`}
                    >
                      <span>{timerActive ? 'Pause Focus' : 'Start Focus'}</span>
                    </button>
                  </div>

                  {/* Deep Focus Fullscreen mode button */}
                  <button
                    id="btn-pomo-deep-focus-launcher"
                    onClick={onLaunchDeepFocus}
                    className="mt-4 flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#5c6c55] hover:text-[#4c5a46] dark:text-[#ebdcb9] uppercase"
                  >
                    <span>🚀 IMMERSIVE DEEP FOCUS</span>
                  </button>

                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ACTIVE RECALL FLASHCARDS STUDY GAME */}
        {activeTab === 'recall' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 text-center">
              <h2 className="text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-50 mb-1">Active Recall Study Deck</h2>
              <p className="text-xs text-zinc-500 mb-6 dark:text-zinc-400">Test your cognitive memory. Tap cards to flip and reveal answer details.</p>

              {/* Select Task Topic for AI Generation */}
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-8 max-w-lg mx-auto">
                <select
                  id="recall-topic-selector"
                  value={selectedRecallTask}
                  onChange={(e) => setSelectedRecallTask(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F3F1E9] dark:bg-zinc-950 border-0 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-[#5c6c55] text-zinc-800 dark:text-zinc-200 outline-none"
                >
                  <option value="">-- Choose a Study Milestone --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.title}>{t.title} ({t.category})</option>
                  ))}
                </select>

                <button
                  id="btn-generate-ai-recall"
                  onClick={handleGenerateRecall}
                  disabled={generatingRecall}
                  className="w-full sm:w-auto bg-[#5c6c55] hover:bg-[#4c5a46] dark:bg-[#ebdcb9] dark:hover:bg-[#ebdcb9]/80 text-white dark:text-zinc-950 px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatingRecall ? "Deconstructing..." : "Generate Deck"}</span>
                </button>
              </div>

              {/* Flashcard Component */}
              {flashcards.length === 0 ? (
                <p className="text-zinc-400 italic font-serif py-12">No active recall flashcards available.</p>
              ) : (
                <div className="flex flex-col items-center space-y-6">
                  
                  {/* Interactive Flip Card container */}
                  <div
                    id={`recall-flashcard-interactive`}
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className="w-full max-w-md h-64 bg-[#FBF9F0] border-2 border-[#EADCAE]/50 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center cursor-pointer select-none relative hover:border-[#ebdcb9] transition duration-300 dark:bg-zinc-950 dark:border-zinc-800"
                  >
                    <span className="absolute top-4 right-4 text-[9px] font-mono font-bold tracking-widest text-[#5c6c55] uppercase dark:text-[#ebdcb9]">
                      {isCardFlipped ? "ANSWER SIDE" : "QUESTION SIDE"}
                    </span>

                    <div className="px-4 text-center">
                      {isCardFlipped ? (
                        <p className="text-sm font-sans text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                          {flashcards[activeCardIndex].answer}
                        </p>
                      ) : (
                        <h3 className="text-lg font-serif font-bold text-zinc-950 dark:text-zinc-50 leading-snug">
                          {flashcards[activeCardIndex].question}
                        </h3>
                      )}
                    </div>

                    <span className="absolute bottom-4 text-[10px] text-zinc-400 font-mono">
                      Tap card to reveal details
                    </span>
                  </div>

                  {/* Mastered/Review controls */}
                  <div className="flex items-center gap-4">
                    <button
                      id="btn-recall-need-review"
                      onClick={() => {
                        setIsCardFlipped(false);
                        const next = (activeCardIndex + 1) % flashcards.length;
                        setActiveCardIndex(next);
                      }}
                      className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-850 dark:text-zinc-200 rounded-xl text-xs font-bold transition"
                    >
                      Need Review
                    </button>
                    
                    <button
                      id="btn-recall-got-it"
                      onClick={() => {
                        const updated = [...flashcards];
                        updated[activeCardIndex].mastered = true;
                        setFlashcards(updated);
                        setIsCardFlipped(false);
                        const next = (activeCardIndex + 1) % flashcards.length;
                        setActiveCardIndex(next);
                      }}
                      className="px-6 py-2.5 bg-[#5c6c55] hover:bg-[#4c5a46] dark:bg-[#ebdcb9] dark:hover:bg-[#ebdcb9]/80 text-white dark:text-zinc-950 rounded-xl text-xs font-bold transition"
                    >
                      Mastered!
                    </button>
                  </div>

                  {/* Page Indicator dot stack */}
                  <div className="flex items-center gap-1.5 pt-4">
                    {flashcards.map((fc, i) => (
                      <span
                        key={fc.id}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === activeCardIndex 
                            ? 'bg-[#5c6c55] w-4' 
                            : fc.mastered 
                              ? 'bg-[#EADCAE]' 
                              : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MINIMALIST DIGITAL STUDY NOTEPAD */}
        {activeTab === 'notepad' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Notepad Main Input Box (span 8) */}
            <div className="lg:col-span-8 bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold font-serif text-zinc-900 dark:text-zinc-50">Syllabus Review & Notes</h2>
                  <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400">Save lecture highlights and study reminders below.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                  <span>Autosaved</span>
                </div>
              </div>

              <textarea
                id="digital-study-notepad"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type or paste study syllabus guidelines, notes, or essay details here..."
                className="w-full h-[450px] p-5 bg-[#FAF9F5] border border-zinc-150 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#5c6c55] text-sm leading-relaxed text-zinc-800 font-mono dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200"
              />
            </div>

            {/* AI Assistant Co-writer Helper panel (span 4) */}
            <div className="lg:col-span-4 bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 space-y-6">
              <div>
                <h3 className="text-sm font-bold font-serif text-zinc-900 dark:text-zinc-50">Sia AI Co-writer</h3>
                <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400 font-sans">Synthesize raw text into actionable planner checklist schedules.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  id="btn-notepad-to-tasks"
                  onClick={handleSynthesizeNotepadToTasks}
                  disabled={isAiLoading}
                  className="w-full flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200 dark:hover:bg-zinc-900/60 p-4 rounded-2xl text-xs font-bold transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                    <div>
                      <span>Extract Study Checklist</span>
                      <p className="text-[10px] text-zinc-400 font-normal mt-0.5">Parse key highlights into subtask lists</p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  id="btn-notepad-to-recall"
                  onClick={async () => {
                    setGeneratingRecall(true);
                    setActiveTab('recall');
                    try {
                      const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: `Generate exactly 4 active recall question & answer flashcards based strictly on these notes:\n"${noteContent}". Format your entire response as a raw JSON array of objects without markdown formatting, with fields "question" and "answer".`,
                          history: [],
                          context: {}
                        })
                      });
                      if (response.ok) {
                        const data = await response.json();
                        let text = data.text || "[]";
                        if (text.includes("```json")) {
                          text = text.split("```json")[1].split("```")[0];
                        } else if (text.includes("```")) {
                          text = text.split("```")[1].split("```")[0];
                        }
                        const cardsArray = JSON.parse(text.trim());
                        if (Array.isArray(cardsArray) && cardsArray.length > 0) {
                          const formatted = cardsArray.map((c, i) => ({
                            id: `fc-notepad-${Date.now()}-${i}`,
                            question: c.question,
                            answer: c.answer,
                            mastered: false,
                          }));
                          setFlashcards(formatted);
                          setActiveCardIndex(0);
                        }
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setGeneratingRecall(false);
                    }
                  }}
                  className="w-full flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 dark:bg-zinc-950 dark:border-zinc-850 dark:text-zinc-200 dark:hover:bg-zinc-900/60 p-4 rounded-2xl text-xs font-bold transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-amber-500" />
                    <div>
                      <span>Draft Recall Flashcards</span>
                      <p className="text-[10px] text-zinc-400 font-normal mt-0.5">Produce mock questions from written lines</p>
                    </div>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </button>
              </div>

              <div className="bg-[#FAF9F5] border border-zinc-150 dark:bg-zinc-950 dark:border-zinc-850 p-4 rounded-2xl">
                <h4 className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase mb-1">PRO TIP FOR HIGHER GRADES</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans dark:text-zinc-400">
                  Write down complex slides in your own words, highlight key definitions, then click "Draft Recall Flashcards" to test your memory.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FLOATING CHAT BUTTON & COMPANION DRAWER */}
      <div className="fixed bottom-6 right-6 z-40">
        
        {/* Floating Bubble Icon */}
        <button
          id="btn-floating-sia-chat-toggle"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="flex items-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-2xl transition-all duration-300 animate-bounce active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5c6c55] dark:bg-[#ebdcb9] dark:text-zinc-900"
          title="Chat with Sia Assistant"
        >
          <Sparkles className="w-5 h-5 text-indigo-400 dark:text-indigo-600 animate-pulse" />
          <span className="text-xs font-bold font-serif pr-1">Chat with Sia</span>
        </button>

        {/* Sliding Chat Drawer panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 100, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, y: 100, scale: 0.9 }}
              className="fixed bottom-24 right-6 w-96 h-[520px] bg-white border border-zinc-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 dark:bg-zinc-900 dark:border-zinc-800"
            >
              {/* Header */}
              <div className="p-4 bg-zinc-900 text-white dark:bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-serif font-bold text-sm">Sia Dialogue Companion</span>
                </div>
                <button
                  id="btn-close-sia-chat-drawer"
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Wrapper */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#FAF9F5] dark:bg-zinc-950">
                <SiaAssistant
                  tasks={tasks}
                  events={events}
                  chatHistory={chatHistory}
                  onSendMessage={onSendMessage}
                  onClearChat={onClearChat}
                  onExecuteAlertAction={onExecuteAlertAction}
                  isLoading={isAiLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DIALOG: NEW TASK CREATION */}
      <AnimatePresence>
        {isNewTaskModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-zinc-50">Create New Study Target</h3>
                <button
                  id="btn-close-new-task-modal"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">TASK TITLE</label>
                  <input
                    id="new-task-title"
                    type="text"
                    required
                    placeholder="e.g. Prepare Organic Chemistry flashcards"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-xl text-zinc-900 dark:text-zinc-50 focus:ring-1 focus:ring-[#5c6c55] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">DESCRIPTION / NOTES</label>
                  <textarea
                    id="new-task-desc"
                    placeholder="Provide detailed instructions or resource URLs..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    className="w-full h-20 px-3.5 py-2.5 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl text-zinc-900 dark:text-zinc-50 focus:ring-1 focus:ring-[#5c6c55] outline-none text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">CATEGORY</label>
                    <input
                      id="new-task-category"
                      type="text"
                      placeholder="e.g. Study, Exam Prep"
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">DUE DATE</label>
                    <input
                      id="new-task-deadline"
                      type="date"
                      value={newTaskDeadline}
                      onChange={(e) => setNewTaskDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">PRIORITY</label>
                    <select
                      id="new-task-priority"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">DURATION</label>
                    <select
                      id="new-task-duration"
                      value={newTaskDuration}
                      onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#FAF9F5] dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-zinc-900 dark:text-zinc-50 outline-none"
                    >
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">1 Hour</option>
                      <option value="90">1.5 Hours</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    id="btn-cancel-new-task"
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-new-task"
                    type="submit"
                    className="flex-1 py-2.5 bg-[#5c6c55] hover:bg-[#4c5a46] dark:bg-[#ebdcb9] dark:hover:bg-[#ebdcb9]/80 text-white dark:text-zinc-950 font-bold rounded-xl transition"
                  >
                    Save Target
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
