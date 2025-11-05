'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SubjectsService, SubjectStats } from '@/lib/api/subjects';
import { SubjectResponse, SubjectInput, OnboardingService, ProfileResponse } from '@/lib/api/onboarding';
import { EDUCATION_SYSTEMS } from '@/lib/education-config';

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
      console.error('Failed to load subjects and profile:', error);
      // Set empty defaults if API calls fail
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
      console.error('Failed to load subject stats:', error);
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
      alert('Subject updated successfully!');
    } catch (error) {
      console.error('Failed to update subject:', error);
      alert('Failed to update subject. Please try again.');
    }
  };

  const handleAddSubject = async () => {
    if (!addForm.name.trim()) {
      alert('Please enter a subject name');
      return;
    }

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
      alert('Subject added successfully!');
    } catch (error) {
      console.error('Failed to add subject:', error);
      alert('Failed to add subject. Please try again.');
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to archive this subject? It will be hidden from your active subjects.')) {
      return;
    }

    try {
      await SubjectsService.delete(subjectId);
      await loadSubjects();
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
        setSubjectStats(null);
      }
      alert('Subject archived successfully!');
    } catch (error) {
      console.error('Failed to delete subject:', error);
      alert('Failed to archive subject. Please try again.');
    }
  };

  const closeDetailView = () => {
    setSelectedSubject(null);
    setSubjectStats(null);
  };

  // Get available subjects based on education system
  const getAvailableSubjects = () => {
    if (!profile) {
      console.log('No profile data');
      return [];
    }

    console.log('Profile:', profile);
    console.log('Education System:', profile.education_system);
    console.log('Education Program:', profile.education_program);

    const system = EDUCATION_SYSTEMS[profile.education_system as keyof typeof EDUCATION_SYSTEMS];
    if (!system) {
      console.log('No system found for:', profile.education_system);
      return [];
    }

    // Handle null education_program by using the first available program
    let programKey = profile.education_program;
    if (!programKey || programKey === null) {
      const availablePrograms = Object.keys(system.programs);
      programKey = availablePrograms[0];
      console.log('Using default program:', programKey);
    }

    const program = system.programs[programKey as keyof typeof system.programs];
    if (!program) {
      console.log('No program found for:', programKey);
      console.log('Available programs:', Object.keys(system.programs));
      return [];
    }

    console.log('Program found:', program);

    // Handle different program structures
    if ('subjectGroups' in program && typeof program.subjectGroups === 'object') {
      // IB IBDP/IBCP with grouped subjects
      const allSubjects: { name: string; category: string }[] = [];
      Object.entries(program.subjectGroups).forEach(([group, subjects]) => {
        if (Array.isArray(subjects)) {
          subjects.forEach(subject => {
            allSubjects.push({ name: subject, category: group });
          });
        }
      });
      console.log('Returning grouped subjects:', allSubjects.length);
      return allSubjects;
    } else if ('subjects' in program && Array.isArray(program.subjects)) {
      // Flat subject list (A-Level, American, IB Courses)
      const subjects = program.subjects.map(subject => ({ name: subject, category: '' }));
      console.log('Returning flat subjects:', subjects.length);
      return subjects;
    }

    console.log('No subjects found in program structure');
    return [];
  };

  // Get available levels based on education system
  const getAvailableLevels = () => {
    if (!profile) return [];

    if (profile.education_system === 'IB') {
      return ['HL', 'SL'];
    } else if (profile.education_system === 'A-Level') {
      return ['A-Level', 'AS-Level'];
    }
    return [];
  };

  // Get available grades based on education system
  const getAvailableGrades = () => {
    if (!profile) return [];

    const system = EDUCATION_SYSTEMS[profile.education_system as keyof typeof EDUCATION_SYSTEMS];
    if (!system) return [];

    // Handle null education_program by using the first available program
    let programKey = profile.education_program;
    if (!programKey || programKey === null) {
      const availablePrograms = Object.keys(system.programs);
      programKey = availablePrograms[0];
    }

    const program = system.programs[programKey as keyof typeof system.programs];
    if (!program || !('grading' in program)) return [];

    const grading = program.grading;
    if ('scale' in grading && Array.isArray(grading.scale)) {
      return grading.scale.map(String);
    } else if ('letterGrades' in grading && Array.isArray(grading.letterGrades)) {
      return grading.letterGrades.map((g: any) => g.letter);
    }

    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold">Subjects</h1>
            <p className="text-muted-foreground mt-2">Manage your academic subjects</p>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 text-muted-foreground"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-heading font-semibold">No subjects yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Get started by adding your first subject
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} className="mt-4">
              + Add Subject
            </Button>
          </CardContent>
        </Card>

        {/* Add Subject Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Subject</DialogTitle>
              <DialogDescription>
                Select a subject from your curriculum to track your studies
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Subject*</Label>
                <Select
                  value={addForm.name}
                  onValueChange={(value) => {
                    const subject = getAvailableSubjects().find(s => s.name === value);
                    setAddForm({
                      ...addForm,
                      name: value,
                      category: subject?.category || ''
                    });
                  }}
                >
                  <SelectTrigger id="add-name">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSubjects().map((subject) => (
                      <SelectItem key={subject.name} value={subject.name}>
                        {subject.name}
                        {subject.category && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({subject.category})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {getAvailableLevels().length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="add-level">Level</Label>
                  <Select
                    value={addForm.level || ''}
                    onValueChange={(value) => setAddForm({ ...addForm, level: value })}
                  >
                    <SelectTrigger id="add-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableLevels().map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-current-grade">Current Grade</Label>
                  <Select
                    value={addForm.current_grade || ''}
                    onValueChange={(value) => setAddForm({ ...addForm, current_grade: value })}
                  >
                    <SelectTrigger id="add-current-grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableGrades().map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-target-grade">Target Grade</Label>
                  <Select
                    value={addForm.target_grade || ''}
                    onValueChange={(value) => setAddForm({ ...addForm, target_grade: value })}
                  >
                    <SelectTrigger id="add-target-grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableGrades().map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-9 gap-2">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, color })}
                      className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                        addForm.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSubject} disabled={!addForm.name}>
                Add Subject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold">Subjects</h1>
          <p className="text-muted-foreground mt-2">Manage and track your academic subjects</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
          </Badge>
          <Button onClick={() => setShowAddDialog(true)}>
            + Add Subject
          </Button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Card
            key={subject.id}
            className="border-border bg-card hover:bg-accent/50 transition-all cursor-pointer group"
            style={{ borderLeftWidth: '4px', borderLeftColor: subject.color || '#6366f1' }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="font-heading text-xl group-hover:text-primary transition-colors">
                    {subject.name}
                  </CardTitle>
                  {subject.level && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {subject.level}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(subject);
                    }}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(subject.id);
                    }}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent onClick={() => handleSubjectClick(subject)}>
              <div className="space-y-3">
                {subject.category && (
                  <p className="text-sm text-muted-foreground">{subject.category}</p>
                )}

                {(subject.current_grade || subject.target_grade) && (
                  <div className="flex items-center gap-2 text-sm">
                    {subject.current_grade && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Current:</span>
                        <Badge variant="secondary">{subject.current_grade}</Badge>
                      </div>
                    )}
                    {subject.current_grade && subject.target_grade && (
                      <span className="text-muted-foreground">→</span>
                    )}
                    {subject.target_grade && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Target:</span>
                        <Badge style={{ backgroundColor: subject.color || '#6366f1', color: 'white' }}>
                          {subject.target_grade}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  View Details
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 ml-2"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New Subject</DialogTitle>
            <DialogDescription>
              Select a subject from your curriculum to track your studies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Subject*</Label>
              <Select
                value={addForm.name}
                onValueChange={(value) => {
                  const subject = getAvailableSubjects().find(s => s.name === value);
                  setAddForm({
                    ...addForm,
                    name: value,
                    category: subject?.category || ''
                  });
                }}
              >
                <SelectTrigger id="add-name">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableSubjects().map((subject) => (
                    <SelectItem key={subject.name} value={subject.name}>
                      {subject.name}
                      {subject.category && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({subject.category})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getAvailableLevels().length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="add-level">Level</Label>
                <Select
                  value={addForm.level || ''}
                  onValueChange={(value) => setAddForm({ ...addForm, level: value })}
                >
                  <SelectTrigger id="add-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableLevels().map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-current-grade">Current Grade</Label>
                <Select
                  value={addForm.current_grade || ''}
                  onValueChange={(value) => setAddForm({ ...addForm, current_grade: value })}
                >
                  <SelectTrigger id="add-current-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGrades().map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-target-grade">Target Grade</Label>
                <Select
                  value={addForm.target_grade || ''}
                  onValueChange={(value) => setAddForm({ ...addForm, target_grade: value })}
                >
                  <SelectTrigger id="add-target-grade">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableGrades().map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-9 gap-2">
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAddForm({ ...addForm, color })}
                    className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                      addForm.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubject} disabled={!addForm.name}>
              Add Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editSubject} onOpenChange={() => setEditSubject(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Subject</DialogTitle>
            <DialogDescription>
              Update the details for this subject
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Subject Name*</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g., Mathematics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-level">Level</Label>
              <Input
                id="edit-level"
                value={editForm.level || ''}
                onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                placeholder="e.g., HL, SL, AP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={editForm.category || ''}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="e.g., Sciences, Languages"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-current-grade">Current Grade</Label>
                <Input
                  id="edit-current-grade"
                  value={editForm.current_grade || ''}
                  onChange={(e) => setEditForm({ ...editForm, current_grade: e.target.value })}
                  placeholder="e.g., 6"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-target-grade">Target Grade</Label>
                <Input
                  id="edit-target-grade"
                  value={editForm.target_grade || ''}
                  onChange={(e) => setEditForm({ ...editForm, target_grade: e.target.value })}
                  placeholder="e.g., 7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-9 gap-2">
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, color })}
                    className={`w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                      editForm.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditSubject(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.name}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subject Detail View Dialog */}
      <Dialog open={!!selectedSubject} onOpenChange={closeDetailView}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-heading">
                  {selectedSubject?.name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-2">
                  {selectedSubject?.level && (
                    <Badge variant="outline">{selectedSubject.level}</Badge>
                  )}
                  {selectedSubject?.category && (
                    <span className="text-sm">{selectedSubject.category}</span>
                  )}
                </DialogDescription>
              </div>
              {selectedSubject && (
                <div
                  className="w-12 h-12 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: selectedSubject.color || '#6366f1' }}
                />
              )}
            </div>
          </DialogHeader>

          {statsLoading ? (
            <div className="py-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading statistics...</p>
            </div>
          ) : subjectStats ? (
            <div className="space-y-6 py-4">
              {/* Grade Progress */}
              {(subjectStats.current_grade || subjectStats.target_grade) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Grade Progress</h3>
                  <div className="flex items-center gap-4">
                    {subjectStats.current_grade && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Current:</span>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {subjectStats.current_grade}
                        </Badge>
                      </div>
                    )}
                    {subjectStats.current_grade && subjectStats.target_grade && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    )}
                    {subjectStats.target_grade && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Target:</span>
                        <Badge
                          className="text-lg px-3 py-1"
                          style={{
                            backgroundColor: subjectStats.subject_color || '#6366f1',
                            color: 'white'
                          }}
                        >
                          {subjectStats.target_grade}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Study Hours */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{subjectStats.total_study_hours}h</div>
                    <p className="text-xs text-muted-foreground mt-1">All time</p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{subjectStats.study_hours_this_week}h</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{subjectStats.study_hours_this_month}h</div>
                    <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Tasks */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Task Statistics</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{subjectStats.completed_tasks} / {subjectStats.total_tasks}</span>
                    </div>
                    <Progress
                      value={subjectStats.completion_rate}
                      className="h-2"
                      style={{
                        // @ts-ignore
                        '--progress-background': subjectStats.subject_color || '#6366f1'
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {subjectStats.completion_rate}% completion rate
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-medium">{subjectStats.pending_tasks}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${(subjectStats.pending_tasks / subjectStats.total_tasks) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {subjectStats.total_tasks > 0 ? Math.round((subjectStats.pending_tasks / subjectStats.total_tasks) * 100) : 0}% of total
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Study Sessions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold mt-1">{subjectStats.total_sessions}</p>
                </div>

                {subjectStats.average_focus_rating && (
                  <div>
                    <p className="text-sm text-muted-foreground">Average Focus</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-2xl font-bold">{subjectStats.average_focus_rating}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={star <= subjectStats.average_focus_rating! ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-yellow-500"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => selectedSubject && handleEditClick(selectedSubject)}>
              Edit Subject
            </Button>
            <Button onClick={closeDetailView}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
