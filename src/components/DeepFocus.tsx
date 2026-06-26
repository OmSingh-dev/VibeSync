import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Shield, Sparkles, CheckCircle, BellOff } from 'lucide-react';
import { Task } from '../types';

interface DeepFocusProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onExit: () => void;
}

export default function DeepFocus({ tasks, onToggleTask, onExit }: DeepFocusProps) {
  // Find a pending task to suggest, or let user pick/create one
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    pendingTasks.length > 0 ? pendingTasks[0].id : ''
  );
  const [customTaskTitle, setCustomTaskTitle] = useState('');

  // Timer states
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');
  const [isMuted, setIsMuted] = useState(false);

  const activeTask = tasks.find((t) => t.id === selectedTaskId);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished
            playAlarmSound();
            if (timerMode === 'focus') {
              setTimerMode('break');
              setMinutes(5);
            } else {
              setTimerMode('focus');
              setMinutes(25);
            }
            setIsActive(false);
          } else {
            setMinutes((m) => m - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, minutes, seconds, timerMode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(timerMode === 'focus' ? 25 : 5);
    setSeconds(0);
  };

  const playAlarmSound = () => {
    if (isMuted) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // E5
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15); // A5
      oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.3); // E6

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (e) {
      // Browser audio context policy blocker
    }
  };

  const percentageLeft =
    ((minutes * 60 + seconds) / (timerMode === 'focus' ? 25 * 60 : 5 * 60)) * 100;

  return (
    <div className="fixed inset-0 bg-zinc-950 text-zinc-100 z-50 flex flex-col items-center justify-center p-6 transition-all duration-300">
      
      {/* Decorative stars and shielding lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
        <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">DEEP FOCUS LEVEL ACTIVE</span>
      </div>

      <button
        id="btn-exit-deep-focus"
        onClick={onExit}
        className="absolute top-6 right-6 p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl transition"
        title="Exit Deep Focus Mode"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Focus Stage */}
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-10 relative z-10">
        
        {/* Distraction silencer banner */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/40 border border-indigo-900/50 text-indigo-300 rounded-full text-[10px] font-mono uppercase tracking-widest">
          <BellOff className="w-3 h-3" /> Shield Enabled: Non-essential alerts are silenced
        </div>

        {/* Task Lock Selector or display */}
        <div className="w-full bg-zinc-900/60 border border-zinc-850 rounded-2xl p-6">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">CURRENT ACTIVE FOCUS TARGET</h3>
          
          {activeTask ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-white">{activeTask.title}</h2>
              {activeTask.description && (
                <p className="text-xs text-zinc-400 max-w-md mx-auto">{activeTask.description}</p>
              )}
              
              <div className="flex justify-center gap-3 mt-2">
                <button
                  id="btn-complete-focus-task"
                  onClick={() => onToggleTask(activeTask.id)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  {activeTask.status === 'completed' ? 'Mark Pending' : 'Check off Completed'}
                </button>
              </div>

              {activeTask.subTasks && activeTask.subTasks.length > 0 && (
                <div className="text-left border-t border-zinc-800/80 pt-4 mt-4 space-y-2 max-h-32 overflow-y-auto">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">SUBTASK MILESTONES</span>
                  {activeTask.subTasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${st.completed ? 'bg-indigo-400' : 'bg-zinc-600'}`} />
                      <span className={st.completed ? 'line-through text-zinc-500' : ''}>{st.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-xs text-zinc-400">Lock onto an existing milestone before beginning your countdown sprint:</p>
              
              {pendingTasks.length > 0 ? (
                <select
                  id="select-deep-focus-task"
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                >
                  <option value="">-- Choose a milestone --</option>
                  {pendingTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Enter manual sprint goal (e.g. Write essay outlines)"
                    value={customTaskTitle}
                    onChange={(e) => setCustomTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white text-center"
                  />
                  <p className="text-[10px] text-zinc-500 mt-2">Type a quick target or configure lists in the main workspace.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Immersive circular/bar countdown */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Main Visual Display */}
          <div className="text-7xl sm:text-8xl font-mono font-bold tracking-tight text-white mb-2 select-none">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase">
            {timerMode === 'focus' ? 'FOCUS INTERVAL' : 'SHORT BREAK'}
          </span>

          {/* Simple Clean Progress Bar */}
          <div className="w-64 h-1 bg-zinc-900 rounded-full overflow-hidden mt-6 border border-zinc-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-1000"
              style={{ width: `${percentageLeft}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button
            id="btn-deep-focus-reset"
            onClick={resetTimer}
            className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition hover:border-zinc-700"
            title="Reset interval"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-deep-focus-toggle"
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-8 py-3.5 ${
              isActive
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } rounded-2xl font-bold text-sm tracking-wide transition shadow-lg shadow-indigo-500/10 active:scale-[0.98]`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause Sprint</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Initiate Sprint</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
