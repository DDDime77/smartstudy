'use client';

import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import NotificationToast from '@/components/ui/notification-toast';
import { AuthService } from '@/lib/api/auth';
import { handleApiError } from '@/lib/api/client';
import {
  User, Shield, Bell, Palette, Clock, Globe, BookOpen, GraduationCap,
  Target, ChevronRight, Save, AlertTriangle, Moon, Sun, Monitor,
  Volume2, Mail, Smartphone, Lock, Key, UserCheck, Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState('system');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    studyReminders: true,
    examAlerts: true,
    achievements: true,
    weeklyReports: false
  });

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: 'Loading...',
    email: 'Loading...',
    timezone: 'UTC+00:00',
    studyGoal: 20
  });

  // Fetch current user data and profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user basic info
        const user = await AuthService.getCurrentUser();
        setProfileData({
          name: user.full_name || 'Student',
          email: user.email,
          timezone: 'UTC+00:00',
          studyGoal: 20
        });

        // Fetch user profile (education system, grade, etc.)
        try {
          const response = await fetch('/api/onboarding/profile', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const profile = await response.json();
            setEducationData({
              educationSystem: profile.education_system || 'IB',
              educationProgram: profile.education_program || 'IBDP',
              grade: profile.grade_level || 'Year 12',
              school: 'International School'
            });
          }
        } catch (err) {
          console.log('Could not fetch profile data:', err);
        }
      } catch (error) {
        handleApiError(error, 'Failed to load user data');
        setProfileData({
          name: 'Unknown User',
          email: 'Unknown',
          timezone: 'UTC+00:00',
          studyGoal: 20
        });
      }
    };

    fetchData();
  }, []);

  // Education form state
  const [educationData, setEducationData] = useState({
    educationSystem: 'IB',
    educationProgram: 'IBDP',
    grade: 'Year 12',
    school: 'International School'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const timezones = [
    { value: 'UTC-12:00', label: '(UTC-12:00) International Date Line West' },
    { value: 'UTC-11:00', label: '(UTC-11:00) Hawaii' },
    { value: 'UTC-10:00', label: '(UTC-10:00) Alaska' },
    { value: 'UTC-08:00', label: '(UTC-08:00) Pacific Time' },
    { value: 'UTC-07:00', label: '(UTC-07:00) Mountain Time' },
    { value: 'UTC-06:00', label: '(UTC-06:00) Central Time' },
    { value: 'UTC-05:00', label: '(UTC-05:00) Eastern Time' },
    { value: 'UTC+00:00', label: '(UTC+00:00) London, Dublin' },
    { value: 'UTC+01:00', label: '(UTC+01:00) Paris, Berlin' },
    { value: 'UTC+08:00', label: '(UTC+08:00) Singapore, Hong Kong' },
    { value: 'UTC+09:00', label: '(UTC+09:00) Tokyo, Seoul' },
  ];

  const educationSystems = [
    { value: 'IB', label: 'International Baccalaureate (IB)' },
    { value: 'A-Level', label: 'A-Level' },
    { value: 'American', label: 'American System' },
    { value: 'GCSE', label: 'GCSE' },
  ];

  const educationPrograms = {
    'IB': ['IBDP', 'IBCP', 'IB Courses'],
    'A-Level': ['AS Level', 'A2 Level', 'Combined'],
    'American': ['Standard', 'AP', 'Honors'],
    'GCSE': ['Standard', 'iGCSE'],
  };

  const handleSave = async () => {
    try {
      // Save profile data based on active tab
      if (activeTab === 'education') {
        const response = await fetch('/api/onboarding/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            education_system: educationData.educationSystem,
            education_program: educationData.educationProgram,
            grade_level: educationData.grade
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save education settings');
        }
      }

      setToastMessage('Settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setToastMessage('Failed to save settings');
      setToastType('error');
      setShowToast(true);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <AnimatedText
            text="Settings"
            className="text-4xl md:text-5xl font-bold mb-2"
            variant="slide"
          />
          <p className="text-white/60 text-lg">
            Manage your account and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <GlassCard>
              <div className="p-6 space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${
                      activeTab === tab.id ? 'text-blue-400' : 'text-white/60'
                    }`} />
                    <span className={`font-medium ${
                      activeTab === tab.id ? 'text-white' : 'text-white/80'
                    }`}>
                      {tab.label}
                    </span>
                    {activeTab === tab.id && (
                      <ChevronRight className="w-4 h-4 text-blue-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                        <User className="w-5 h-5 text-blue-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Display Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                          placeholder="Enter your name"
                        />
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          disabled
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/50"
                        />
                        <p className="text-white/40 text-xs mt-1">Contact support to change your email</p>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Timezone</label>
                        <select
                          value={profileData.timezone}
                          onChange={(e) => setProfileData({...profileData, timezone: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value} className="bg-gray-900">
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Weekly Study Goal (hours)</label>
                        <input
                          type="number"
                          value={profileData.studyGoal}
                          onChange={(e) => setProfileData({...profileData, studyGoal: parseInt(e.target.value)})}
                          min="0"
                          max="168"
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                        />
                      </div>

                      <div className="pt-4">
                        <Button variant="primary" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* Education Tab */}
            {activeTab === 'education' && (
              <>
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                        <GraduationCap className="w-5 h-5 text-green-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Education Settings</h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Education System</label>
                        <select
                          value={educationData.educationSystem}
                          onChange={(e) => setEducationData({...educationData, educationSystem: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {educationSystems.map((sys) => (
                            <option key={sys.value} value={sys.value} className="bg-gray-900">
                              {sys.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Program</label>
                        <select
                          value={educationData.educationProgram}
                          onChange={(e) => setEducationData({...educationData, educationProgram: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {educationPrograms[educationData.educationSystem as keyof typeof educationPrograms]?.map((prog) => (
                            <option key={prog} value={prog} className="bg-gray-900">
                              {prog}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Grade/Year</label>
                        <input
                          type="text"
                          value={educationData.grade}
                          onChange={(e) => setEducationData({...educationData, grade: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                          placeholder="e.g., Year 12, Grade 11"
                        />
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">School</label>
                        <input
                          type="text"
                          value={educationData.school}
                          onChange={(e) => setEducationData({...educationData, school: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                          placeholder="Your school name"
                        />
                      </div>

                      <div className="pt-4">
                        <Button variant="primary" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <>
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Palette className="w-5 h-5 text-purple-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">App Preferences</h2>
                    </div>

                    <div className="space-y-6">
                      {/* Theme Settings */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Theme</h3>
                        <div className="flex gap-3">
                          {['system', 'light', 'dark'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setDarkMode(mode)}
                              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                darkMode === mode
                                  ? 'bg-white/10 border-blue-400 text-blue-400'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                              }`}
                            >
                              {mode === 'system' && <Monitor className="w-4 h-4" />}
                              {mode === 'light' && <Sun className="w-4 h-4" />}
                              {mode === 'dark' && <Moon className="w-4 h-4" />}
                              <span className="capitalize">{mode}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Study Timer Settings */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Study Timer</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <span className="text-white/80">Auto-start breaks</span>
                            <button className="w-12 h-6 rounded-full bg-white/10 relative">
                              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <span className="text-white/80">Sound notifications</span>
                            <button className="w-12 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 relative">
                              <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Settings */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Display</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <span className="text-white/80">Show animations</span>
                            <button className="w-12 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 relative">
                              <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full transition-transform" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <span className="text-white/80">Compact view</span>
                            <button className="w-12 h-6 rounded-full bg-white/10 relative">
                              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button variant="primary" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Preferences
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <>
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
                        <Bell className="w-5 h-5 text-orange-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
                    </div>

                    <div className="space-y-6">
                      {/* Notification Channels */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Notification Channels</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-white/60" />
                              <span className="text-white/80">Email notifications</span>
                            </div>
                            <button className={`w-12 h-6 rounded-full relative transition-colors ${
                              notifications.email ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                            }`}>
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                notifications.email ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div className="flex items-center gap-3">
                              <Smartphone className="w-4 h-4 text-white/60" />
                              <span className="text-white/80">Push notifications</span>
                            </div>
                            <button className={`w-12 h-6 rounded-full relative transition-colors ${
                              notifications.push ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                            }`}>
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                notifications.push ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Notification Types */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Notification Types</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'studyReminders', label: 'Study session reminders', icon: Clock },
                            { key: 'examAlerts', label: 'Exam alerts', icon: AlertTriangle },
                            { key: 'achievements', label: 'Achievement notifications', icon: Target },
                            { key: 'weeklyReports', label: 'Weekly progress reports', icon: BookOpen },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div className="flex items-center gap-3">
                                <item.icon className="w-4 h-4 text-white/60" />
                                <span className="text-white/80">{item.label}</span>
                              </div>
                              <button
                                onClick={() => setNotifications({...notifications, [item.key]: !notifications[item.key as keyof typeof notifications]})}
                                className={`w-12 h-6 rounded-full relative transition-colors ${
                                  notifications[item.key as keyof typeof notifications] ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                                }`}
                              >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                  notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button variant="primary" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <>
                <GlassCard>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-rose-500/20">
                        <Shield className="w-5 h-5 text-red-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Security Settings</h2>
                    </div>

                    <div className="space-y-6">
                      {/* Password */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Password</h3>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Key className="w-5 h-5 text-white/60" />
                              <div>
                                <p className="text-white">Password</p>
                                <p className="text-white/40 text-sm">Last changed 30 days ago</p>
                              </div>
                            </div>
                            <Button variant="secondary" size="sm">
                              Change Password
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Two-Factor Authentication */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Two-Factor Authentication</h3>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Lock className="w-5 h-5 text-white/60" />
                              <div>
                                <p className="text-white">2FA Status</p>
                                <p className="text-white/40 text-sm">Not enabled</p>
                              </div>
                            </div>
                            <Button variant="primary" size="sm">
                              Enable 2FA
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Active Sessions */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Active Sessions</h3>
                        <div className="space-y-2">
                          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <UserCheck className="w-4 h-4 text-green-400" />
                                <div>
                                  <p className="text-white text-sm">Chrome on Mac</p>
                                  <p className="text-white/40 text-xs">Current session</p>
                                </div>
                              </div>
                              <Badge variant="glow">Active</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Danger Zone */}
                      <div>
                        <h3 className="text-red-400 font-medium mb-3">Danger Zone</h3>
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                          <p className="text-white/80 mb-3">
                            Permanently delete your account and all associated data.
                          </p>
                          <p className="text-white/60 text-sm mb-4">
                            This action cannot be undone. You will lose all your data including subjects, tasks, and study history.
                          </p>
                          <Button variant="ghost" className="border-red-500 text-red-400 hover:bg-red-500/20">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      <NotificationToast
        message={toastMessage}
        type={toastType}
        isOpen={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}