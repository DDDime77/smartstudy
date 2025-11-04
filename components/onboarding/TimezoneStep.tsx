'use client';

import { useState, useMemo } from 'react';
import { TIMEZONES } from '@/lib/education-config';

interface TimezoneStepProps {
  value: string;
  onChange: (timezone: string) => void;
}

export default function TimezoneStep({ value, onChange }: TimezoneStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredTimezones = useMemo(() => {
    if (!searchQuery) return TIMEZONES;
    return TIMEZONES.filter(tz =>
      tz.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleSelect = (timezone: string) => {
    onChange(timezone);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🌍</div>
        <h3 className="text-xl font-semibold text-white mb-2">Select Your Timezone</h3>
        <p className="text-slate-400 text-sm">
          This helps us schedule your study sessions at the right times
        </p>
      </div>

      <div className="relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for your timezone..."
            value={value || searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white-500/50 focus:border-white-500/50 transition-all"
          />
          <svg
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 max-h-64 overflow-y-auto rounded-lg bg-black backdrop-blur-xl border border-white/10 shadow-2xl">
              {filteredTimezones.length > 0 ? (
                <ul className="py-2">
                  {filteredTimezones.map((timezone) => (
                    <li key={timezone}>
                      <button
                        onClick={() => handleSelect(timezone)}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10 ${
                          value === timezone
                            ? 'bg-white-500/20 text-white-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {timezone}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                  No timezones found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {value && (
        <div className="p-4 rounded-lg bg-white-500/10 border border-white-500/20 text-white-400 text-sm flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">Timezone Selected</div>
            <div className="text-xs mt-1 text-white-300">{value}</div>
          </div>
        </div>
      )}
    </div>
  );
}
