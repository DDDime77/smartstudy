'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import AnimatedText from '@/components/AnimatedText';
import GradientText from '@/components/GradientText';
import GridBackground from '@/components/GridBackground';
import { SubjectsService, SubjectStats } from '@/lib/api/subjects';
import { SubjectResponse, SubjectInput, OnboardingService, ProfileResponse } from '@/lib/api/onboarding';
import { EDUCATION_SYSTEMS } from '@/lib/education-config';
import { handleApiError } from '@/lib/api/client';
import { BookOpen, TrendingUp, Clock, CheckCircle, Star, Edit, Trash2, Plus, Target, BarChart3, Award } from 'lucide-react';

const SUBJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectResponse | null>(null);
  const [editForm, setEditForm] = useState<SubjectInput>({
    name: '',
    level: '',
    category: '',
    current_grade: '',
    target_grade: '',
    color: '',
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<SubjectInput>({
    name: '',
    level: '',
    category: '',
    current_grade: '',
    target_grade: '',
    color: '#6366f1',
  });
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const [subjectsData, profileData] = await Promise.all([
        SubjectsService.getAll(),
        OnboardingService.getProfile(),
      ]);
      setSubjects(subjectsData);
      setProfile(profileData);
    } catch (error) {
      handleApiError(error, 'Failed to load subjects');
      setSubjects([]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = async (subject: SubjectResponse) => {
    setSelectedSubject(subject);
    setStatsLoading(true);
    try {
      const stats = await SubjectsService.getStats(subject.id);
      setSubjectStats(stats);
    } catch (error) {
      handleApiError(error, 'Failed to load subject stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleEditClick = (subject: SubjectResponse) => {
    setEditSubject(subject);
    setEditForm({
      name: subject.name,
      level: subject.level || '',
      category: subject.category || '',
      current_grade: subject.current_grade || '',
      target_grade: subject.target_grade || '',
      color: subject.color || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editSubject) return;

    try {
      await SubjectsService.update(editSubject.id, editForm);
      await loadSubjects();
      setEditSubject(null);
      if (selectedSubject?.id === editSubject.id) {
        setSelectedSubject(null);
        setSubjectStats(null);
      }
    } catch (error) {
      handleApiError(error, 'Failed to update subject');
    }
  };

  const handleAddSubject = async () => {
    if (!addForm.name.trim()) return;

    try {
      await OnboardingService.addSubject(addForm);
      await loadSubjects();
      setShowAddDialog(false);
      setAddForm({
        name: '',
        level: '',
        category: '',
        current_grade: '',
        target_grade: '',
        color: '#6366f1',
      });
    } catch (error) {
      handleApiError(error, 'Failed to add subject');
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to archive this subject?')) return;

    try {
      await SubjectsService.delete(subjectId);
      await loadSubjects();
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
        setSubjectStats(null);
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete subject');
    }
  };

  // Get available subjects based on education system
  const getAvailableSubjects = () => {
    const educationSystem = profile?.education_system || 'IB';
    const educationProgram = profile?.education_program || 'IBDP';

    const system = EDUCATION_SYSTEMS[educationSystem as keyof typeof EDUCATION_SYSTEMS];
    if (!system) return [];

    let programKey = educationProgram;
    if (!programKey || programKey === null) {
      const availablePrograms = Object.keys(system.programs);
      programKey = availablePrograms[0];
    }

    const program = system.programs[programKey as keyof typeof system.programs];
    if (!program) return [];

    if ('subjectGroups' in program && typeof (program as any).subjectGroups === 'object') {
      const allSubjects: { name: string; category: string }[] = [];
      Object.entries((program as any).subjectGroups).forEach(([group, subjects]) => {
        if (Array.isArray(subjects)) {
          subjects.forEach(subject => {
            allSubjects.push({ name: subject, category: group });
          });
        }
      });
      return allSubjects;
    } else if ('subjects' in program && Array.isArray((program as any).subjects)) {
      return (program as any).subjects.map((subject: string) => ({ name: subject, category: '' }));
    }

    return [];
  };

  const getAvailableLevels = () => {
    const educationSystem = profile?.education_system || 'IB';
    if (educationSystem === 'IB') return ['HL', 'SL'];
    if (educationSystem === 'A-Level') return ['A-Level', 'AS-Level'];
    return [];
  };

  const getAvailableGrades = () => {
    const educationSystem = profile?.education_system || 'IB';
    const educationProgram = profile?.education_program || 'IBDP';

    const system = EDUCATION_SYSTEMS[educationSystem as keyof typeof EDUCATION_SYSTEMS];
    if (!system) return [];

    let programKey = educationProgram;
    if (!programKey || programKey === null) {
      const availablePrograms = Object.keys(system.programs);
      programKey = availablePrograms[0];
    }

    const program = system.programs[programKey as keyof typeof system.programs];
    if (!program || !('grading' in program)) return [];

    const grading = (program as any).grading;
    if ('scale' in grading && Array.isArray(grading.scale)) {
      return grading.scale.map(String);
    } else if ('letterGrades' in grading && Array.isArray(grading.letterGrades)) {
      return grading.letterGrades.map((g: any) => g.letter);
    }

    return [];
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedText
              text="Subjects"
              className="text-4xl md:text-5xl font-bold mb-2"
              variant="slide"
            />
            <p className="text-white/60 text-lg">
              Manage and track your academic subjects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="glow" className="text-sm">
              {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
            </Badge>
            <Button variant="primary" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {subjects.length === 0 ? (
          <GlassCard className="text-center py-16">
            <div className="space-y-4">
              <div className="text-6xl opacity-20">📚</div>
              <GradientText gradient="from-blue-400 to-purple-400">
                <h3 className="text-2xl font-bold">No subjects yet</h3>
              </GradientText>
              <p className="text-white/60">Get started by adding your first subject</p>
              <Button onClick={() => setShowAddDialog(true)} size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>
          </GlassCard>
        ) : (
          /* Subjects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <GlassCard
                key={subject.id}
                hover
                glow
                className="group cursor-pointer"
                style={{ borderLeftWidth: '4px', borderLeftColor: subject.color || '#6366f1' }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        {subject.name}
                      </h3>
                      {subject.level && (
                        <Badge variant="gradient" className="mt-2">
                          {subject.level}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(subject);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Edit className="w-4 h-4 text-white/80" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(subject.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {subject.category && (
                    <p className="text-white/60 text-sm mb-3">{subject.category}</p>
                  )}

                  {(subject.current_grade || subject.target_grade) && (
                    <div className="flex items-center gap-2 mb-4">
                      {subject.current_grade && (
                        <div className="flex items-center gap-1">
                          <span className="text-white/60 text-sm">Current:</span>
                          <Badge variant="default">{subject.current_grade}</Badge>
                        </div>
                      )}
                      {subject.current_grade && subject.target_grade && (
                        <span className="text-white/40">→</span>
                      )}
                      {subject.target_grade && (
                        <div className="flex items-center gap-1">
                          <span className="text-white/60 text-sm">Target:</span>
                          <span
                            className="text-white text-xs px-2 py-1 rounded-full"
                            style={{ backgroundColor: subject.color || '#6366f1' }}
                          >
                            {subject.target_grade}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSubjectClick(subject)}
                  >
                    View Details
                    <BarChart3 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Add Subject Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div>
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <h2 className="text-3xl font-bold mb-2">Add New Subject</h2>
                  </GradientText>
                  <p className="text-white/60">Select a subject from your curriculum</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Subject *</label>
                    <select
                      value={addForm.name}
                      onChange={(e) => {
                        const subject = getAvailableSubjects().find((s: { name: string; category: string }) => s.name === e.target.value);
                        setAddForm({
                          ...addForm,
                          name: e.target.value,
                          category: subject?.category || ''
                        });
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                    >
                      <option value="">Select a subject</option>
                      {getAvailableSubjects().map((subject: { name: string; category: string }) => (
                        <option key={subject.name} value={subject.name}>
                          {subject.name} {subject.category && `(${subject.category})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {getAvailableLevels().length > 0 && (
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Level</label>
                      <select
                        value={addForm.level || ''}
                        onChange={(e) => setAddForm({ ...addForm, level: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">Select level</option>
                        {getAvailableLevels().map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Current Grade</label>
                      <select
                        value={addForm.current_grade || ''}
                        onChange={(e) => setAddForm({ ...addForm, current_grade: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">Select grade</option>
                        {getAvailableGrades().map((grade: string) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Target Grade</label>
                      <select
                        value={addForm.target_grade || ''}
                        onChange={(e) => setAddForm({ ...addForm, target_grade: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      >
                        <option value="">Select grade</option>
                        {getAvailableGrades().map((grade: string) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Color</label>
                    <div className="grid grid-cols-9 gap-2">
                      {SUBJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setAddForm({ ...addForm, color })}
                          className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                            addForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleAddSubject} disabled={!addForm.name}>
                    Add Subject
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Edit Subject Dialog */}
        {editSubject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div>
                  <GradientText gradient="from-blue-400 to-purple-400">
                    <h2 className="text-3xl font-bold mb-2">Edit Subject</h2>
                  </GradientText>
                  <p className="text-white/60">Update the details for this subject</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm mb-2">Subject Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                      placeholder="e.g., Mathematics"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Level</label>
                      <input
                        type="text"
                        value={editForm.level || ''}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        placeholder="e.g., HL"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Category</label>
                      <input
                        type="text"
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        placeholder="e.g., Sciences"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Current Grade</label>
                      <input
                        type="text"
                        value={editForm.current_grade || ''}
                        onChange={(e) => setEditForm({ ...editForm, current_grade: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        placeholder="e.g., 6"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Target Grade</label>
                      <input
                        type="text"
                        value={editForm.target_grade || ''}
                        onChange={(e) => setEditForm({ ...editForm, target_grade: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                        placeholder="e.g., 7"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm mb-2">Color</label>
                    <div className="grid grid-cols-9 gap-2">
                      {SUBJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color })}
                          className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                            editForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setEditSubject(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSaveEdit} disabled={!editForm.name}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Subject Detail View */}
        {selectedSubject && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <GradientText gradient="from-blue-400 to-purple-400">
                      <h2 className="text-3xl font-bold mb-2">{selectedSubject.name}</h2>
                    </GradientText>
                    <div className="flex items-center gap-2">
                      {selectedSubject.level && (
                        <Badge variant="gradient">{selectedSubject.level}</Badge>
                      )}
                      {selectedSubject.category && (
                        <span className="text-white/60">{selectedSubject.category}</span>
                      )}
                    </div>
                  </div>
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0"
                    style={{ backgroundColor: selectedSubject.color || '#6366f1' }}
                  />
                </div>

                {statsLoading ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-white/20 border-t-white rounded-full mx-auto"></div>
                  </div>
                ) : subjectStats && (
                  <div className="space-y-6">
                    {/* Grade Progress */}
                    {(subjectStats.current_grade || subjectStats.target_grade) && (
                      <div className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/10">
                        <h3 className="text-white/80 text-sm mb-3">Grade Progress</h3>
                        <div className="flex items-center gap-4">
                          {subjectStats.current_grade && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/60">Current:</span>
                              <Badge variant="glow" className="text-lg px-3">
                                {subjectStats.current_grade}
                              </Badge>
                            </div>
                          )}
                          {subjectStats.current_grade && subjectStats.target_grade && (
                            <Target className="w-4 h-4 text-white/40" />
                          )}
                          {subjectStats.target_grade && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/60">Target:</span>
                              <span
                                className="text-lg px-3 py-1 rounded-full text-white"
                                style={{ backgroundColor: subjectStats.subject_color || '#6366f1' }}
                              >
                                {subjectStats.target_grade}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Study Hours */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-400" />
                          <span className="text-white/60 text-sm">Total Hours</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{subjectStats.total_study_hours}h</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-purple-400" />
                          <span className="text-white/60 text-sm">This Week</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{subjectStats.study_hours_this_week}h</div>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-green-400" />
                          <span className="text-white/60 text-sm">This Month</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{subjectStats.study_hours_this_month}h</div>
                      </div>
                    </div>

                    {/* Task Stats */}
                    <div className="space-y-3">
                      <h3 className="text-white/80 text-sm">Task Statistics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/60">Completed</span>
                            <span className="text-white font-bold">
                              {subjectStats.completed_tasks} / {subjectStats.total_tasks}
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                              style={{ width: `${subjectStats.completion_rate}%` }}
                            />
                          </div>
                          <p className="text-xs text-white/40 mt-1">{subjectStats.completion_rate}% completion</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/60">Pending</span>
                            <span className="text-white font-bold">{subjectStats.pending_tasks}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                              style={{
                                width: `${subjectStats.total_tasks > 0 ? (subjectStats.pending_tasks / subjectStats.total_tasks) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-white/40 mt-1">
                            {subjectStats.total_tasks > 0 ? Math.round((subjectStats.pending_tasks / subjectStats.total_tasks) * 100) : 0}% of total
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sessions & Focus */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          <span className="text-white/60">Total Sessions</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{subjectStats.total_sessions}</p>
                      </div>
                      {subjectStats.average_focus_rating && (
                        <div className="p-4 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-white/60">Average Focus</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-white">{subjectStats.average_focus_rating}</p>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= subjectStats.average_focus_rating!
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-white/20'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button variant="ghost" onClick={() => handleEditClick(selectedSubject)}>
                    Edit Subject
                  </Button>
                  <Button variant="primary" onClick={() => setSelectedSubject(null)}>
                    Close
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