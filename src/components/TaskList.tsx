import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Trash2, Calendar, ChevronDown, ChevronUp, AlertCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority, TaskStatus } from '../types';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTaskToSchedule: (task: Task) => void;
}

export default function TaskList({
  tasks,
  onToggleTask,
  onToggleSubTask,
  onDeleteTask,
  onSelectTaskToSchedule,
}: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Med</span>;
      case 'low':
        return <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Low</span>;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] text-zinc-400">Completed</span>;
      case 'missed':
        return <span className="text-[10px] text-red-400 font-medium">Missed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-widest font-mono uppercase">Your Directory</h3>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full">
          {tasks.length} item{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/10">
          <p className="text-xs text-zinc-400">Your directory is empty. Add a task or deconstruct a goal.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isExpanded = expandedTasks[task.id] || false;
            const completedSubTasks = task.subTasks.filter((st) => st.completed).length;
            const totalSubTasks = task.subTasks.length;

            return (
              <motion.div
                key={task.id}
                layout
                id={`task-card-${task.id}`}
                className={`bg-white dark:bg-zinc-900 border ${
                  task.status === 'completed'
                    ? 'border-zinc-150 dark:border-zinc-850 opacity-70'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-750'
                } rounded-xl overflow-hidden transition-all duration-150`}
              >
                {/* Compact Task row */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      id={`btn-toggle-task-${task.id}`}
                      onClick={() => onToggleTask(task.id)}
                      className="text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500" />
                      ) : (
                        <Circle className="w-4.5 h-4.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-0.5 font-mono">
                        <span className="truncate max-w-[80px]">{task.category}</span>
                        <span>•</span>
                        {getPriorityBadge(task.priority)}
                        {task.status !== 'pending' && (
                          <>
                            <span>•</span>
                            {getStatusLabel(task.status)}
                          </>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-semibold truncate ${
                          task.status === 'completed'
                            ? 'line-through text-zinc-400'
                            : 'text-zinc-800 dark:text-zinc-100'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {totalSubTasks > 0 && (
                        <p className="text-[10px] text-indigo-500 mt-1 font-medium">
                          {completedSubTasks}/{totalSubTasks} subtasks completed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions (Play / Schedule, Expand, Delete) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!task.scheduledStart && task.status !== 'completed' && (
                      <button
                        id={`btn-schedule-task-${task.id}`}
                        onClick={() => onSelectTaskToSchedule(task)}
                        title="Schedule task"
                        className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {totalSubTasks > 0 && (
                      <button
                        id={`btn-expand-task-${task.id}`}
                        onClick={() => toggleExpand(task.id)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button
                      id={`btn-delete-task-${task.id}`}
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtask list */}
                <AnimatePresence initial={false}>
                  {isExpanded && totalSubTasks > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/10 px-3 py-2 space-y-1.5"
                    >
                      {task.subTasks.map((subTask) => (
                        <div key={subTask.id} className="flex items-center gap-2 text-[11px] py-0.5">
                          <button
                            id={`btn-toggle-subtask-${task.id}-${subTask.id}`}
                            onClick={() => onToggleSubTask(task.id, subTask.id)}
                            className="text-zinc-400 hover:text-indigo-500 transition-colors"
                          >
                            {subTask.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span
                            className={`flex-1 truncate ${
                              subTask.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {subTask.title}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
