import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  subValueColor?: string;
  icon: React.ReactNode;
  colorClass?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subValue, 
  subValueColor = "text-slate-500",
  icon,
  colorClass = "bg-blue-50"
}) => {
  return (
    <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 transition-all hover:shadow-md h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${colorClass}`}>
          {icon}
        </div>
      </div>
      
      {subValue && (
        <div className="mt-1 pt-3 border-t border-slate-50">
          <p className={`text-xs font-medium ${subValueColor}`}>
            {subValue}
          </p>
        </div>
      )}
    </div>
  );
};