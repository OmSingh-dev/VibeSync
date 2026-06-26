import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, MessageSquare, AlertTriangle, RefreshCw, Zap, Check, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, Task, CalendarEvent } from '../types';
import { triggerNotification } from '../lib/notifications';

interface SiaAssistantProps {
  tasks: Task[];
  events: CalendarEvent[];
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  onExecuteAlertAction: (actionType: string, taskId?: string) => void;
  isLoading: boolean;
}

export default function SiaAssistant({
  tasks,
  events,
  chatHistory,
  onSendMessage,
  onClearChat,
  onExecuteAlertAction,
  isLoading,
}: SiaAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [scheduleAlert, setScheduleAlert] = useState<{
    hasAlert: boolean;
    alertType: 'reschedule' | 'window' | 'motivate' | string;
    message: string;
    taskId?: string;
    suggestedActions: string[];
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Auto-scroll chat history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  // Proactive check on load or periodically
  useEffect(() => {
    scanSchedule(true);
  }, []);

  const scanSchedule = async (silent = false) => {
    const now = Date.now();
    // If silent (automatic check) and scanned within last 30 seconds, throttle it
    if (silent && now - lastScanTimeRef.current < 30000) {
      console.log("[SiaAssistant] Throttling automatic schedule check.");
      return;
    }
    
    if (!silent) setIsScanning(true);
    lastScanTimeRef.current = now;

    try {
      const response = await fetch('/api/check-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          events,
          localTime: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.hasAlert) {
          setScheduleAlert(data);
          // Only trigger OS push notification if the alert is actually relevant
          if (!silent) {
            triggerNotification("Sia Companion Alert", data.message);
          }
        } else {
          if (!silent) {
            setScheduleAlert({
              hasAlert: true,
              alertType: 'motivate',
              message: "Everything is beautifully synced up! Keep momentum going, what would you like to achieve next?",
              suggestedActions: ["Draft a short-term plan", "Check off outstanding sub-tasks"]
            });
          }
        }
      }
    } catch (e) {
      console.error("Sia schedule check failed", e);
    } finally {
      if (!silent) setIsScanning(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const executeAction = (actionName: string) => {
    if (scheduleAlert) {
      onExecuteAlertAction(actionName, scheduleAlert.taskId);
      // Clear alert after execution
      setScheduleAlert(null);
    }
  };

  return (
    <div id="sia-assistant-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col h-[520px] shadow-sm overflow-hidden transition-colors duration-200">
      
      {/* Sia Header */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-sans tracking-tight">Sia Productivity Companion</h2>
            <p className="text-[10px] text-zinc-500">Autonomous planning & rescheduling advocate</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-scan-schedule"
            onClick={() => scanSchedule(false)}
            disabled={isScanning}
            title="Scan Schedule for Gaps/Missed slots"
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-clear-chat"
            onClick={onClearChat}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline font-mono"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Proactive Alerts Section */}
      <AnimatePresence>
        {scheduleAlert && scheduleAlert.hasAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3 border-b ${
              scheduleAlert.alertType === 'reschedule'
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-950/30'
                : scheduleAlert.alertType === 'window'
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-950/30'
                : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-950/30'
            } flex gap-3`}
          >
            <div className="mt-0.5">
              {scheduleAlert.alertType === 'reschedule' ? (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              ) : scheduleAlert.alertType === 'window' ? (
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              )}
            </div>

            <div className="flex-1 text-[11px]">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase font-mono tracking-wider block mb-0.5">
                {scheduleAlert.alertType === 'reschedule'
                  ? 'Missed Block Recovery'
                  : scheduleAlert.alertType === 'window'
                  ? 'Open Time Window'
                  : 'Sia Advice'}
              </span>
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">{scheduleAlert.message}</p>
              
              {/* Interactive buttons */}
              {scheduleAlert.suggestedActions && scheduleAlert.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {scheduleAlert.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      id={`btn-alert-action-${idx}`}
                      onClick={() => executeAction(action)}
                      className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-750 transition active:scale-[0.97] text-zinc-800 dark:text-zinc-200 flex items-center gap-1"
                    >
                      <Check className="w-2.5 h-2.5" />
                      {action}
                    </button>
                  ))}
                  <button
                    id="btn-alert-dismiss"
                    onClick={() => setScheduleAlert(null)}
                    className="px-2 py-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/20 dark:bg-zinc-950/10">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Initiate Dialogue with Sia</p>
              <p className="text-[10px] text-zinc-400 max-w-xs mt-1">
                Ask Sia to split goals into weekly plans, recommend optimized slots, or guide you through current blocks.
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-none'
                      : 'bg-white text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className={`block text-[8px] mt-1.5 opacity-60 text-right ${isUser ? 'text-zinc-200 dark:text-zinc-700' : 'text-zinc-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-750 rounded-2xl rounded-bl-none p-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 flex gap-2">
        <input
          id="chat-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          placeholder="Ask Sia about rescheduling, time gaps, or planning..."
          className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
        />
        <button
          id="btn-chat-send"
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
