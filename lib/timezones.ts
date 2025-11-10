/**
 * Comprehensive list of all UTC timezones
 * Used across the application for consistent timezone selection
 */

export interface Timezone {
  value: string;
  label: string;
  offset: string;
}

export const TIMEZONES: Timezone[] = [
  { value: 'UTC-12:00', label: '(UTC-12:00) International Date Line West', offset: '-12:00' },
  { value: 'UTC-11:00', label: '(UTC-11:00) Coordinated Universal Time-11', offset: '-11:00' },
  { value: 'UTC-10:00', label: '(UTC-10:00) Hawaii', offset: '-10:00' },
  { value: 'UTC-09:30', label: '(UTC-09:30) Marquesas Islands', offset: '-09:30' },
  { value: 'UTC-09:00', label: '(UTC-09:00) Alaska', offset: '-09:00' },
  { value: 'UTC-08:00', label: '(UTC-08:00) Pacific Time (US & Canada)', offset: '-08:00' },
  { value: 'UTC-07:00', label: '(UTC-07:00) Mountain Time (US & Canada)', offset: '-07:00' },
  { value: 'UTC-06:00', label: '(UTC-06:00) Central Time (US & Canada)', offset: '-06:00' },
  { value: 'UTC-05:00', label: '(UTC-05:00) Eastern Time (US & Canada)', offset: '-05:00' },
  { value: 'UTC-04:00', label: '(UTC-04:00) Atlantic Time (Canada)', offset: '-04:00' },
  { value: 'UTC-03:30', label: '(UTC-03:30) Newfoundland', offset: '-03:30' },
  { value: 'UTC-03:00', label: '(UTC-03:00) Buenos Aires, Brasilia', offset: '-03:00' },
  { value: 'UTC-02:00', label: '(UTC-02:00) Mid-Atlantic', offset: '-02:00' },
  { value: 'UTC-01:00', label: '(UTC-01:00) Azores', offset: '-01:00' },
  { value: 'UTC+00:00', label: '(UTC+00:00) London, Dublin, Lisbon', offset: '+00:00' },
  { value: 'UTC+01:00', label: '(UTC+01:00) Paris, Berlin, Rome', offset: '+01:00' },
  { value: 'UTC+02:00', label: '(UTC+02:00) Cairo, Athens, Helsinki', offset: '+02:00' },
  { value: 'UTC+03:00', label: '(UTC+03:00) Moscow, Istanbul, Riyadh', offset: '+03:00' },
  { value: 'UTC+03:30', label: '(UTC+03:30) Tehran', offset: '+03:30' },
  { value: 'UTC+04:00', label: '(UTC+04:00) Dubai, Abu Dhabi, Muscat', offset: '+04:00' },
  { value: 'UTC+04:30', label: '(UTC+04:30) Kabul', offset: '+04:30' },
  { value: 'UTC+05:00', label: '(UTC+05:00) Islamabad, Karachi, Tashkent', offset: '+05:00' },
  { value: 'UTC+05:30', label: '(UTC+05:30) Mumbai, Delhi, Colombo', offset: '+05:30' },
  { value: 'UTC+05:45', label: '(UTC+05:45) Kathmandu', offset: '+05:45' },
  { value: 'UTC+06:00', label: '(UTC+06:00) Dhaka, Almaty', offset: '+06:00' },
  { value: 'UTC+06:30', label: '(UTC+06:30) Yangon (Rangoon)', offset: '+06:30' },
  { value: 'UTC+07:00', label: '(UTC+07:00) Bangkok, Hanoi, Jakarta', offset: '+07:00' },
  { value: 'UTC+08:00', label: '(UTC+08:00) Singapore, Hong Kong, Beijing', offset: '+08:00' },
  { value: 'UTC+08:45', label: '(UTC+08:45) Eucla', offset: '+08:45' },
  { value: 'UTC+09:00', label: '(UTC+09:00) Tokyo, Seoul, Osaka', offset: '+09:00' },
  { value: 'UTC+09:30', label: '(UTC+09:30) Adelaide, Darwin', offset: '+09:30' },
  { value: 'UTC+10:00', label: '(UTC+10:00) Sydney, Melbourne, Brisbane', offset: '+10:00' },
  { value: 'UTC+10:30', label: '(UTC+10:30) Lord Howe Island', offset: '+10:30' },
  { value: 'UTC+11:00', label: '(UTC+11:00) Solomon Islands, New Caledonia', offset: '+11:00' },
  { value: 'UTC+12:00', label: '(UTC+12:00) Fiji, Auckland, Wellington', offset: '+12:00' },
  { value: 'UTC+12:45', label: '(UTC+12:45) Chatham Islands', offset: '+12:45' },
  { value: 'UTC+13:00', label: '(UTC+13:00) Nuku\'alofa, Samoa', offset: '+13:00' },
  { value: 'UTC+14:00', label: '(UTC+14:00) Kiritimati', offset: '+14:00' },
];

/**
 * Get timezone label by value
 */
export function getTimezoneLabel(value: string): string {
  const timezone = TIMEZONES.find(tz => tz.value === value);
  return timezone ? timezone.label : value;
}

/**
 * Detect browser timezone and map to closest UTC offset
 */
export function detectBrowserTimezone(): string {
  try {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';

    const offsetString = `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Find exact match or closest match
    const exactMatch = TIMEZONES.find(tz => tz.value === offsetString);
    if (exactMatch) {
      return exactMatch.value;
    }

    // Default to UTC+00:00 if no match found
    return 'UTC+00:00';
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'UTC+00:00';
  }
}
