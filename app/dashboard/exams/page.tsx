'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExamsService, ExamInput, ExamResponse, UpdateExam } from '@/lib/api/exams';
import { SubjectsService } from '@/lib/api/subjects';
import { OnboardingService, ProfileResponse } from '@/lib/api/onboarding';
import { SubjectResponse } from '@/lib/api/onboarding';
import { handleApiError } from '@/lib/api/client';

// Exam type options based on education system
const examTypesBySystem: { [key: string]: string[] } = {
  IB: ['Paper 1', 'Paper 2', 'Paper 3', 'Internal Assessment (IA)', 'Extended Essay', 'TOK Essay', 'TOK Presentation'],
  'A-Level': ['Paper 1', 'Paper 2', 'Paper 3', 'Practical Endorsement', 'Non-Exam Assessment (NEA)', 'Coursework'],
  AP: ['Section 1 (Multiple Choice)', 'Section 2 (Free Response)', 'Full Exam'],
  American: ['Midterm', 'Final', 'Unit Test', 'Quiz', 'Project', 'Presentation'],
};

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  exams: ExamResponse[];
}

export default function ExamsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamResponse | null>(null);
  const [formData, setFormData] = useState<ExamInput>({
    subject_id: '',
    exam_date: '',
    exam_type: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    location: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examsData, subjectsData, profileData] = await Promise.all([
        ExamsService.getAll(),
        SubjectsService.getAll(),
        OnboardingService.getProfile(),
      ]);
      setExams(examsData);
      setSubjects(subjectsData);
      setProfile(profileData);
    } catch (error) {
      handleApiError(error, 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date): DayCell[] => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    // Adjust so Monday is 0
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Days from previous month
    const prevMonthDays: DayCell[] = [];
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      prevMonthDays.push({
        date,
        isCurrentMonth: false,
        exams: getExamsForDate(date),
      });
    }

    // Days in current month
    const currentMonthDays: DayCell[] = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      currentMonthDays.push({
        date,
        isCurrentMonth: true,
        exams: getExamsForDate(date),
      });
    }

    // Days from next month to complete the grid
    const totalCells = prevMonthDays.length + currentMonthDays.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    const nextMonthDays: DayCell[] = [];
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      nextMonthDays.push({
        date,
        isCurrentMonth: false,
        exams: getExamsForDate(date),
      });
    }

    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const getExamsForDate = (date: Date): ExamResponse[] => {
    const dateStr = date.toISOString().split('T')[0];
    return exams.filter(exam => exam.exam_date === dateStr);
  };

  const handleDayClick = (day: DayCell) => {
    setSelectedDate(day.date);
    setEditingExam(null);
    setFormData({
      subject_id: '',
      exam_date: day.date.toISOString().split('T')[0],
      exam_type: '',
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      location: '',
    });
    setDialogOpen(true);
  };

  const handleEditExam = (exam: ExamResponse) => {
    setEditingExam(exam);
    setFormData({
      subject_id: exam.subject_id,
      exam_date: exam.exam_date,
      exam_type: exam.exam_type,
      title: exam.title || '',
      description: exam.description || '',
      start_time: exam.start_time || '',
      end_time: exam.end_time || '',
      duration_minutes: exam.duration_minutes || '',
      location: exam.location || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.subject_id || !formData.exam_date || !formData.exam_type) {
        alert('Please fill in all required fields');
        return;
      }

      if (editingExam) {
        // Update existing exam
        await ExamsService.update(editingExam.id, formData as UpdateExam);
      } else {
        // Create new exam
        await ExamsService.create(formData);
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      handleApiError(error, editingExam ? 'Failed to update exam' : 'Failed to create exam');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      await ExamsService.delete(examId);
      loadData();
    } catch (error) {
      handleApiError(error, 'Failed to delete exam');
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days = getDaysInMonth(currentDate);
  const examTypes = profile ? examTypesBySystem[profile.education_system] || examTypesBySystem['IB'] : examTypesBySystem['IB'];

  const upcomingExams = exams
    .filter(exam => new Date(exam.exam_date) >= new Date())
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-heading font-bold">Exams</h1>
        <p className="text-muted-foreground">Manage your exam schedule and prepare effectively</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All scheduled exams</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In the next 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subjects with Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(exams.map(e => e.subject_id)).size}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {subjects.length} subjects</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading">Exam Calendar</CardTitle>
              <CardDescription>Click on any day to add an exam</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
              <div className="text-lg font-semibold w-48 text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground text-sm mt-2">Loading calendar...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`
                        min-h-[100px] p-2 rounded-lg border transition-all
                        ${day.isCurrentMonth ? 'bg-card border-border hover:bg-accent/50' : 'bg-muted/20 border-transparent text-muted-foreground'}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                        hover:shadow-md cursor-pointer
                      `}
                    >
                      <div className="text-sm font-medium mb-1">
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.exams.map(exam => {
                          const subject = subjects.find(s => s.id === exam.subject_id);
                          return (
                            <div
                              key={exam.id}
                              className="text-xs p-1 rounded truncate"
                              style={{ backgroundColor: subject?.color || '#6366f1', opacity: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExam(exam);
                              }}
                            >
                              <div className="font-medium text-white truncate">{exam.exam_type}</div>
                              <div className="text-white/80 truncate">{subject?.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Exams List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-heading">Upcoming Exams</CardTitle>
          <CardDescription>Your next 5 scheduled exams</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-6 w-6 text-muted-foreground">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">No upcoming exams</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map(exam => {
                const subject = subjects.find(s => s.id === exam.subject_id);
                const daysUntil = Math.ceil((new Date(exam.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={exam.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-all"
                    style={{ borderLeftWidth: '4px', borderLeftColor: subject?.color || '#6366f1' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{subject?.name}</h4>
                        <Badge variant="outline">{exam.exam_type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(exam.exam_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {exam.start_time && ` at ${exam.start_time}`}
                      </div>
                      {exam.location && (
                        <div className="text-xs text-muted-foreground mt-1">📍 {exam.location}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-primary">
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditExam(exam)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteExam(exam.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Exam Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExam ? 'Edit Exam' : 'Add New Exam'}</DialogTitle>
            <DialogDescription>
              {editingExam ? 'Update exam details' : 'Schedule a new exam'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} {subject.level && `(${subject.level})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam_type">Exam Type *</Label>
                <Select value={formData.exam_type} onValueChange={(value) => setFormData({ ...formData, exam_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_date">Date *</Label>
              <Input
                id="exam_date"
                type="date"
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="text"
                  placeholder="90"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="Exam Hall A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                type="text"
                placeholder="Custom title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="Additional notes"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingExam ? 'Update Exam' : 'Add Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
