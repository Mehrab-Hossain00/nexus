import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserProfile, Task, TaskStatus } from '../types';
import { dbService } from '../services/dbService';

interface AnalyticsProps {
    user: UserProfile;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjectData, setSubjectData] = useState<{name: string, value: number}[]>([]);
  const [priorityData, setPriorityData] = useState<{name: string, count: number}[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, completionRate: 0 });

  useEffect(() => {
    const loadData = async () => {
        const fetchedTasks = await dbService.getTasks(user.uid);
        setTasks(fetchedTasks);

        // Process Subject Data
        const subjectMap = new Map<string, number>();
        fetchedTasks.forEach(t => {
            const sub = t.subject || 'Other';
            subjectMap.set(sub, (subjectMap.get(sub) || 0) + 1);
        });
        const subjArr = Array.from(subjectMap.entries()).map(([name, value]) => ({ name, value }));
        setSubjectData(subjArr);

        // Process Priority Data (for Bar Chart)
        const priorityMap = new Map<string, number>();
        fetchedTasks.forEach(t => {
            priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1);
        });
        const prioArr = Array.from(priorityMap.entries()).map(([name, count]) => ({ name, count }));
        setPriorityData(prioArr);

        // Basic Stats
        const total = fetchedTasks.length;
        const completed = fetchedTasks.filter(t => t.status === TaskStatus.DONE).length;
        const pending = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        setStats({ total, completed, pending, completionRate });
    };
    loadData();
  }, [user.uid]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-10 animate-fade-in pb-10 pr-2">
      <header>
         <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Performance</h1>
         <p className="text-zinc-500 text-sm">Insights from your real data.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Distribution */}
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl h-96 relative group hover:border-white/10 transition-all">
           <h3 className="text-lg font-bold text-white mb-8">Tasks by Priority</h3>
           {priorityData.length > 0 ? (
               <ResponsiveContainer width="100%" height="80%">
                <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke="#52525b" 
                    tick={{fill: '#71717a', fontSize: 12}} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                />
                <YAxis 
                    stroke="#52525b" 
                    tick={{fill: '#71717a', fontSize: 12}} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
           ) : (
             <div className="h-full flex items-center justify-center text-zinc-600">No tasks found.</div>
           )}
        </div>

        {/* Subject Mix */}
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl h-96 hover:border-white/10 transition-all">
           <h3 className="text-lg font-bold text-white mb-8">Subject Distribution</h3>
           {subjectData.length > 0 ? (
               <>
                <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                    <Pie
                        data={subjectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4 max-h-12 overflow-y-auto custom-scrollbar">
                    {subjectData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            {entry.name}
                        </div>
                    ))}
                </div>
               </>
           ) : (
               <div className="h-full flex items-center justify-center text-zinc-600">No data available.</div>
           )}
        </div>
      </div>
      
      {/* Stat Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            value={stats.total} 
            label="Total Tasks Created" 
            color="text-indigo-400" 
            border="border-indigo-500/20" 
            bg="bg-indigo-500/5" 
          />
          <StatCard 
            value={stats.completed} 
            label="Tasks Completed" 
            color="text-emerald-400" 
            border="border-emerald-500/20" 
            bg="bg-emerald-500/5" 
          />
          <StatCard 
            value={`${stats.completionRate}%`} 
            label="Completion Rate" 
            color="text-purple-400" 
            border="border-purple-500/20" 
            bg="bg-purple-500/5" 
          />
      </div>
    </div>
  );
};

const StatCard = ({ value, label, color, border, bg }: any) => (
    <div className={`p-6 rounded-2xl border ${border} ${bg} backdrop-blur-sm text-center transition-transform hover:-translate-y-1`}>
        <div className={`text-4xl font-bold ${color} tracking-tight mb-2`}>{value}</div>
        <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{label}</div>
    </div>
);