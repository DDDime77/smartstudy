'use client';

import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import GradientText from '@/components/GradientText';
import { ExamResponse } from '@/lib/api/exams';
import { SubjectResponse, ProfileResponse } from '@/lib/api/onboarding';
import { BusySlot } from '@/lib/api/schedule';
import { Calendar, Clock, Target, TrendingUp, Zap, Loader2, CheckCircle } from 'lucide-react';

interface ExamPrepSchedulerProps {
  exam: ExamResponse;
  subject: SubjectResponse | undefined;
  profile: ProfileResponse | null;
  busySlots: BusySlot[];
  onClose: () => void;
  onComplete: () => void;
}

interface CalculationResult {
  daysUntil: number;
  totalAvailableHours: number;
  estimatedHoursNeeded: number;
  recommendedSessions: number;
  hoursPerSession: number;
}

export default function ExamPrepScheduler({
  exam,
  subject,
  profile,
  busySlots,
  onClose,
  onComplete,
}: ExamPrepSchedulerProps) {
  const [step, setStep] = useState<'calculate' | 'preview' | 'generating' | 'complete'>('calculate');
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [generationProgress, setGenerationProgress] = useState('');
  const [error, setError] = useState('');
  const [streamedContent, setStreamedContent] = useState('');

  useEffect(() => {
    calculateSchedule();
  }, []);

  const calculateSchedule = async () => {
    try {
      // Calculate days until exam
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const examDate = new Date(exam.exam_date);
      examDate.setHours(0, 0, 0, 0);
      const diffTime = examDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        setError('Cannot schedule for past exams');
        return;
      }

      // Calculate available hours per day from busy schedule
      const calculateDailyAvailableHours = () => {
        // Assume 16 waking hours per day (6 AM - 10 PM)
        const wakingHours = 16;

        // Calculate average busy hours per day
        let totalBusyHours = 0;
        const recurringSlots = busySlots.filter(slot => slot.recurring);

        recurringSlots.forEach(slot => {
          const [startHour, startMin] = slot.start_time.split(':').map(Number);
          const [endHour, endMin] = slot.end_time.split(':').map(Number);
          const duration = (endHour + endMin / 60) - (startHour + startMin / 60);
          totalBusyHours += duration;
        });

        // Average across all 7 days (recurring slots)
        const avgBusyHoursPerDay = recurringSlots.length > 0 ? totalBusyHours / 7 : 0;
        const availableHoursPerDay = Math.max(wakingHours - avgBusyHoursPerDay, 2); // Minimum 2 hours

        return availableHoursPerDay;
      };

      const dailyAvailableHours = calculateDailyAvailableHours();
      const totalAvailableHours = dailyAvailableHours * daysUntil;

      const units = exam.units || [];
      const cleanUnits = units.filter(u => u && u.trim());

      // Get AI-based estimation with fallback to rule-based
      let estimatedHoursNeeded = 0;
      let usedAI = false;

      try {
        // Call AI estimation API with profile data
        const estimationRes = await fetch('/api/estimate-study-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: subject?.name || 'Unknown',
            paperType: exam.exam_type,
            units: cleanUnits,
            daysUntilExam: daysUntil,
            availableHours: totalAvailableHours,
            gradeLevel: profile?.grade_level || '12',
            educationSystem: profile?.education_system || 'IB',
            educationProgram: profile?.education_program || 'IB Diploma Programme',
          }),
        });

        if (estimationRes.ok) {
          const aiResult = await estimationRes.json();
          estimatedHoursNeeded = aiResult.estimatedHours;
          usedAI = true;
          console.log('✅ Using AI estimation:', estimatedHoursNeeded, 'hours');
        } else {
          throw new Error('AI estimation failed');
        }
      } catch (aiError) {
        console.warn('AI estimation failed, falling back to rule-based:', aiError);

        // Fallback to rule-based estimation
        const unitCount = cleanUnits.length;
        let hoursPerUnit = 8;

        // Adjust based on exam type
        if (exam.exam_type.includes('Paper 1')) hoursPerUnit = 6;
        if (exam.exam_type.includes('Paper 2')) hoursPerUnit = 8;
        if (exam.exam_type.includes('Paper 3')) hoursPerUnit = 10;
        if (exam.exam_type.includes('IA') || exam.exam_type.includes('Internal Assessment')) hoursPerUnit = 15;
        if (exam.exam_type.includes('Extended Essay')) hoursPerUnit = 20;

        estimatedHoursNeeded = Math.max(unitCount * hoursPerUnit, 4);
        console.log('📊 Using rule-based estimation:', estimatedHoursNeeded, 'hours');
      }

      // Calculate recommended sessions based on days until exam
      let recommendedSessions = 0;
      if (daysUntil <= 7) {
        recommendedSessions = Math.min(Math.floor(daysUntil * 0.7), 5);
      } else if (daysUntil <= 14) {
        recommendedSessions = Math.min(Math.floor(daysUntil * 0.4), 8);
      } else if (daysUntil <= 30) {
        recommendedSessions = Math.min(Math.floor(daysUntil * 0.25), 12);
      } else {
        recommendedSessions = Math.min(Math.floor(daysUntil * 0.15), 20);
      }

      recommendedSessions = Math.max(recommendedSessions, Math.min(cleanUnits.length, 3));

      const hoursPerSession = estimatedHoursNeeded / recommendedSessions;

      setCalculation({
        daysUntil,
        totalAvailableHours,
        estimatedHoursNeeded,
        recommendedSessions,
        hoursPerSession,
      });

      setStep('preview');
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Failed to calculate schedule');
    }
  };

  const generateSchedule = async () => {
    if (!calculation) return;

    setStep('generating');
    setGenerationProgress('Connecting to AI scheduler...');
    setStreamedContent('');

    try {
      const units = exam.units?.filter(u => u && u.trim()) || [];

      const response = await fetch('/api/exam-prep-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: exam.id,
          subject_id: exam.subject_id,
          subject_name: subject?.name,
          exam_type: exam.exam_type,
          exam_date: exam.exam_date,
          units,
          calculation,
          busy_slots: busySlots,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('__TOOL_CALL_START__')) {
            setGenerationProgress('Creating study tasks...');
          } else if (line.startsWith('__TOOL_DATA__:')) {
            const data = JSON.parse(line.substring('__TOOL_DATA__:'.length));
            if (data.topic) {
              setGenerationProgress(`Scheduling: ${data.topic}`);
            }
          } else if (line.startsWith('__TOOL_CALL_END__')) {
            // Tool call completed
          } else if (line.trim()) {
            // Regular AI response content
            setStreamedContent(prev => prev + line);
          }
        }
      }

      setStep('complete');
    } catch (err) {
      console.error('Generation error:', err);
      setError('Failed to generate schedule. Please try again.');
      setStep('preview');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <GlassCard className="max-w-lg w-full">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Error</h3>
            <p className="text-white/60 mb-6">{error}</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (step === 'calculate' || !calculation) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <GlassCard className="max-w-lg w-full">
          <div className="p-6 text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Schedule</h3>
            <p className="text-white/60">Calculating optimal study plan...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (step === 'preview') {
    const units = exam.units?.filter(u => u && u.trim()) || [];
    const utilizationPercentage = (calculation.estimatedHoursNeeded / calculation.totalAvailableHours) * 100;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <GlassCard className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <GradientText gradient="from-blue-400 to-purple-400">
                <h2 className="text-3xl font-bold mb-2">Exam Preparation Schedule</h2>
              </GradientText>
              <p className="text-white/60">
                {subject?.name} - {exam.exam_type}
              </p>
              <p className="text-white/40 text-sm mt-1">
                Exam Date: {new Date(exam.exam_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <p className="text-white/60 text-sm">Days Until Exam</p>
                </div>
                <p className="text-3xl font-bold text-white">
                  {calculation.daysUntil}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <p className="text-white/60 text-sm">Available Hours</p>
                </div>
                <p className="text-3xl font-bold text-white">
                  {Math.round(calculation.totalAvailableHours)}h
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <p className="text-white/60 text-sm">Estimated Hours Needed</p>
                </div>
                <p className="text-3xl font-bold text-white">
                  {Math.round(calculation.estimatedHoursNeeded)}h
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <p className="text-white/60 text-sm">Study Sessions</p>
                </div>
                <p className="text-3xl font-bold text-white">
                  {calculation.recommendedSessions}
                </p>
              </div>
            </div>

            {/* Utilization Warning */}
            {utilizationPercentage > 80 && (
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-medium mb-1">High Time Commitment</p>
                    <p className="text-white/60 text-sm">
                      This exam will require {Math.round(utilizationPercentage)}% of your available study time.
                      Consider starting early and staying focused!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Units to Cover */}
            {units.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Units to Cover</h4>
                <div className="grid grid-cols-1 gap-2">
                  {units.map((unit, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: subject?.color || '#6366f1' }}
                      />
                      <p className="text-white">{unit}</p>
                      <Badge variant="default" className="ml-auto text-xs">
                        ~{Math.round(calculation.estimatedHoursNeeded / units.length)}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Details */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
              <h4 className="text-white font-medium mb-2">Study Plan Overview</h4>
              <p className="text-white/80 text-sm">
                AI will create <strong>{calculation.recommendedSessions} study sessions</strong>,
                averaging <strong>{Math.round(calculation.hoursPerSession * 60)} minutes</strong> each,
                distributed across the next <strong>{calculation.daysUntil} days</strong>.
              </p>
              <p className="text-white/60 text-sm mt-2">
                Sessions will be scheduled around your busy hours and optimized for effective learning.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={generateSchedule} className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Generate Study Plan
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="text-center mb-6">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <GradientText gradient="from-blue-400 to-purple-400">
                <h3 className="text-2xl font-bold mb-2">Generating Study Plan</h3>
              </GradientText>
              <p className="text-white/60 text-sm">{generationProgress}</p>
            </div>

            {streamedContent && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white/80 text-sm whitespace-pre-wrap">{streamedContent}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <GlassCard className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <GradientText gradient="from-green-400 to-emerald-400">
                <h3 className="text-3xl font-bold mb-2">Study Plan Created!</h3>
              </GradientText>
              <p className="text-white/60">
                Your exam preparation schedule has been generated and tasks have been added to your calendar.
              </p>
            </div>

            {streamedContent && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-6">
                <h4 className="text-white font-medium mb-3">Plan Summary</h4>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{streamedContent}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="flex-1"
              >
                View Tasks
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return null;
}
