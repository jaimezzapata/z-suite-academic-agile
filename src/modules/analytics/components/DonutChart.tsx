import React from "react";

interface DonutChartProps {
  studentsAnalytics: {
    studentId: string;
    name: string;
    participation: number;
  }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ studentsAnalytics }) => {
  const colors = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171"];
  const studentsWithPart = studentsAnalytics.filter((s) => s.participation > 0);

  if (studentsWithPart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-xs text-gray-500 italic">
        Sin tareas completadas aún para generar el gráfico.
      </div>
    );
  }

  let accumulatedAngle = 0;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-4">
      {/* SVG Donut */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="16" />
          {studentsWithPart.map((student, i) => {
            const strokeDasharray = `${(student.participation / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle;
            accumulatedAngle += (student.participation / 100) * circumference;
            const color = colors[i % colors.length];

            return (
              <circle
                key={student.studentId}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="16"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-white">Participación</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-wider">Porcentaje</span>
        </div>
      </div>

      {/* Leyenda */}
      <div className="space-y-2 flex-1 max-w-[200px]">
        {studentsWithPart.map((student, i) => (
          <div key={student.studentId} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
              <span className="text-gray-300 truncate max-w-[120px]" title={student.name}>
                {student.name}
              </span>
            </div>
            <span className="font-bold text-white">{student.participation}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
