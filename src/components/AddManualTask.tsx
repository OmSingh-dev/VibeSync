import React, { useState } from 'react';
import { Clock, Plus, Tag } from 'lucide-react';
import { Task, TaskPriority } from '../types';

interface AddManualTaskProps {
  onAddTask: (task: Omit<Task, 'id' | 'status'>) => void;
}

export default function AddManualTask({ onAddTask }: AddManualTaskProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Study');
  const [estimatedDuration, setEstimatedDuration] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      description: '',
      priority,
      category: category.trim() || 'General',
      estimatedDuration: Number(estimatedDuration) || 30,
      subTasks: [],
    });

    setTitle('');
  };

  return (
    <div id="add-manual-task-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm transition-colors duration-200">
      <div className="mb-3.5">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Quick Task</h2>
        <p className="text-[10px] text-zinc-500">Add a quick milestone to your list immediately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Title Input with embedded dispatch button */}
        <div className="relative flex items-center">
          <input
            id="manual-title"
            type="text"
            required
            placeholder="What's your next task? (e.g. Core workout)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full pl-3 pr-12 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 text-xs"
          />
          <button
            id="btn-add-manual-task"
            type="submit"
            className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-150 active:scale-95"
            title="Add task"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inline Compact Attributes */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Category */}
          <div className="relative">
            <Tag className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-400" />
            <input
              id="manual-category"
              type="text"
              placeholder="Study"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 text-[11px]"
            />
          </div>

          {/* Duration Selector */}
          <div className="relative">
            <Clock className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-400" />
            <select
              id="manual-duration"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(Number(e.target.value))}
              className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 text-[11px] appearance-none"
            >
              <option value="15">15 mins</option>
              <option value="30">30 mins</option>
              <option value="45">45 mins</option>
              <option value="60">1 hr</option>
              <option value="90">1.5 hrs</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              id="manual-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 text-[11px] text-center"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </form>
    </div>
  );
}
