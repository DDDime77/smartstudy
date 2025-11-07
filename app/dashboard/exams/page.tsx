'use client';

import { useEffect, useState } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { ExamsService, ExamInput, ExamResponse, UpdateExam } from '@/lib/api/exams';
import { SubjectsService } from '@/lib/api/subjects';
import { OnboardingService, ProfileResponse, SubjectResponse } from '@/lib/api/onboarding';
import { handleApiError } from '@/lib/api/client';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, BookOpen, AlertCircle, Award } from 'lucide-react';

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

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayOfWeek = firstDay.getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const prevMonthDays: DayCell[] = [];
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      prevMonthDays.push({
        date,
        isCurrentMonth: false,
        exams: getExamsForDate(date),
      });
    }

    const currentMonthDays: DayCell[] = [];
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      currentMonthDays.push({
        date,
        isCurrentMonth: true,
        exams: getExamsForDate(date),
      });
    }

    const totalCells = prevMonthDays.length + currentMonthDays.length;
    const remainingCells = 42 - totalCells;
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
        return;
      }

      if (editingExam) {
        await ExamsService.update(editingExam.id, formData as UpdateExam);
      } else {
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedText
              text="Exams"
              className="text-4xl md:text-5xl font-bold mb-2"
              variant="slide"
            />
            <p className="text-white/60 text-lg">
              Manage your exam schedule and prepare effectively
            </p>
          </div>
          <Button variant="primary" onClick={() => {
            setSelectedDate(new Date());
            setEditingExam(null);
            setFormData({
              subject_id: '',
              exam_date: new Date().toISOString().split('T')[0],
              exam_type: '',
              title: '',
              description: '',
              start_time: '',
              end_time: '',
              duration_minutes: '',
              location: '',
            });
            setDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Exam
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                  <BookOpen className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total Exams</p>
                  <p className="text-3xl font-bold text-white">{exams.length}</p>
                </div>
              </div>
              <p className="text-white/40 text-xs">All scheduled exams</p>
            </div>
          </GlassCard>

          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <AlertCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Upcoming</p>
                  <p className="text-3xl font-bold text-white">{upcomingExams.length}</p>
                </div>
              </div>
              <p className="text-white/40 text-xs">In the next 30 days</p>
            </div>
          </GlassCard>

          <GlassCard hover glow>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                  <Award className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Subjects</p>
                  <p className="text-3xl font-bold text-white">
                    {new Set(exams.map(e => e.subject_id)).size}/{subjects.length}
                  </p>
                </div>
              </div>
              <p className="text-white/40 text-xs">With scheduled exams</p>
            </div>
          </GlassCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <GlassCard className="lg:col-span-2">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Exam Calendar</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="px-4 py-1 rounded-lg bg-white/5 min-w-[180px] text-center">
                    <GradientText gradient="from-blue-400 to-purple-400">
                      <span className="font-bold">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </span>
                    </GradientText>
                  </div>
                  <button
                    onClick={nextMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-white/60 text-sm font-medium p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const isToday = day.date.toDateString() === new Date().toDateString();
                  return (
                    <button
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`
                        min-h-[90px] p-2 rounded-lg transition-all
                        ${day.isCurrentMonth
                          ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                          : 'bg-white/[0.02] border border-white/5 text-white/30'
                        }
                        ${isToday ? 'ring-2 ring-blue-400 border-blue-400' : ''}
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-400' : ''}`}>
                        {day.date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day.exams.slice(0, 2).map(exam => {
                          const subject = subjects.find(s => s.id === exam.subject_id);
                          return (
                            <div
                              key={exam.id}
                              className="text-xs p-1 rounded truncate"
                              style={{
                                background: `linear-gradient(135deg, ${subject?.color || '#6366f1'}33, ${subject?.color || '#6366f1'}11)`,
                                borderLeft: `2px solid ${subject?.color || '#6366f1'}`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExam(exam);
                              }}
                            >
                              <div className="font-medium text-white/90 truncate">
                                {subject?.name}
                              </div>
                            </div>
                          );
                        })}
                        {day.exams.length > 2 && (
                          <div className="text-xs text-white/60">
                            +{day.exams.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* Upcoming Exams */}
          <GlassCard>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Upcoming Exams</h3>
              </div>

              {upcomingExams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl opacity-20 mb-4">📅</div>
                  <p className="text-white/60">No upcoming exams</p>
                  <p className="text-white/40 text-sm mt-2">Click any date to add an exam</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map(exam => {
                    const subject = subjects.find(s => s.id === exam.subject_id);
                    const daysUntil = Math.ceil((new Date(exam.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={exam.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                        style={{ borderLeftWidth: '3px', borderLeftColor: subject?.color || '#6366f1' }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white">{subject?.name}</h4>
                          <Badge variant={daysUntil <= 7 ? 'glow' : 'gradient'} className="text-xs">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </Badge>
                        </div>
                        <p className="text-white/60 text-sm mb-1">{exam.exam_type}</p>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          {exam.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {exam.start_time}
                            </div>
                          )}
                          {exam.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {exam.location}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <Edit2 className="w-3 h-3 text-white/60" />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Add/Edit Exam Dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div>
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <h2 className="text-3xl font-bold mb-2">
                      {editingExam ? 'Edit Exam' : 'Add New Exam'}
                    </h2>
                  </GradientText>
                  <p className="text-white/60">
                    {editingExam ? 'Update exam details' : 'Schedule a new exam'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Subject *</label>
                      <select
                        value={formData.subject_id}
                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">Select subject</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name} {subject.level && `(${subject.level})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Exam Type *</label>
                      <select
                        value={formData.exam_type}
                        onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">Select type</option>
                        {examTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Date *</label>
                    <input
                      type="date"
                      value={formData.exam_date}
                      onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Duration (min)</label>
                      <input
                        type="text"
                        placeholder="90"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="Exam Hall A"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Title (Optional)</label>
                    <input
                      type="text"
                      placeholder="Custom title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Description</label>
                    <textarea
                      placeholder="Additional notes"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!formData.subject_id || !formData.exam_date || !formData.exam_type}
                  >
                    {editingExam ? 'Update Exam' : 'Add Exam'}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}