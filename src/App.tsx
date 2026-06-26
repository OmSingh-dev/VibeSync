import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  CloudLightning,
  Smartphone,
  Share2,
  ListTodo,
  TrendingUp,
  Award,
  Bell,
  HelpCircle,
  Shield,
} from 'lucide-react';
import { Task, Goal, CalendarEvent, ChatMessage, TaskPriority } from './types';
import GoalPlanner from './components/GoalPlanner';
import AddManualTask from './components/AddManualTask';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import SiaAssistant from './components/SiaAssistant';
import DeepFocus from './components/DeepFocus';
import Dashboard from './components/Dashboard';
import { requestNotificationPermission, triggerNotification } from './lib/notifications';

export default function App() {
  // Deep Focus Mode state
  const [deepFocusMode, setDeepFocusMode] = useState<boolean>(false);

  // Toggle to show/hide planning & directory tools
  const [showPlanningTools, setShowPlanningTools] = useState<boolean>(false);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sia_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(pre-shadows-color: dark)').matches);
  });

  // Unique session sync code
  const [syncCode, setSyncCode] = useState<string>(() => {
    const saved = localStorage.getItem('sia_sync_code');
    if (saved) return saved;
    const newCode = `SIA-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('sia_sync_code', newCode);
    return newCode;
  });

  // Client Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');

  // Core application lists
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('sia_tasks');
    return saved ? JSON.parse(saved) : getSeedTasks();
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('sia_goals');
    return saved ? JSON.parse(saved) : getSeedGoals();
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('sia_events');
    return saved ? JSON.parse(saved) : getSeedEvents();
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('sia_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: "Hello! I am Sia, your proactive productivity partner. Let's design an ideal workflow, reschedule missed milestones, and lock in focus chunks.",
        timestamp: new Date().toISOString()
      }
    ];
  });

  // UI Flow triggers
  const [selectedTaskToSchedule, setSelectedTaskToSchedule] = useState<Task | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [customSyncInput, setCustomSyncInput] = useState<string>('');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>(() => {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  });

  // Listen to offline state
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      performCloudSync(tasks, goals, events, chatHistory);
    };
    const goOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [tasks, goals, events, chatHistory]);

  // Apply and save dark mode classes
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('sia_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sia_theme', 'light');
    }
  }, [darkMode]);

  // Persist local state changes & Trigger auto cloud sync
  useEffect(() => {
    localStorage.setItem('sia_tasks', JSON.stringify(tasks));
    localStorage.setItem('sia_goals', JSON.stringify(goals));
    localStorage.setItem('sia_events', JSON.stringify(events));
    localStorage.setItem('sia_chat_history', JSON.stringify(chatHistory));

    // Calculate goal progression based on associated completed tasks
    const updatedGoals = goals.map(g => {
      const associatedTasks = tasks.filter(t => t.goalId === g.id);
      if (associatedTasks.length === 0) return g;
      const completed = associatedTasks.filter(t => t.status === 'completed').length;
      const progress = Math.round((completed / associatedTasks.length) * 100);
      return { ...g, progress };
    });

    // Check if progress actually changed to prevent infinite loops
    let hasGoalChanged = false;
    updatedGoals.forEach((g, idx) => {
      if (g.progress !== goals[idx].progress) {
        hasGoalChanged = true;
      }
    });

    if (hasGoalChanged) {
      setGoals(updatedGoals);
    }

    if (isOnline) {
      performCloudSync(tasks, goals, events, chatHistory);
    } else {
      setSyncStatus('offline');
    }
  }, [tasks, events, chatHistory]);

  const performCloudSync = async (
    currentTasks: Task[],
    currentGoals: Goal[],
    currentEvents: CalendarEvent[],
    currentChats: ChatMessage[]
  ) => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: syncCode,
          tasks: currentTasks,
          goals: currentGoals,
          events: currentEvents,
          chatHistory: currentChats,
        }),
      });

      if (res.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      console.error("Cloud sync failed (offline-first active)", e);
      setSyncStatus('offline');
    }
  };

  // Load from session code explicitly
  const handleLoadSession = async (codeToLoad: string) => {
    if (!codeToLoad.trim()) return;
    const formattedCode = codeToLoad.trim().toUpperCase();
    setSyncStatus('syncing');
    try {
      const res = await fetch(`/api/sync/${formattedCode}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setGoals(data.goals || []);
        setEvents(data.events || []);
        setChatHistory(data.chatHistory || []);
        setSyncCode(formattedCode);
        localStorage.setItem('sia_sync_code', formattedCode);
        setSyncMessage(`Successfully connected to session ${formattedCode}`);
        setSyncStatus('synced');
      } else {
        setSyncMessage(`Session ${formattedCode} not found on server. Registered as new.`);
        setSyncCode(formattedCode);
        localStorage.setItem('sia_sync_code', formattedCode);
        setSyncStatus('synced');
      }
    } catch (e) {
      setSyncMessage('Network failure. Using local offline storage.');
      setSyncStatus('error');
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      triggerNotification("Sia Notifications Enabled", "You will now receive proactive re-scheduling alerts.");
    }
  };

  // State mutation actions
  const handleAddBreakdown = (
    newTask: Omit<Task, 'id' | 'status'>,
    newGoal?: Omit<Goal, 'id' | 'progress'>
  ) => {
    const taskId = `task-${Date.now()}`;
    let createdGoalId: string | undefined = undefined;

    if (newGoal) {
      const goalId = `goal-${Date.now()}`;
      const createdGoal: Goal = {
        ...newGoal,
        id: goalId,
        progress: 0,
      };
      setGoals((prev) => [...prev, createdGoal]);
      createdGoalId = goalId;
    }

    const createdTask: Task = {
      ...newTask,
      id: taskId,
      status: 'pending',
      goalId: createdGoalId,
    };

    setTasks((prev) => [createdTask, ...prev]);

    // Add immediate AI assistant follow up
    const followUpMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `Splendid! I have broken down "${newTask.title}" into ${newTask.subTasks.length} focused sub-tasks. You can find it in your Task Directory. Would you like to schedule this on your active calendar?`,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, followUpMsg]);
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'status'>) => {
    const createdTask: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      status: 'pending',
    };
    setTasks((prev) => [createdTask, ...prev]);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
          
          // Trigger motivational alert on completion
          if (nextStatus === 'completed') {
            triggerNotification("Milestone Completed!", `Outstanding job completing "${t.title}"!`);
          }

          return {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSub = t.subTasks.map((st) =>
            st.id === subTaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...t, subTasks: updatedSub };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleAddEvent = (newEvent: Omit<CalendarEvent, 'id'>) => {
    const createdEvent: CalendarEvent = {
      ...newEvent,
      id: `event-${Date.now()}`,
    };
    setEvents((prev) => [...prev, createdEvent]);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleCompleteTask = (taskId: string) => {
    handleToggleTask(taskId);
  };

  const handleConfirmScheduleTask = (taskId: string, start: string, end: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, scheduledStart: start, scheduledEnd: end };
        }
        return t;
      })
    );
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          context: {
            tasks,
            goals,
            events,
            localTime: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const siaMsg: ChatMessage = {
          id: `msg-sia-${Date.now()}`,
          sender: 'assistant',
          text: data.response,
          timestamp: new Date().toISOString(),
        };
        setChatHistory((prev) => [...prev, siaMsg]);
      } else {
        throw new Error('AI failed to respond');
      }
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        sender: 'system',
        text: 'Connection to Sia failed. Keep planning manually or verify your AI Studio settings.',
        timestamp: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Specific action execution from Sia's schedule alerts!
  const handleExecuteAlertAction = (actionType: string, taskId?: string) => {
    if (!taskId) {
      // General response
      handleSendMessage(`Let's execute: ${actionType}`);
      return;
    }

    // Proactive Rescheduling logic
    if (actionType.toLowerCase().includes('tomorrow') || actionType.toLowerCase().includes('move')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: 'pending',
              scheduledStart: `${tomorrowStr}T09:00`,
              scheduledEnd: `${tomorrowStr}T10:00`,
            };
          }
          return t;
        })
      );

      triggerNotification("Schedule Restructured", `Rescheduled task to tomorrow morning at 9:00 AM.`);
      handleSendMessage(`I chose to move that missed block to tomorrow morning.`);
    } 
    // Split into Pomodoro chunks logic
    else if (actionType.toLowerCase().includes('chunk') || actionType.toLowerCase().includes('split') || actionType.toLowerCase().includes('two')) {
      const targetTask = tasks.find(t => t.id === taskId);
      if (targetTask) {
        // Create 2 smaller tasks
        const sub1: Task = {
          ...targetTask,
          id: `task-split-1-${Date.now()}`,
          title: `${targetTask.title} (Part 1)`,
          estimatedDuration: Math.round(targetTask.estimatedDuration / 2),
          subTasks: targetTask.subTasks.slice(0, Math.ceil(targetTask.subTasks.length / 2)),
          scheduledStart: undefined,
          scheduledEnd: undefined,
        };

        const sub2: Task = {
          ...targetTask,
          id: `task-split-2-${Date.now()}`,
          title: `${targetTask.title} (Part 2)`,
          estimatedDuration: Math.round(targetTask.estimatedDuration / 2),
          subTasks: targetTask.subTasks.slice(Math.ceil(targetTask.subTasks.length / 2)),
          scheduledStart: undefined,
          scheduledEnd: undefined,
        };

        // Remove old task, add the 2 split ones
        setTasks((prev) => [sub1, sub2, ...prev.filter(t => t.id !== taskId)]);
        triggerNotification("Task Split Completed", `Divided "${targetTask.title}" into two dedicated blocks.`);
        handleSendMessage(`I have split "${targetTask.title}" into two smaller, highly focused chunks!`);
      }
    } else {
      handleSendMessage(`Applying optimization: "${actionType}" for the current block.`);
    }
  };

  const handleTestNotification = () => {
    triggerNotification("Focus Chime Test", "Sia proactive notifications are active! Your work is fully synchronized.");
  };

  if (deepFocusMode) {
    return (
      <DeepFocus
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onExit={() => setDeepFocusMode(false)}
      />
    );
  }

  return (
    <Dashboard
      tasks={tasks}
      goals={goals}
      events={events}
      chatHistory={chatHistory}
      onAddTask={handleAddTask}
      onToggleTask={handleToggleTask}
      onToggleSubTask={handleToggleSubTask}
      onDeleteTask={handleDeleteTask}
      onSendMessage={handleSendMessage}
      onClearChat={() => setChatHistory([])}
      onExecuteAlertAction={(suggestion) => handleExecuteAlertAction(suggestion.type, suggestion.taskId)}
      isAiLoading={isAiLoading}
      setIsAiLoading={setIsAiLoading}
      onAddBreakdown={handleAddBreakdown}
      onAddEvent={handleAddEvent}
      onDeleteEvent={handleDeleteEvent}
      syncCode={syncCode}
      syncStatus={syncStatus}
      onLoadSession={handleLoadSession}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      onLaunchDeepFocus={() => setDeepFocusMode(true)}
      notificationStatus={notificationStatus}
      onRequestNotificationPermission={handleRequestPermission}
      onTestNotification={handleTestNotification}
    />
  );
}

// Seed Mock Data
function getSeedTasks(): Task[] {
  return [
    {
      id: 'task-seed-1',
      title: 'Draft Essay bibliography research',
      description: 'Find and select at least 5 scholarly sources on renewable energy models.',
      status: 'pending',
      priority: 'high',
      category: 'Research',
      estimatedDuration: 45,
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      subTasks: [
        { id: 'st-seed-1a', title: 'Search university library index', completed: false, estimatedDuration: 15 },
        { id: 'st-seed-1b', title: 'Export citation files to bibTex', completed: false, estimatedDuration: 15 },
        { id: 'st-seed-1c', title: 'Summarize core thesis points', completed: false, estimatedDuration: 15 },
      ],
    },
    {
      id: 'task-seed-2',
      title: 'Review Calculus Chapter 4 Integration',
      description: 'Practice integration by parts and trigonometric substitutions.',
      status: 'pending',
      priority: 'medium',
      category: 'Study',
      estimatedDuration: 60,
      deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      subTasks: [
        { id: 'st-seed-2a', title: 'Solve odd practice exercises 1-15', completed: false, estimatedDuration: 30 },
        { id: 'st-seed-2b', title: 'Memorize fundamental integration definitions', completed: false, estimatedDuration: 30 },
      ],
    },
  ];
}

function getSeedGoals(): Goal[] {
  return [
    {
      id: 'goal-seed-1',
      title: 'Acquire Calculus Midterm Grade A',
      description: 'Study all chapters and compile revision logs.',
      deadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      progress: 0,
    }
  ];
}

function getSeedEvents(): CalendarEvent[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'event-seed-1',
      title: 'Advanced Calculus Lecture',
      start: `${todayStr}T14:00`,
      end: `${todayStr}T15:30`,
      type: 'class',
      description: 'Topic: Taylor Series convergence models',
    }
  ];
}
