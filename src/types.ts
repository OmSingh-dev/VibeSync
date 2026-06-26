export type TaskStatus = 'pending' | 'completed' | 'missed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type EventType = 'task' | 'class' | 'meeting' | 'routine';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedDuration: number; // in minutes
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedDuration: number; // total in minutes
  category: string;
  subTasks: SubTask[];
  deadline?: string; // YYYY-MM-DD
  scheduledStart?: string; // ISO string or YYYY-MM-DDTHH:MM
  scheduledEnd?: string; // ISO string or YYYY-MM-DDTHH:MM
  goalId?: string;
  completedAt?: string;
  completedPomos?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  progress: number; // 0 to 100
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // YYYY-MM-DDTHH:MM
  end: string; // YYYY-MM-DDTHH:MM
  type: EventType;
  relatedTaskId?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  // Metadata for action suggestions
  suggestion?: {
    type: 'reschedule' | 'breakdown' | 'window';
    taskId?: string;
    suggestedSlots?: string[];
    subTasksToCreate?: string[];
    targetTime?: string;
  };
}

export interface SyncData {
  userId: string;
  tasks: Task[];
  goals: Goal[];
  events: CalendarEvent[];
  updatedAt: string;
}
