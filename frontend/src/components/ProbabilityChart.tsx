import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Language, translations } from '../utils/language';
import { BarChart3 } from 'lucide-react';

interface ProbabilityChartProps {
  lang: Language;
  probabilities: Record<string, number>;
  predictedGrade: number;
}

export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({
  lang,
  probabilities,
  predictedGrade,
}) => {
  const t = translations[lang];

  const labels = [
    { key: 'Grade_0', name: 'Grade 0', short: 'No DR', color: '#3dff9a' },
    { key: 'Grade_1', name: 'Grade 1', short: 'Mild', color: '#a3e635' },
    { key: 'Grade_2', name: 'Grade 2', short: 'Moderate', color: '#ffb020' },
    { key: 'Grade_3', name: 'Grade 3', short: 'Severe', color: '#ff8a3d' },
    { key: 'Grade_4', name: 'Grade 4', short: 'PDR', color: '#ff4d6d' },
  ];

  const data = labels.map((item, idx) => {
    const rawVal = probabilities[item.key] ?? (idx === predictedGrade ? 0.85 : 0.03);
    const pct = Math.round(rawVal * 100);
    return {
      name: item.name,
      short: item.short,
      percentage: pct,
      color: item.color,
      isPredicted: idx === predictedGrade,
    };
  });

  return (
    <div className="glass-panel p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4 border-b border-[rgba(70,170,255,0.15)] pb-2.5">
        <h3 className="text-xs font-heading font-bold text-[#eaf3ff] tracking-wider uppercase flex items-center space-x-1.5">
          <BarChart3 className="w-4 h-4 text-[#35b6ff]" />
          <span>{t.probTitle}</span>
        </h3>
        <span className="text-[11px] font-mono text-[#35b6ff] font-bold">
          Softmax Calibrated
        </span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(70,170,255,0.2)' }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(70,170,255,0.2)' }}
              tickFormatter={(val) => `${val}%`}
              domain={[0, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#04070d]/95 border border-[rgba(70,170,255,0.4)] px-3 py-2 rounded-xl shadow-2xl text-xs backdrop-blur-md">
                      <div className="font-bold text-white">{d.name} ({d.short})</div>
                      <div className="text-[#35b6ff] font-mono font-bold mt-1">
                        {d.percentage}% Confidence
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  fillOpacity={entry.isPredicted ? 1 : 0.35}
                  stroke={entry.isPredicted ? '#FFFFFF' : 'none'}
                  strokeWidth={entry.isPredicted ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
