'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { SubjectsService } from '@/lib/api/subjects';
import { SubjectResponse } from '@/lib/api/onboarding';
import { handleApiError } from '@/lib/api/client';
import { Calendar, Clock, BookOpen, TrendingUp, Award, Target, Activity, Zap } from 'lucide-react';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Student');
  const [currentTime, setCurrentTime] = useState('');
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Update time
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
      setCurrentTime(greeting);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await SubjectsService.getAll();
      // Sort by priority_coefficient descending (higher priority first)
      // const sorted = data.sort((a, b) => (b.priority_coefficient || 0) - (a.priority_coefficient || 0));
      setSubjects(data);
    } catch (error) {
      handleApiError(error, 'Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reorder subjects array
    const newSubjects = [...subjects];
    const [draggedSubject] = newSubjects.splice(draggedIndex, 1);
    newSubjects.splice(dropIndex, 0, draggedSubject);

    // Recalculate priority coefficients based on new order
    // const maxCoef = 3.0;
    // const minCoef = 0.5;
    // const step = newSubjects.length > 1 ? (maxCoef - minCoef) / (newSubjects.length - 1) : 0;

    // const updatedSubjects = newSubjects.map((subject, index) => ({
    //   ...subject,
    //   priority_coefficient: maxCoef - (step * index),
    // }));

    setSubjects(newSubjects);
    setDraggedIndex(null);

    // Update priority coefficients in the backend
    // try {
    //   await Promise.all(
    //     updatedSubjects.map(subject =>
    //       SubjectsService.update(subject.id, {
    //         name: subject.name,
    //         level: subject.level || undefined,
    //         category: subject.category || undefined,
    //         current_grade: subject.current_grade || undefined,
    //         target_grade: subject.target_grade || undefined,
    //         color: subject.color || undefined,
    //         priority_coefficient: subject.priority_coefficient,
    //       })
    //     )
    //   );
    // } catch (error) {
    //   handleApiError(error, 'Failed to update subject priorities');
    //   loadSubjects();
    // }
  };

  const quickStats = [
    {
      label: 'Tasks Due Today',
      value: '0',
      subtext: 'All caught up! 🎉',
      icon: <Clock className="w-5 h-5" />,
      gradient: 'from-blue-500/20 to-cyan-500/10'
    },
    {
      label: 'Study Hours',
      value: '0h',
      subtext: 'This week',
      icon: <BookOpen className="w-5 h-5" />,
      gradient: 'from-purple-500/20 to-pink-500/10'
    },
    {
      label: 'Upcoming Exams',
      value: '0',
      subtext: 'No exams scheduled',
      icon: <Calendar className="w-5 h-5" />,
      gradient: 'from-green-500/20 to-emerald-500/10'
    },
    {
      label: 'Task Completion',
      value: '0%',
      subtext: 'This week',
      icon: <Target className="w-5 h-5" />,
      gradient: 'from-orange-500/20 to-yellow-500/10'
    },
  ];

  const performanceMetrics = [
    { label: 'Focus Score', value: 85, color: 'from-blue-400 to-cyan-400' },
    { label: 'Consistency', value: 92, color: 'from-purple-400 to-pink-400' },
    { label: 'Efficiency', value: 78, color: 'from-green-400 to-emerald-400' },
    { label: 'Knowledge Retention', value: 88, color: 'from-orange-400 to-yellow-400' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <AnimatedText
            text={`${currentTime}, ${userName}`}
            className="text-4xl md:text-5xl font-bold mb-2"
            variant="slide"
          />
          <p className="text-white/60 text-lg">
            Here's what's happening with your studies today
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <GlassCard key={stat.label} hover glow>
              <div className={`bg-gradient-to-br ${stat.gradient} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white/70">{stat.icon}</div>
                  <Badge variant="glow" className="text-xs">Today</Badge>
                </div>
                <div className="text-3xl font-bold text-white glow-text mb-1">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
                <div className="text-white/40 text-xs mt-1">{stat.subtext}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Schedule */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Today's Schedule</h3>
                  <p className="text-white/60 text-sm">Your study sessions for today</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/study-timer')}>
                View All
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-lg">
                <div className="text-center">
                  <div className="text-6xl opacity-20 mb-4">📅</div>
                  <p className="text-white/60">No study sessions scheduled</p>
                  <Button className="mt-4" size="sm" onClick={() => router.push('/dashboard/study-timer')}>
                    + Schedule Session
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Performance Overview */}
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Performance</h3>
                <p className="text-white/60 text-sm">Your study metrics</p>
              </div>
            </div>

            <div className="space-y-4">
              {performanceMetrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 text-sm">{metric.label}</span>
                    <span className="text-white font-bold">{metric.value}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all duration-500`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Subjects Priority & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Study Priorities */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Study Priorities</h3>
                  <p className="text-white/60 text-sm">Drag to reorder subjects</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/subjects')}>
                View All
              </Button>
            </div>

            {loadingSubjects ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-white/20 border-t-white rounded-full"></div>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg">
                <div className="text-6xl opacity-20 mb-4">📚</div>
                <p className="text-white/60">No subjects yet</p>
                <Button className="mt-4" size="sm" onClick={() => router.push('/dashboard/subjects')}>
                  + Add Subject
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {subjects.slice(0, 5).map((subject, index) => (
                  <div
                    key={subject.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                      p-4 rounded-lg bg-white/5 border border-white/10
                      hover:bg-white/10 hover:border-white/20 transition-all cursor-move
                      ${draggedIndex === index ? 'opacity-50' : ''}
                    `}
                    style={{ borderLeftWidth: '3px', borderLeftColor: subject.color || '#6366f1' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{subject.name}</span>
                          {subject.level && (
                            <Badge variant="default" className="text-xs">
                              {subject.level}
                            </Badge>
                          )}
                        </div>
                        {(subject.current_grade || subject.target_grade) && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                            {subject.current_grade && <span>Current: {subject.current_grade}</span>}
                            {subject.current_grade && subject.target_grade && <span>→</span>}
                            {subject.target_grade && <span>Target: {subject.target_grade}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/40">Priority</div>
                        <div className="text-sm font-bold text-white">
                          N/A
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {subjects.length > 5 && (
                  <p className="text-center text-white/40 text-sm mt-2">
                    +{subjects.length - 5} more subjects
                  </p>
                )}
              </div>
            )}
          </GlassCard>

          {/* Upcoming Tasks */}
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Upcoming Tasks</h3>
                  <p className="text-white/60 text-sm">Your pending assignments</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/tasks')}>
                View All
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-lg">
                <div className="text-6xl opacity-20 mb-4">📝</div>
                <p className="text-white/60">No tasks yet</p>
                <Button className="mt-4" size="sm" onClick={() => router.push('/dashboard/tasks')}>
                  + Add Task
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Call to Action - Exam Dates */}
        <GlassCard glow className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <div className="flex flex-col md:flex-row items-center gap-6 p-2">
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Award className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <GradientText gradient="from-purple-400 to-pink-400">
                <h3 className="text-xl font-bold mb-1">Add Your Exam Dates</h3>
              </GradientText>
              <p className="text-white/60 text-sm">
                Enable AI-powered spaced repetition and exam preparation timelines
              </p>
            </div>
            <Button variant="primary" onClick={() => router.push('/dashboard/exams')}>
              + Add Exams
            </Button>
          </div>
        </GlassCard>

        {/* Weekly Progress */}
        <GlassCard className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Weekly Progress</h3>
              <p className="text-white/60 text-sm">Track your study goals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80">Study Goal</span>
                <span className="text-white font-bold">0 / 20 hours</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
              <p className="text-xs text-white/40 mt-1">Start tracking your study time</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/80">Tasks Completed</span>
                <span className="text-white font-bold">0 / 0</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
              <p className="text-xs text-white/40 mt-1">Add tasks to track progress</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}