'use client';

interface ImportMethodStepProps {
  value: string;
  onChange: (method: string) => void;
}

export default function ImportMethodStep({ value, onChange }: ImportMethodStepProps) {
  const methods = [
    {
      id: 'manual',
      title: 'Manual Entry',
      description: 'Add your subjects manually one by one',
      icon: '✍️',
      features: ['Full control', 'Customize everything', 'Quick setup'],
    },
    {
      id: 'google_classroom',
      title: 'Google Classroom',
      description: 'Import subjects from Google Classroom',
      icon: '📱',
      features: ['Auto-import subjects', 'Quick setup', 'Requires API key'],
      disabled: false,
    },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-white mb-2">How Would You Like to Add Subjects?</h3>
        <p className="text-slate-400 text-sm">
          Choose your preferred method for adding your subjects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => !method.disabled && onChange(method.id)}
            disabled={method.disabled}
            className={`
              relative overflow-hidden rounded-2xl p-8
              glass-effect border transition-all duration-500
              hover:shadow-[0_0_50px_rgba(255,255,255,0.1)]
              text-left group
              ${method.disabled
                ? 'opacity-50 cursor-not-allowed border-white/5'
                : value === method.id
                ? 'border-white/30 scale-[1.02]'
                : 'border-white/10 hover:border-white/20 hover:scale-[1.02]'
              }
            `}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{method.icon}</div>

              {/* Title and Description */}
              <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                {method.title}
                {method.disabled && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    Soon
                  </span>
                )}
              </h4>
              <p className="text-sm text-slate-400">{method.description}</p>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {method.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                  <svg
                    className="w-4 h-4 text-white flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            </div>

            {/* Selected Indicator */}
            {value === method.id && !method.disabled && (
              <div className="absolute top-6 right-6 z-20">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        ))}
      </div>

      {value === 'google_classroom' && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-white text-sm flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">Google Classroom Selected</div>
            <div className="text-xs mt-1 text-blue-300">
              You'll need your Google Classroom API key to import subjects
            </div>
          </div>
        </div>
      )}

      {value === 'manual' && (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-white text-sm flex items-start gap-3 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium">Manual Entry Selected</div>
            <div className="text-xs mt-1 text-blue-300">
              You'll add your subjects in the next step
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
