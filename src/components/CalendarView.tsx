import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent, EventType, Task } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onCompleteTask: (taskId: string) => void;
  selectedTaskToSchedule: Task | null;
  onCloseScheduleModal: () => void;
  onConfirmScheduleTask: (taskId: string, start: string, end: string) => void;
}

export default function CalendarView({
  events,
  tasks,
  onAddEvent,
  onDeleteEvent,
  onCompleteTask,
  selectedTaskToSchedule,
  onCloseScheduleModal,
  onConfirmScheduleTask,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddQuickEvent, setShowAddQuickEvent] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<EventType>('class');
  const [quickStart, setQuickStart] = useState('');
  const [quickEnd, setQuickEnd] = useState('');

  // Schedulers for task modal
  const [taskStart, setTaskStart] = useState('');
  const [taskEnd, setTaskEnd] = useState('');

  // Get current date string representation
  const dateStr = currentDate.toISOString().split('T')[0];

  // Filter events for current day
  const dailyEvents = events.filter((e) => e.start.startsWith(dateStr));
  
  // Also list scheduled tasks as event blocks
  const scheduledTasks = tasks.filter((t) => t.scheduledStart && t.scheduledStart.startsWith(dateStr));

  // Sort chronologically
  const allDayItems = [
    ...dailyEvents.map(e => ({ ...e, isTask: false, completed: false })),
    ...scheduledTasks.map(t => ({
      id: t.id,
      title: t.title,
      start: t.scheduledStart!,
      end: t.scheduledEnd || t.scheduledStart!,
      type: 'task' as EventType,
      isTask: true,
      completed: t.status === 'completed',
      description: t.description,
    }))
  ].sort((a, b) => a.start.localeCompare(b.start));

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoStr;
    }
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const submitQuickEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle || !quickStart || !quickEnd) return;

    onAddEvent({
      title: quickTitle,
      type: quickType,
      start: `${dateStr}T${quickStart}`,
      end: `${dateStr}T${quickEnd}`,
    });

    setQuickTitle('');
    setQuickStart('');
    setQuickEnd('');
    setShowAddQuickEvent(false);
  };

  const submitScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskToSchedule || !taskStart || !taskEnd) return;

    onConfirmScheduleTask(
      selectedTaskToSchedule.id,
      `${dateStr}T${taskStart}`,
      `${dateStr}T${taskEnd}`
    );

    setTaskStart('');
    setTaskEnd('');
    onCloseScheduleModal();
  };

  return (
    <div id="calendar-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-sans tracking-tight">Active Schedule Sync</h2>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-calendar-prev"
            onClick={handlePrevDay}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="btn-calendar-today"
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            Today
          </button>
          <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
            {currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <button
            id="btn-calendar-next"
            onClick={handleNextDay}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of schedule blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase font-mono tracking-wider">DAILY TIME BLOCKS</span>
          <button
            id="btn-toggle-add-event"
            onClick={() => setShowAddQuickEvent(!showAddQuickEvent)}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Class/Meeting
          </button>
        </div>

        {/* Quick add event inline */}
        {showAddQuickEvent && (
          <form onSubmit={submitQuickEvent} className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">New Block</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Class or Meeting Title"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                required
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
              />
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value as EventType)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
              >
                <option value="class">Class Block</option>
                <option value="meeting">Meeting Block</option>
                <option value="routine">Routine Block</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-0.5">START TIME</label>
                <input
                  type="time"
                  value={quickStart}
                  onChange={(e) => setQuickStart(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-0.5">END TIME</label>
                <input
                  type="time"
                  value={quickEnd}
                  onChange={(e) => setQuickEnd(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowAddQuickEvent(false)}
                className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium"
              >
                Save Block
              </button>
            </div>
          </form>
        )}

        {/* Day timeline */}
        <div className="space-y-2">
          {allDayItems.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs border border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl">
              No calendar blocks or tasks scheduled for today.
            </div>
          ) : (
            allDayItems.map((item) => {
              const isTask = item.isTask;
              const completed = (item as any).completed;
              
              // Color styles depending on block type
              let colorClasses = 'border-indigo-100 bg-indigo-50/50 dark:border-indigo-950/40 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300';
              if (item.type === 'meeting') {
                colorClasses = 'border-amber-100 bg-amber-50/50 dark:border-amber-950/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300';
              } else if (item.type === 'routine') {
                colorClasses = 'border-teal-100 bg-teal-50/50 dark:border-teal-950/40 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300';
              } else if (isTask) {
                colorClasses = completed
                  ? 'border-zinc-200 bg-zinc-50 dark:border-zinc-800/60 dark:bg-zinc-950/40 text-zinc-400 dark:text-zinc-500'
                  : 'border-violet-100 bg-violet-50/50 dark:border-violet-950/40 dark:bg-violet-950/20 text-violet-800 dark:text-violet-300';
              }

              return (
                <div
                  key={item.id}
                  id={`schedule-item-${item.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${colorClasses} transition-all`}
                >
                  <div className="text-center min-w-[70px] shrink-0">
                    <span className="text-xs font-bold font-mono tracking-tight block">
                      {formatTime(item.start)}
                    </span>
                    <span className="text-[10px] opacity-60 font-mono block">
                      to {formatTime(item.end)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider opacity-65 text-[9px]">
                        {isTask ? 'Task Block' : `${item.type} Block`}
                      </span>
                      {completed && (
                        <span className="text-[9px] font-mono font-medium px-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 rounded">
                          Done
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-semibold truncate ${completed ? 'line-through' : ''}`}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[10px] opacity-75 truncate">{item.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1">
                    {isTask && !completed && (
                      <button
                        id={`btn-complete-calendar-task-${item.id}`}
                        onClick={() => onCompleteTask(item.id)}
                        title="Mark Complete"
                        className="p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-lg"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      id={`btn-delete-schedule-item-${item.id}`}
                      onClick={() => isTask ? onCompleteTask(item.id) : onDeleteEvent(item.id)}
                      title={isTask ? "Clear Task Schedule" : "Delete Block"}
                      className="p-1 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Scheduling Modal */}
      {selectedTaskToSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Schedule Time Block</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Allocate a dedicated study/focus chunk for <strong className="text-zinc-800 dark:text-zinc-200">"{selectedTaskToSchedule.title}"</strong> on {currentDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}.
            </p>

            <form onSubmit={submitScheduleTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">START TIME</label>
                <input
                  type="time"
                  required
                  value={taskStart}
                  onChange={(e) => setTaskStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">END TIME</label>
                <input
                  type="time"
                  required
                  value={taskEnd}
                  onChange={(e) => setTaskEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex gap-2 justify-end text-xs font-semibold pt-2">
                <button
                  type="button"
                  onClick={onCloseScheduleModal}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  Lock in block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
