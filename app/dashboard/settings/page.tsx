'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { OnboardingService, ProfileResponse, UpdateProfileData } from '@/lib/api/onboarding';

const EDUCATION_SYSTEMS = [
  { value: 'IB', label: 'International Baccalaureate (IB)' },
  { value: 'A-Level', label: 'A-Level' },
  { value: 'American', label: 'American System' },
];

const EDUCATION_PROGRAMS: Record<string, { value: string; label: string }[]> = {
  IB: [
    { value: 'IBDP', label: 'IB Diploma Programme (IBDP)' },
    { value: 'IBCP', label: 'IB Career-related Programme (IBCP)' },
    { value: 'IB Courses', label: 'IB Courses' },
  ],
  'A-Level': [
    { value: 'A-Level', label: 'A-Level' },
  ],
  American: [
    { value: 'Standard', label: 'Standard' },
    { value: 'AP', label: 'Advanced Placement (AP)' },
    { value: 'Honors', label: 'Honors' },
  ],
};

const TIMEZONES = [
  { value: 'UTC-12:00', label: '(UTC-12:00) International Date Line West' },
  { value: 'UTC-11:00', label: '(UTC-11:00) Coordinated Universal Time-11' },
  { value: 'UTC-10:00', label: '(UTC-10:00) Hawaii' },
  { value: 'UTC-09:00', label: '(UTC-09:00) Alaska' },
  { value: 'UTC-08:00', label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { value: 'UTC-07:00', label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'UTC-06:00', label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'UTC-05:00', label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { value: 'UTC-04:00', label: '(UTC-04:00) Atlantic Time (Canada)' },
  { value: 'UTC-03:00', label: '(UTC-03:00) Buenos Aires, Georgetown' },
  { value: 'UTC-02:00', label: '(UTC-02:00) Mid-Atlantic' },
  { value: 'UTC-01:00', label: '(UTC-01:00) Azores' },
  { value: 'UTC+00:00', label: '(UTC+00:00) London, Lisbon, Dublin' },
  { value: 'UTC+01:00', label: '(UTC+01:00) Amsterdam, Berlin, Paris' },
  { value: 'UTC+02:00', label: '(UTC+02:00) Athens, Helsinki, Istanbul' },
  { value: 'UTC+03:00', label: '(UTC+03:00) Moscow, St. Petersburg' },
  { value: 'UTC+04:00', label: '(UTC+04:00) Dubai, Abu Dhabi' },
  { value: 'UTC+05:00', label: '(UTC+05:00) Islamabad, Karachi' },
  { value: 'UTC+05:30', label: '(UTC+05:30) Mumbai, Kolkata, Chennai' },
  { value: 'UTC+06:00', label: '(UTC+06:00) Dhaka, Almaty' },
  { value: 'UTC+07:00', label: '(UTC+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'UTC+08:00', label: '(UTC+08:00) Beijing, Hong Kong, Singapore' },
  { value: 'UTC+09:00', label: '(UTC+09:00) Tokyo, Seoul, Osaka' },
  { value: 'UTC+10:00', label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'UTC+11:00', label: '(UTC+11:00) Solomon Islands' },
  { value: 'UTC+12:00', label: '(UTC+12:00) Auckland, Wellington' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [timezone, setTimezone] = useState('');
  const [educationSystem, setEducationSystem] = useState('');
  const [educationProgram, setEducationProgram] = useState('');
  const [studyGoal, setStudyGoal] = useState<number | ''>(''); // Hours per week

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profileData = await OnboardingService.getProfile();

      setProfile(profileData);

      // Set form values
      setTimezone(profileData.timezone);
      setEducationSystem(profileData.education_system);
      setEducationProgram(profileData.education_program || '');
      setStudyGoal(profileData.study_goal || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updateData: UpdateProfileData = {
        timezone,
        education_system: educationSystem,
        education_program: educationProgram,
        study_goal: studyGoal === '' ? undefined : studyGoal,
      };

      const updated = await OnboardingService.updateProfile(updateData);
      setProfile(updated);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="study-goal">Study Goal (hours per week)</Label>
                <Input
                  id="study-goal"
                  type="number"
                  min="0"
                  max="168"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-muted-foreground">
                  Set your weekly study time goal in hours
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Education Settings</CardTitle>
              <CardDescription>
                Your education system and program details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="education-system">Education System</Label>
                <Select value={educationSystem} onValueChange={setEducationSystem}>
                  <SelectTrigger id="education-system">
                    <SelectValue placeholder="Select your education system" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_SYSTEMS.map((sys) => (
                      <SelectItem key={sys.value} value={sys.value}>
                        {sys.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {educationSystem && (
                <div className="space-y-2">
                  <Label htmlFor="education-program">Program</Label>
                  <Select value={educationProgram} onValueChange={setEducationProgram}>
                    <SelectTrigger id="education-program">
                      <SelectValue placeholder="Select your program" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_PROGRAMS[educationSystem]?.map((prog) => (
                        <SelectItem key={prog.value} value={prog.value}>
                          {prog.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value="user@example.com" disabled />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                <div className="border border-destructive/50 rounded-lg p-4 space-y-4">
                  <div>
                    <p className="text-sm">
                      Permanently delete your account and all associated data.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
