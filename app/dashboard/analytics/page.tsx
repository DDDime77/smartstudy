'use client';

import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { TrendingUp, Clock, Target, Award, BookOpen, Brain, Zap, BarChart3, Activity, Calendar, ChevronDown } from 'lucide-react';

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Mock data for display
  const studyHoursData = [
    { day: 'Mon', hours: 3.5 },
    { day: 'Tue', hours: 2.8 },
    { day: 'Wed', hours: 4.2 },
    { day: 'Thu', hours: 3.0 },
    { day: 'Fri', hours: 2.5 },
    { day: 'Sat', hours: 5.0 },
    { day: 'Sun', hours: 3.8 },
  ];

  const subjectDistribution = [
    { subject: 'Mathematics', hours: 12, color: '#3b82f6', percentage: 30 },
    { subject: 'Physics', hours: 10, color: '#10b981', percentage: 25 },
    { subject: 'Chemistry', hours: 8, color: '#f59e0b', percentage: 20 },
    { subject: 'Biology', hours: 6, color: '#8b5cf6', percentage: 15 },
    { subject: 'English', hours: 4, color: '#ec4899', percentage: 10 },
  ];

  const performanceMetrics = [
    { metric: 'Focus Score', value: 85, trend: '+5%', color: 'from-blue-400 to-cyan-400' },
    { metric: 'Task Completion', value: 92, trend: '+12%', color: 'from-green-400 to-emerald-400' },
    { metric: 'Study Consistency', value: 78, trend: '-3%', color: 'from-purple-400 to-pink-400' },
    { metric: 'Knowledge Retention', value: 88, trend: '+8%', color: 'from-orange-400 to-yellow-400' },
  ];

  const achievements = [
    { title: '7-Day Streak', icon: '🔥', date: 'Nov 5, 2025', color: 'from-orange-500/20 to-red-500/10' },
    { title: 'Early Bird', icon: '🌅', date: 'Nov 4, 2025', color: 'from-blue-500/20 to-cyan-500/10' },
    { title: 'Focus Master', icon: '🎯', date: 'Nov 3, 2025', color: 'from-purple-500/20 to-pink-500/10' },
    { title: 'Goal Crusher', icon: '💪', date: 'Nov 2, 2025', color: 'from-green-500/20 to-emerald-500/10' },
  ];

  const productivityInsights = [
    { insight: 'Most productive time', value: '2-5 PM', icon: Clock },
    { insight: 'Best focus day', value: 'Saturday', icon: Calendar },
    { insight: 'Average session', value: '45 min', icon: Activity },
    { insight: 'Weekly improvement', value: '+15%', icon: TrendingUp },
  ];

  const maxHours = Math.max(...studyHoursData.map(d => d.hours));

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedText
              text="Analytics"
              className="text-4xl md:text-5xl font-bold mb-2"
              variant="slide"
            />
            <p className="text-white/60 text-lg">
              Track your study progress and performance insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <Button variant="primary">
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <Badge variant={parseFloat(studyHoursData.reduce((a, b) => a + b.hours, 0).toFixed(1)) > 20 ? 'glow' : 'gradient'}>
                  Good
                </Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {studyHoursData.reduce((a, b) => a + b.hours, 0).toFixed(1)}h
              </div>
              <p className="text-white/60 text-sm">Total Study Time</p>
              <p className="text-xs text-green-400 mt-1">+12% from last week</p>
            </div>
          </GlassCard>

          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <Badge variant="gradient">On Track</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">18/20</div>
              <p className="text-white/60 text-sm">Goals Achieved</p>
              <p className="text-xs text-green-400 mt-1">90% completion rate</p>
            </div>
          </GlassCard>

          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <Badge variant="glow">Active</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">7 days</div>
              <p className="text-white/60 text-sm">Current Streak</p>
              <p className="text-xs text-green-400 mt-1">Personal best!</p>
            </div>
          </GlassCard>

          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                  <Brain className="w-5 h-5 text-orange-400" />
                </div>
                <Badge variant="gradient">High</Badge>
              </div>
              <div className="text-3xl font-bold text-white mb-1">4.2/5</div>
              <p className="text-white/60 text-sm">Avg Focus Score</p>
              <p className="text-xs text-green-400 mt-1">+0.3 improvement</p>
            </div>
          </GlassCard>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Study Hours Chart */}
          <GlassCard className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Study Hours</h3>
                </div>
                <Badge variant="gradient">{selectedPeriod}</Badge>
              </div>

              <div className="h-64 flex items-end justify-between gap-4">
                {studyHoursData.map((data) => (
                  <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-white/5 rounded-lg relative overflow-hidden flex-1 flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-blue-400 to-purple-400 rounded-lg transition-all duration-500 hover:from-blue-300 hover:to-purple-300"
                        style={{
                          height: `${(data.hours / maxHours) * 100}%`,
                          minHeight: '20px'
                        }}
                      >
                        <div className="text-center text-white font-bold text-sm pt-2">
                          {data.hours}h
                        </div>
                      </div>
                    </div>
                    <span className="text-white/60 text-sm">{data.day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Daily Average</p>
                  <p className="text-white font-bold text-lg">3.5h</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Best Day</p>
                  <p className="text-white font-bold text-lg">Saturday</p>
                </div>
                <div className="text-center">
                  <p className="text-white/60 text-xs mb-1">Goal Progress</p>
                  <p className="text-white font-bold text-lg">85%</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Subject Distribution */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Subject Distribution</h3>
              </div>

              <div className="space-y-3">
                {subjectDistribution.map((subject) => (
                  <div key={subject.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-white/80 text-sm">{subject.subject}</span>
                      </div>
                      <span className="text-white font-bold text-sm">{subject.hours}h</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${subject.percentage}%`,
                          backgroundColor: subject.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">Total Subjects</span>
                  <span className="text-white font-bold">{subjectDistribution.length}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-white/60 text-sm">Study Sessions</span>
                  <span className="text-white font-bold">42</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Performance & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Metrics */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <Activity className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Performance Metrics</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {performanceMetrics.map((metric) => (
                  <div key={metric.metric} className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60 text-sm">{metric.metric}</span>
                      <Badge variant={metric.trend.startsWith('+') ? 'glow' : 'default'} className="text-xs">
                        {metric.trend}
                      </Badge>
                    </div>
                    <div className="relative h-24 w-24 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke={`url(#gradient-${metric.metric.replace(' ', '-')}`}
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - metric.value / 100)}`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id={`gradient-${metric.metric.replace(' ', '-')}`}>
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{metric.value}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Recent Achievements */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                  <Award className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Recent Achievements</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.title}
                    className={`p-4 rounded-lg bg-gradient-to-br ${achievement.color} border border-white/10 hover:border-white/20 transition-all cursor-pointer group`}
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                      {achievement.icon}
                    </div>
                    <h4 className="text-white font-medium text-sm mb-1">{achievement.title}</h4>
                    <p className="text-white/40 text-xs">{achievement.date}</p>
                  </div>
                ))}
              </div>

              <Button variant="secondary" className="w-full mt-4">
                View All Achievements
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Productivity Insights */}
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Productivity Insights</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productivityInsights.map((item) => (
                <div key={item.insight} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <item.icon className="w-4 h-4 text-white/60" />
                    <span className="text-white/60 text-xs">{item.insight}</span>
                  </div>
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <p className="text-xl font-bold">{item.value}</p>
                  </GradientText>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-blue-400" />
                <div>
                  <h4 className="text-white font-medium">AI Recommendation</h4>
                  <p className="text-white/60 text-sm mt-1">
                    You perform best in the afternoon. Schedule your most challenging subjects between 2-5 PM for optimal focus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}