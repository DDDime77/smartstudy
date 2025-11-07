'use client';

import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { Bell, Check, Clock, Award, Calendar, Target, TrendingUp, AlertCircle, BookOpen, Trash2, Settings, Filter, CheckCircle, Zap } from 'lucide-react';

export default function NotificationsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // Mock notifications data
  const notifications = [
    {
      id: '1',
      type: 'achievement',
      title: '7-Day Streak Achievement! 🔥',
      message: "Congratulations! You've maintained a 7-day study streak. Keep up the great work!",
      time: '2 hours ago',
      unread: true,
      icon: Award,
      color: 'from-orange-500/20 to-yellow-500/20',
      iconColor: 'text-orange-400'
    },
    {
      id: '2',
      type: 'reminder',
      title: 'Study Session Reminder',
      message: 'Your scheduled Mathematics study session starts in 30 minutes',
      time: '3 hours ago',
      unread: true,
      icon: Clock,
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-400'
    },
    {
      id: '3',
      type: 'task',
      title: 'Task Due Tomorrow',
      message: 'Physics Problem Set 5 is due tomorrow at 11:59 PM',
      time: '5 hours ago',
      unread: false,
      icon: AlertCircle,
      color: 'from-red-500/20 to-rose-500/20',
      iconColor: 'text-red-400'
    },
    {
      id: '4',
      type: 'exam',
      title: 'Exam in 3 Days',
      message: 'Chemistry Paper 1 scheduled for November 10, 2025',
      time: '1 day ago',
      unread: false,
      icon: Calendar,
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400'
    },
    {
      id: '5',
      type: 'progress',
      title: 'Weekly Goal Achieved!',
      message: "You've completed 20 hours of study this week - 100% of your goal",
      time: '2 days ago',
      unread: false,
      icon: Target,
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-400'
    },
    {
      id: '6',
      type: 'insight',
      title: 'Performance Insight',
      message: 'Your focus score has improved by 15% this month. Best performance in afternoon sessions.',
      time: '3 days ago',
      unread: false,
      icon: TrendingUp,
      color: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-400'
    },
  ];

  const notificationSettings = [
    { category: 'Study Reminders', enabled: true, description: 'Notifications for scheduled study sessions' },
    { category: 'Task Deadlines', enabled: true, description: 'Alerts for upcoming task due dates' },
    { category: 'Achievements', enabled: true, description: 'Celebrate your milestones and streaks' },
    { category: 'Exam Alerts', enabled: true, description: 'Reminders for upcoming exams' },
    { category: 'Progress Reports', enabled: false, description: 'Weekly and monthly progress summaries' },
    { category: 'Focus Insights', enabled: false, description: 'AI-powered study performance insights' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All', count: notifications.length },
    { value: 'unread', label: 'Unread', count: notifications.filter(n => n.unread).length },
    { value: 'achievement', label: 'Achievements', count: notifications.filter(n => n.type === 'achievement').length },
    { value: 'reminder', label: 'Reminders', count: notifications.filter(n => n.type === 'reminder').length },
    { value: 'task', label: 'Tasks', count: notifications.filter(n => n.type === 'task').length },
  ];

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (showOnlyUnread) {
      filtered = filtered.filter(n => n.unread);
    }

    if (selectedFilter !== 'all') {
      if (selectedFilter === 'unread') {
        filtered = filtered.filter(n => n.unread);
      } else {
        filtered = filtered.filter(n => n.type === selectedFilter);
      }
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedText
              text="Notifications"
              className="text-4xl md:text-5xl font-bold mb-2"
              variant="slide"
            />
            <p className="text-white/60 text-lg">
              Stay updated with your study progress and reminders
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <Badge variant="glow" className="text-sm">
                {unreadCount} New
              </Badge>
            )}
            <Button variant="secondary" size="sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedFilter === option.value
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/10'
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedFilter === option.value
                    ? 'bg-black/20 text-black'
                    : 'bg-white/10'
                }`}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredNotifications.length === 0 ? (
              <GlassCard>
                <div className="p-12 text-center">
                  <div className="text-6xl opacity-20 mb-4">🔔</div>
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <h3 className="text-2xl font-bold mb-2">No notifications</h3>
                  </GradientText>
                  <p className="text-white/60">You're all caught up!</p>
                </div>
              </GlassCard>
            ) : (
              filteredNotifications.map((notification) => (
                <GlassCard
                  key={notification.id}
                  hover
                  glow={notification.unread}
                  className={notification.unread ? 'border-l-4 border-l-blue-400' : ''}
                >
                  <div className="p-6">
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${notification.color} flex-shrink-0`}>
                        <notification.icon className={`w-6 h-6 ${notification.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-white mb-1">
                              {notification.title}
                            </h3>
                            {notification.unread && (
                              <Badge variant="glow" className="text-xs mb-2">New</Badge>
                            )}
                          </div>
                          <button className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                            <Trash2 className="w-4 h-4 text-white/40" />
                          </button>
                        </div>
                        <p className="text-white/70 mb-3">{notification.message}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 text-sm">{notification.time}</span>
                          {notification.type === 'reminder' && (
                            <Button variant="ghost" size="sm">
                              View Session
                            </Button>
                          )}
                          {notification.type === 'task' && (
                            <Button variant="ghost" size="sm">
                              View Task
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {/* Notification Settings */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Bell className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Notification Stats</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <p className="text-2xl font-bold text-white mb-1">{notifications.length}</p>
                    <p className="text-white/60 text-xs">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-white/5">
                    <p className="text-2xl font-bold text-blue-400 mb-1">{unreadCount}</p>
                    <p className="text-white/60 text-xs">Unread</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">This Week</span>
                    <span className="text-white font-bold">24</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">This Month</span>
                    <span className="text-white font-bold">156</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Notification Preferences */}
            <GlassCard>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                    <Settings className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Preferences</h3>
                </div>

                <div className="space-y-3">
                  {notificationSettings.map((setting) => (
                    <div
                      key={setting.category}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{setting.category}</span>
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${
                          setting.enabled ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                        }`}>
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                            setting.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </div>
                      </div>
                      <p className="text-white/40 text-xs">{setting.description}</p>
                    </div>
                  ))}
                </div>

                <Button variant="primary" className="w-full mt-4">
                  Save Preferences
                </Button>
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
              <div className="p-6 text-center">
                <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <GradientText gradient="from-blue-400 to-purple-400">
                  <h4 className="text-lg font-bold mb-2">Smart Notifications</h4>
                </GradientText>
                <p className="text-white/60 text-sm mb-4">
                  AI-powered notifications adapt to your study patterns
                </p>
                <Badge variant="glow">Active</Badge>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}