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
import { OnboardingService } from '@/lib/api/onboarding';
import { handleApiError } from '@/lib/api/client';
import { TIMEZONES, detectBrowserTimezone } from '@/lib/timezones';
import {
  User, Shield, Bell, Palette, Clock, Globe, BookOpen, GraduationCap,
  Target, ChevronRight, Save, AlertTriangle, Moon, Sun, Monitor,
  Volume2, Mail, Smartphone, Lock, Key, UserCheck, Trash2
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  // Preferences state (UI only, not persisted to backend)
  const [preferences, setPreferences] = useState({
    autoStartBreaks: false,
    soundNotifications: true,
    showAnimations: true,
    compactView: false
  });

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
    timezone: detectBrowserTimezone(),
    studyGoal: 20
  });

  // Fetch current user data and profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user basic info
        const user = await AuthService.getCurrentUser();

        // Fetch user profile (education system, grade, timezone, etc.)
        try {
          const profile = await OnboardingService.getProfile();
          setProfileData({
            name: user.full_name || 'Student',
            email: user.email,
            timezone: profile.timezone || detectBrowserTimezone(),
            studyGoal: profile.study_goal || 20
          });
          setEducationData({
            educationSystem: profile.education_system || 'IB',
            educationProgram: profile.education_program || 'IBDP',
            grade: profile.grade_level || 'Year 12'
          });
        } catch (err) {
          console.log('Could not fetch profile data:', err);
          // Use user data but keep defaults for profile
          setProfileData({
            name: user.full_name || 'Student',
            email: user.email,
            timezone: detectBrowserTimezone(),
            studyGoal: 20
          });
        }
      } catch (error) {
        handleApiError(error, 'Failed to load user data');
        setProfileData({
          name: 'Unknown User',
          email: 'Unknown',
          timezone: detectBrowserTimezone(),
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
    grade: 'Year 12'
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
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

  // Grade options based on education system and program
  const gradeOptions: Record<string, Record<string, string[]>> = {
    'IB': {
      'IBDP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
      'IBCP': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)'],
      'IB Courses': ['Year 1 (Grade 11)', 'Year 2 (Grade 12)']
    },
    'A-Level': {
      'AS Level': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)'],
      'A2 Level': ['Year 13 (Upper Sixth)'],
      'Combined': ['Year 12 (Lower Sixth)', 'Year 13 (Upper Sixth)']
    },
    'American': {
      'Standard': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
      'AP': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)'],
      'Honors': ['Grade 9 (Freshman)', 'Grade 10 (Sophomore)', 'Grade 11 (Junior)', 'Grade 12 (Senior)']
    },
    'GCSE': {
      'Standard': ['Year 10', 'Year 11'],
      'iGCSE': ['Year 10', 'Year 11']
    }
  };

  const getGradeOptions = () => {
    if (!educationData.educationSystem || !educationData.educationProgram) return [];
    return gradeOptions[educationData.educationSystem]?.[educationData.educationProgram] || [];
  };

  const handleEducationSystemChange = (newSystem: string) => {
    // Auto-reset program and grade when system changes
    const firstProgram = educationPrograms[newSystem as keyof typeof educationPrograms][0];
    const firstGrade = gradeOptions[newSystem]?.[firstProgram]?.[0] || '';

    setEducationData({
      educationSystem: newSystem,
      educationProgram: firstProgram,
      grade: firstGrade
    });
  };

  const handleEducationProgramChange = (newProgram: string) => {
    // Auto-reset grade when program changes
    const firstGrade = gradeOptions[educationData.educationSystem]?.[newProgram]?.[0] || '';

    setEducationData({
      ...educationData,
      educationProgram: newProgram,
      grade: firstGrade
    });
  };

  const handleSave = async () => {
    try {
      // Save profile data based on active tab
      if (activeTab === 'profile') {
        // Update user name
        await AuthService.updateUser({
          full_name: profileData.name
        });
        // Update profile (timezone and study goal)
        await OnboardingService.updateProfile({
          timezone: profileData.timezone,
          study_goal: profileData.studyGoal
        });
        setToastMessage('Profile settings saved successfully!');
      } else if (activeTab === 'education') {
        await OnboardingService.updateProfile({
          education_system: educationData.educationSystem,
          education_program: educationData.educationProgram,
          grade_level: educationData.grade
        });
        setToastMessage('Education settings saved successfully!');
      } else if (activeTab === 'notifications') {
        // TODO: Implement notifications saving when backend is ready
        setToastMessage('Notification settings will be saved in a future update');
      }

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
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value} className="bg-gray-900">
                              {tz.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-white/40 text-xs mt-1">
                          Used for scheduling study sessions and exam reminders
                        </p>
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
                          onChange={(e) => handleEducationSystemChange(e.target.value)}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {educationSystems.map((sys) => (
                            <option key={sys.value} value={sys.value} className="bg-gray-900">
                              {sys.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-white/40 text-xs mt-1">
                          Changing this will reset your program and grade selections
                        </p>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Program</label>
                        <select
                          value={educationData.educationProgram}
                          onChange={(e) => handleEducationProgramChange(e.target.value)}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {educationPrograms[educationData.educationSystem as keyof typeof educationPrograms]?.map((prog) => (
                            <option key={prog} value={prog} className="bg-gray-900">
                              {prog}
                            </option>
                          ))}
                        </select>
                        <p className="text-white/40 text-xs mt-1">
                          Your program type within the {educationData.educationSystem} system
                        </p>
                      </div>

                      <div>
                        <label className="block text-white/80 text-sm mb-2">Grade/Year Level</label>
                        <select
                          value={educationData.grade}
                          onChange={(e) => setEducationData({...educationData, grade: e.target.value})}
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                          {getGradeOptions().map((grade) => (
                            <option key={grade} value={grade} className="bg-gray-900">
                              {grade}
                            </option>
                          ))}
                        </select>
                        <p className="text-white/40 text-xs mt-1">
                          Your current academic year level
                        </p>
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
                      {/* Study Timer Settings */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Study Timer</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex-1">
                              <span className="text-white/80">Auto-start breaks</span>
                              <p className="text-white/40 text-xs mt-1">Automatically begin break timers when study sessions end</p>
                            </div>
                            <button
                              onClick={() => setPreferences({...preferences, autoStartBreaks: !preferences.autoStartBreaks})}
                              className={`w-12 h-6 rounded-full relative transition-colors ${
                                preferences.autoStartBreaks ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                preferences.autoStartBreaks ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex-1">
                              <span className="text-white/80">Sound notifications</span>
                              <p className="text-white/40 text-xs mt-1">Play sound when timer completes</p>
                            </div>
                            <button
                              onClick={() => setPreferences({...preferences, soundNotifications: !preferences.soundNotifications})}
                              className={`w-12 h-6 rounded-full relative transition-colors ${
                                preferences.soundNotifications ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                preferences.soundNotifications ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Settings */}
                      <div>
                        <h3 className="text-white font-medium mb-3">Display</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex-1">
                              <span className="text-white/80">Show animations</span>
                              <p className="text-white/40 text-xs mt-1">Enable smooth transitions and animations throughout the app</p>
                            </div>
                            <button
                              onClick={() => setPreferences({...preferences, showAnimations: !preferences.showAnimations})}
                              className={`w-12 h-6 rounded-full relative transition-colors ${
                                preferences.showAnimations ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                preferences.showAnimations ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex-1">
                              <span className="text-white/80">Compact view</span>
                              <p className="text-white/40 text-xs mt-1">Reduce spacing for a more condensed interface</p>
                            </div>
                            <button
                              onClick={() => setPreferences({...preferences, compactView: !preferences.compactView})}
                              className={`w-12 h-6 rounded-full relative transition-colors ${
                                preferences.compactView ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-white/10'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                preferences.compactView ? 'translate-x-6' : 'translate-x-0.5'
                              }`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <p className="text-blue-200 text-sm">
                          <span className="font-medium">Note:</span> These preferences are stored locally in your browser and will apply immediately.
                        </p>
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