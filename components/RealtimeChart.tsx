import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

interface RealtimeChartProps {
  data: ChartDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[200px]">
        <p className="text-sm font-bold text-slate-800 mb-3">2025-12-16 {label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            let label = "";
            let colorClass = "";
            if (entry.name === "spend") { label = "Chi tiêu"; colorClass = "text-blue-600"; }
            if (entry.name === "messages") { label = "Tin nhắn (Mess)"; colorClass = "text-purple-600"; }
            if (entry.name === "leads") { label = "Lượt mua (Data)"; colorClass = "text-green-600"; }

            return (
              <div key={index} className="flex flex-col">
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-xs font-semibold ${colorClass}`}>{label}:</span>
                  <span className={`text-sm font-bold ${colorClass}`}>
                     {entry.name === 'spend' ? entry.value.toLocaleString() + ' đ' : entry.value}
                  </span>
                </div>
                {/* Cost per calculation simulation for tooltip */}
                {entry.name !== 'spend' && entry.value > 0 && (
                   <div className="flex justify-between pl-2 border-l-2 border-slate-100 ml-1 mt-1">
                      <span className="text-[10px] text-slate-400">Chi phí/{entry.name === 'messages' ? 'Mess' : 'Data'}:</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {(payload.find((p:any) => p.name === 'spend').value / entry.value).toLocaleString('vi-VN', {maximumFractionDigits: 0})} đ
                      </span>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const RealtimeChart: React.FC<RealtimeChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.05}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="time" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          dy={10}
        />
        <YAxis 
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Spend Area (Blue) */}
        <Area 
          yAxisId="left"
          type="monotone" 
          dataKey="spend" 
          stroke="#3b82f6" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorSpend)" 
        />
        
        {/* Messages Bar simulation using Area (Purple) */}
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="messages"
          stroke="#a855f7"
          strokeWidth={2}
          fill="transparent"
        />

        {/* Leads Line (Green) */}
        <Area 
          yAxisId="right"
          type="monotone" 
          dataKey="leads" 
          stroke="#10b981" 
          strokeWidth={2}
          fill="transparent"
        />

        {/* Custom Legend at bottom handled by parent or custom legend component if needed, 
            but for now using the chart built-in styling to be minimal */}
        <text x="50%" y="380" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-slate-400">
           --o-- Chi tiêu   --■-- Tin nhắn (Mess)   --♦-- Lượt mua (Data)
        </text>

      </AreaChart>
    </ResponsiveContainer>
  );
};