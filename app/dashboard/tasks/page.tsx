'use client';

import { useEffect, useState } from 'react';
import { TasksService, TaskResponse, TaskInput } from '@/lib/api';
import { SubjectsService, SubjectResponse } from '@/lib/api/subjects';
import GridBackground from '@/components/GridBackground';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import GradientText from '@/components/GradientText';
import AnimatedText from '@/components/AnimatedText';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState<TaskInput>({
    title: '',
    description: '',
    task_type: 'assignment',
    difficulty: 3,
    deadline: '',
    subject_id: '',
    tags: [],
  });

  useEffect(() => {
    loadTasks();
    loadSubjects();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await TasksService.getAll();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await SubjectsService.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await TasksService.create(newTask);
      setShowCreateDialog(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'assignment',
        difficulty: 3,
        deadline: '',
        subject_id: '',
        tags: [],
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await TasksService.delete(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: string) => {
    try {
      await TasksService.update(taskId, { status: status as any });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(task => task.status === filter);

  const getTaskTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      assignment: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
      exam_prep: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
      reading: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      practice: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      revision: 'from-orange-500/20 to-red-500/20 border-orange-500/30',
      project: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    };
    return colors[type] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, 'default' | 'gradient' | 'glow'> = {
      pending: 'default',
      in_progress: 'gradient',
      completed: 'glow',
      overdue: 'default',
    };
    return variants[status] || 'default';
  };

  const getDifficultyStars = (difficulty: number | null) => {
    if (!difficulty) return '';
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'No subject';
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown subject';
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  // Statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t.deadline) && t.status !== 'completed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <GridBackground />
        <div className="relative z-10 text-center">
          <div className="animate-pulse-glow">
            <GradientText gradient="from-blue-400 via-purple-400 to-pink-400">
              <span className="text-4xl font-bold">Loading...</span>
            </GradientText>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <AnimatedText
            text="Tasks & Assignments"
            className="text-4xl md:text-5xl font-bold mb-2"
            variant="slide"
          />
          <p className="text-white/60 text-lg">
            Master your workload with the 3-stage learning system
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, gradient: 'from-white/10 to-white/5' },
            { label: 'Pending', value: stats.pending, gradient: 'from-gray-500/20 to-gray-600/10' },
            { label: 'In Progress', value: stats.in_progress, gradient: 'from-blue-500/20 to-cyan-500/10' },
            { label: 'Completed', value: stats.completed, gradient: 'from-green-500/20 to-emerald-500/10' },
            { label: 'Overdue', value: stats.overdue, gradient: 'from-red-500/20 to-rose-500/10' },
          ].map((stat, index) => (
            <GlassCard key={stat.label} glow className="text-center">
              <div className={`bg-gradient-to-br ${stat.gradient} rounded-lg p-4`}>
                <div className="text-white/60 text-sm mb-1">{stat.label}</div>
                <div className="text-3xl font-bold text-white glow-text">{stat.value}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Filters and Create Button */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'in_progress', 'completed'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  filter === filterOption
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
                }`}
              >
                {filterOption.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="md">
            + New Task
          </Button>
        </div>

        {/* Tasks Grid */}
        <div className="grid gap-4">
          {filteredTasks.length === 0 ? (
            <GlassCard className="text-center py-16">
              <div className="space-y-4">
                <div className="text-6xl opacity-20">📝</div>
                <GradientText gradient="from-blue-400 to-purple-400">
                  <h3 className="text-2xl font-bold">No tasks found</h3>
                </GradientText>
                <p className="text-white/60">Create your first task to get started!</p>
                <Button onClick={() => setShowCreateDialog(true)} size="lg">
                  Create Task
                </Button>
              </div>
            </GlassCard>
          ) : (
            filteredTasks.map((task) => (
              <GlassCard key={task.id} hover glow>
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                  <div className="flex-1 space-y-3">
                    {/* Title and Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{task.title}</h3>
                      <Badge
                        variant={getStatusBadgeVariant(task.status)}
                        className="text-xs"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getTaskTypeColor(task.task_type)} border backdrop-blur-sm`}>
                        {task.task_type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="text-white/70 text-sm leading-relaxed">{task.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-sm text-white/50">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70">📚</span>
                        <span>{getSubjectName(task.subject_id)}</span>
                      </div>
                      {task.difficulty && (
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">{getDifficultyStars(task.difficulty)}</span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className={`flex items-center gap-2 ${isOverdue(task.deadline) && task.status !== 'completed' ? 'text-red-400 font-medium' : ''}`}>
                          <span className="text-white/70">📅</span>
                          <span>{formatDeadline(task.deadline)}</span>
                          {isOverdue(task.deadline) && task.status !== 'completed' && ' (Overdue)'}
                        </div>
                      )}
                      {task.estimated_duration && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/70">⏱️</span>
                          <span>{task.estimated_duration} min</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {task.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/60">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <Button
                        onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                        variant="secondary"
                        size="sm"
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        onClick={() => handleUpdateStatus(task.id, 'completed')}
                        variant="primary"
                        size="sm"
                      >
                        Complete
                      </Button>
                    )}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-4 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Create Task Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <h2 className="text-3xl font-bold">Create New Task</h2>
                  </GradientText>
                  <button
                    onClick={() => setShowCreateDialog(false)}
                    className="text-white/50 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      placeholder="e.g., Calculus Problem Set 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      rows={3}
                      placeholder="Describe the task..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Subject</label>
                      <select
                        value={newTask.subject_id}
                        onChange={(e) => setNewTask({ ...newTask, subject_id: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">No subject</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Task Type</label>
                      <select
                        value={newTask.task_type}
                        onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="assignment">Assignment</option>
                        <option value="exam_prep">Exam Prep</option>
                        <option value="reading">Reading</option>
                        <option value="practice">Practice</option>
                        <option value="revision">Revision</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Difficulty (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={newTask.difficulty}
                        onChange={(e) => setNewTask({ ...newTask, difficulty: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      />
                      <div className="text-yellow-400 mt-2 text-lg">{getDifficultyStars(newTask.difficulty || 0)}</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Deadline</label>
                      <input
                        type="datetime-local"
                        value={newTask.deadline}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowCreateDialog(false)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Create Task
                    </Button>
                  </div>
                </form>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
