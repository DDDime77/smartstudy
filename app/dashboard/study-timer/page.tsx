'use client';

import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { Play, Pause, RotateCcw, Coffee, Brain, Target, TrendingUp, Calendar, Clock, Zap, BookOpen, Award } from 'lucide-react';

export default function StudyTimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState('pomodoro');
  const [sessionGoal, setSessionGoal] = useState(2);

  // Mock data for display
  const subjects = [
    { id: '1', name: 'Mathematics', color: '#3b82f6' },
    { id: '2', name: 'Physics', color: '#10b981' },
    { id: '3', name: 'Chemistry', color: '#f59e0b' },
  ];

  const techniques = [
    {
      id: 'pomodoro',
      name: 'Pomodoro',
      description: '25 min focus, 5 min break',
      focusTime: 25,
      breakTime: 5,
      icon: '🍅',
      gradient: 'from-red-500/20 to-orange-500/10'
    },
    {
      id: 'deep-work',
      name: 'Deep Work',
      description: '90 min focus, 20 min break',
      focusTime: 90,
      breakTime: 20,
      icon: '🎯',
      gradient: 'from-purple-500/20 to-pink-500/10'
    },
    {
      id: 'timeboxing',
      name: 'Timeboxing',
      description: '45 min focus, 15 min break',
      focusTime: 45,
      breakTime: 15,
      icon: '📦',
      gradient: 'from-blue-500/20 to-cyan-500/10'
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Set your own intervals',
      focusTime: 30,
      breakTime: 10,
      icon: '⚙️',
      gradient: 'from-green-500/20 to-emerald-500/10'
    },
  ];

  const recentSessions = [
    { id: '1', subject: 'Mathematics', duration: '45 min', date: 'Today, 2:30 PM', focusScore: 4 },
    { id: '2', subject: 'Physics', duration: '30 min', date: 'Today, 10:00 AM', focusScore: 5 },
    { id: '3', subject: 'Chemistry', duration: '60 min', date: 'Yesterday, 4:00 PM', focusScore: 3 },
  ];

  const weeklyStats = [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 3.0 },
    { day: 'Wed', hours: 1.5 },
    { day: 'Thu', hours: 2.0 },
    { day: 'Fri', hours: 3.5 },
    { day: 'Sat', hours: 4.0 },
    { day: 'Sun', hours: 0 },
  ];

  const maxHours = Math.max(...weeklyStats.map(s => s.hours));

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <AnimatedText
            text="Study Timer"
            className="text-4xl md:text-5xl font-bold mb-2"
            variant="slide"
          />
          <p className="text-white/60 text-lg">
            Track your study sessions with focused time management
          </p>
        </div>

        {/* Main Timer Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Timer Display */}
          <GlassCard className="lg:col-span-2">
            <div className="p-8 text-center">
              {/* Timer Circle */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 120}`}
                    strokeDashoffset={`${2 * Math.PI * 120 * 0.25}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <span className="text-6xl font-bold">25:00</span>
                  </GradientText>
                  <p className="text-white/60 mt-2">Focus Time</p>
                </div>
              </div>

              {/* Subject Selector */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-3">Select Subject</label>
                <div className="flex flex-wrap justify-center gap-3">
                  {subjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject.id)}
                      className={`px-4 py-2 rounded-lg border transition-all ${
                        selectedSubject === subject.id
                          ? 'bg-white/20 border-white/40 shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      style={{
                        borderLeftWidth: '3px',
                        borderLeftColor: subject.color
                      }}
                    >
                      <span className="text-white">{subject.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                <Button
                  variant={isRunning ? "ghost" : "primary"}
                  size="lg"
                  onClick={() => setIsRunning(!isRunning)}
                  className="min-w-[140px]"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Reset
                </Button>
                <Button variant="ghost" size="lg">
                  <Coffee className="w-5 h-5 mr-2" />
                  Break
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Session Settings */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Session Settings</h3>
              </div>

              {/* Session Goal */}
              <div className="mb-6">
                <label className="block text-white/80 text-sm mb-3">Session Goal</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSessionGoal(Math.max(1, sessionGoal - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <span className="text-white">-</span>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{sessionGoal}</span>
                    <span className="text-white/60 ml-2">sessions</span>
                  </div>
                  <button
                    onClick={() => setSessionGoal(sessionGoal + 1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <span className="text-white">+</span>
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Progress</span>
                  <span className="text-white">0 / {sessionGoal}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
                    style={{ width: '0%' }}
                  />
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-white/80 text-sm">Today</span>
                  </div>
                  <span className="text-white font-bold">0h 0m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-white/80 text-sm">Streak</span>
                  </div>
                  <span className="text-white font-bold">0 days</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-white/80 text-sm">Focus Score</span>
                  </div>
                  <span className="text-white font-bold">0/5</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Study Techniques */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-4">Study Techniques</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {techniques.map((technique) => (
              <div key={technique.id} onClick={() => setSelectedTechnique(technique.id)} className="cursor-pointer">
              <GlassCard
                hover
                glow={selectedTechnique === technique.id}
              >
                <div className={`bg-gradient-to-br ${technique.gradient} rounded-lg p-6`}>
                  <div className="text-4xl mb-3">{technique.icon}</div>
                  <h4 className="text-lg font-bold text-white mb-1">{technique.name}</h4>
                  <p className="text-white/60 text-sm mb-3">{technique.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="default">
                      {technique.focusTime} min focus
                    </Badge>
                    <Badge variant="gradient">
                      {technique.breakTime} min break
                    </Badge>
                  </div>
                </div>
              </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions & Weekly Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Recent Sessions</h3>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </div>

              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{session.subject}</h4>
                      <Badge variant="gradient">{session.duration}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">{session.date}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= session.focusScore ? 'text-yellow-400' : 'text-white/20'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Weekly Activity */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Weekly Activity</h3>
                </div>
                <Badge variant="glow">16.5h total</Badge>
              </div>

              <div className="flex items-end justify-between h-40 mb-4">
                {weeklyStats.map((stat) => (
                  <div key={stat.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full max-w-[40px] bg-white/5 rounded-lg relative overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-400 to-purple-400 rounded-lg transition-all"
                        style={{
                          height: `${(stat.hours / maxHours) * 100}%`,
                          minHeight: stat.hours > 0 ? '4px' : '0'
                        }}
                      />
                      <div className="h-40 w-full" />
                    </div>
                    <span className="text-white/60 text-xs">{stat.day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Daily Avg</p>
                  <p className="text-white font-bold">2.4h</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Best Day</p>
                  <p className="text-white font-bold">Sat</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Streak</p>
                  <p className="text-white font-bold">5 days</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Motivational Quote */}
        <GlassCard className="mt-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <div className="p-6 text-center">
            <Award className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <GradientText gradient="from-purple-400 to-pink-400">
              <p className="text-xl font-bold mb-2">"Success is the sum of small efforts repeated day in and day out."</p>
            </GradientText>
            <p className="text-white/60">— Robert Collier</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}