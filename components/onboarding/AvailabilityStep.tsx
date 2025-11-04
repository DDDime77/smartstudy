'use client';

import { useState, useEffect } from 'react';

interface TimeSlot {
  start: string; // "14:00"
  end: string;   // "16:00"
}

interface DayAvailability {
  day: number; // 0-6 (Monday=0, Sunday=6)
  slots: TimeSlot[];
}

interface AvailabilityStepProps {
  value: DayAvailability[];
  onChange: (availability: DayAvailability[]) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Time slots: 2-hour blocks from 6am to 10pm
const TIME_SLOTS = [
  { start: '06:00', end: '08:00', label: '6-8 AM' },
  { start: '08:00', end: '10:00', label: '8-10 AM' },
  { start: '10:00', end: '12:00', label: '10-12 PM' },
  { start: '12:00', end: '14:00', label: '12-2 PM' },
  { start: '14:00', end: '16:00', label: '2-4 PM' },
  { start: '16:00', end: '18:00', label: '4-6 PM' },
  { start: '18:00', end: '20:00', label: '6-8 PM' },
  { start: '20:00', end: '22:00', label: '8-10 PM' },
];

export default function AvailabilityStep({ value, onChange }: AvailabilityStepProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>(value);

  useEffect(() => {
    onChange(availability);
  }, [availability]);

  const isSlotSelected = (day: number, slot: TimeSlot): boolean => {
    const dayAvail = availability.find((a) => a.day === day);
    if (!dayAvail) return false;
    return dayAvail.slots.some((s) => s.start === slot.start && s.end === slot.end);
  };

  const toggleSlot = (day: number, slot: TimeSlot) => {
    const dayAvail = availability.find((a) => a.day === day);

    if (!dayAvail) {
      // Add new day with this slot
      setAvailability([...availability, { day, slots: [slot] }]);
    } else {
      const slotExists = dayAvail.slots.some((s) => s.start === slot.start && s.end === slot.end);

      if (slotExists) {
        // Remove slot
        const updatedSlots = dayAvail.slots.filter(
          (s) => !(s.start === slot.start && s.end === slot.end)
        );

        if (updatedSlots.length === 0) {
          // Remove day entirely if no slots left
          setAvailability(availability.filter((a) => a.day !== day));
        } else {
          // Update day with remaining slots
          setAvailability(
            availability.map((a) => (a.day === day ? { ...a, slots: updatedSlots } : a))
          );
        }
      } else {
        // Add slot to existing day
        setAvailability(
          availability.map((a) => (a.day === day ? { ...a, slots: [...a.slots, slot] } : a))
        );
      }
    }
  };

  const applyPreset = (presetName: string) => {
    let newAvailability: DayAvailability[] = [];

    switch (presetName) {
      case 'weekday_afternoons':
        // Mon-Fri, 2-6 PM
        newAvailability = [0, 1, 2, 3, 4].map((day) => ({
          day,
          slots: [
            { start: '14:00', end: '16:00' },
            { start: '16:00', end: '18:00' },
          ],
        }));
        break;

      case 'evenings':
        // All days, 6-10 PM
        newAvailability = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          day,
          slots: [
            { start: '18:00', end: '20:00' },
            { start: '20:00', end: '22:00' },
          ],
        }));
        break;

      case 'weekends':
        // Sat-Sun, 8 AM - 6 PM
        newAvailability = [5, 6].map((day) => ({
          day,
          slots: [
            { start: '08:00', end: '10:00' },
            { start: '10:00', end: '12:00' },
            { start: '12:00', end: '14:00' },
            { start: '14:00', end: '16:00' },
            { start: '16:00', end: '18:00' },
          ],
        }));
        break;

      case 'clear':
        newAvailability = [];
        break;
    }

    setAvailability(newAvailability);
  };

  const calculateTotalHours = (): number => {
    let totalHours = 0;
    availability.forEach((day) => {
      totalHours += day.slots.length * 2; // Each slot is 2 hours
    });
    return totalHours;
  };

  const totalHours = calculateTotalHours();

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="text-xl font-semibold text-white mb-2">Set Your Study Availability</h3>
        <p className="text-slate-400 text-sm">
          Select the times when you're available to study each week
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">Quick Presets</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'weekday_afternoons', label: 'Weekday Afternoons', icon: '🌅' },
            { id: 'evenings', label: 'Evenings', icon: '🌙' },
            { id: 'weekends', label: 'Weekends', icon: '🎉' },
            { id: 'clear', label: 'Clear All', icon: '🗑️' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="p-3 rounded-lg glass-effect border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] group"
            >
              <div className="text-2xl mb-1">{preset.icon}</div>
              <div className="text-xs text-white/70 group-hover:text-white transition-colors">
                {preset.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Calendar */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-300">
          Weekly Schedule
        </label>

        {/* Weekdays */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((day) => (
            <div key={day} className="space-y-2">
              <div className="text-center text-sm font-semibold text-white mb-2">
                {DAY_ABBR[day]}
              </div>
              <div className="space-y-1">
                {TIME_SLOTS.map((slot) => {
                  const selected = isSlotSelected(day, slot);
                  return (
                    <button
                      key={`${day}-${slot.start}`}
                      onClick={() => toggleSlot(day, slot)}
                      className={`
                        w-full px-2 py-2 rounded-lg text-xs transition-all duration-300
                        border group relative overflow-hidden
                        ${
                          selected
                            ? 'border-white/30 bg-white/10 text-white scale-[1.02]'
                            : 'border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:bg-white/5'
                        }
                      `}
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative z-10 flex items-center justify-between">
                        <span>{slot.label}</span>
                        {selected && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Weekends */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
          {[5, 6].map((day) => (
            <div key={day} className="space-y-2">
              <div className="text-center text-sm font-semibold text-white mb-2">
                {DAY_ABBR[day]}
              </div>
              <div className="space-y-1">
                {TIME_SLOTS.map((slot) => {
                  const selected = isSlotSelected(day, slot);
                  return (
                    <button
                      key={`${day}-${slot.start}`}
                      onClick={() => toggleSlot(day, slot)}
                      className={`
                        w-full px-2 py-2 rounded-lg text-xs transition-all duration-300
                        border group relative overflow-hidden
                        ${
                          selected
                            ? 'border-white/30 bg-white/10 text-white scale-[1.02]'
                            : 'border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:bg-white/5'
                        }
                      `}
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative z-10 flex items-center justify-between">
                        <span>{slot.label}</span>
                        {selected && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {totalHours > 0 && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-medium">Total Weekly Study Time</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {totalHours} hours available per week
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold">{totalHours}h</div>
        </div>
      )}

      {totalHours < 5 && totalHours > 0 && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium">Consider Adding More Time</div>
            <div className="text-xs text-yellow-300 mt-1">
              We recommend at least 5-10 hours per week for effective study planning
            </div>
          </div>
        </div>
      )}

      {totalHours === 0 && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium text-white">No times selected yet</div>
            <div className="text-xs mt-1">
              Click on time slots above or use a quick preset to get started
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
