import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Wrench, Package, Truck, Users, 
  ArrowUpRight, ArrowDownLeft, History, BarChart3, TrendingUp 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  CartesianGrid, BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';

export const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalSpareParts: 0,
    totalUsers: 0
  });
  const [recentHistory, setRecentHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const [
        { count: spCount },
        { count: userCount },
        { data: spData }
      ] = await Promise.all([
        supabase.from('spareparts').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('spareparts').select('kategori')
      ]);

      setStats({
        totalSpareParts: spCount || 0,
        totalUsers: userCount || 0
      });

      // 2. Process Category Data
      if (spData) {
        const counts = spData.reduce((acc, curr) => {
          acc[curr.kategori] = (acc[curr.kategori] || 0) + 1;
          return acc;
        }, {});
        const formatted = Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
        setCategoryData(formatted);
      }

      // 3. Fetch History for Trends (Last 7 Days)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      const { data: historyData } = await supabase
        .from('sparepart_history')
        .select('*, spareparts(nama_sparepart)')
        .order('created_at', { ascending: false });
      
      setRecentHistory((historyData || []).slice(0, 5));

      // 4. Process Trend Data (Incoming per Day)
      if (historyData) {
        const daily = historyData.reduce((acc, item) => {
          const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          if (!acc[date]) acc[date] = { date, total: 0 };
          if (item.tipe === 'IN') acc[date].total += item.jumlah;
          return acc;
        }, {});
        setChartData(Object.values(daily).reverse().slice(-7));
      }

    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Jenis Spare Part', value: stats.totalSpareParts, icon: <Package size={24} className="text-blue-500" />, subtitle: 'Total variasi item', status: 'Active' },
    { title: 'Active Tools', value: '---', icon: <Wrench size={24} className="text-orange-500" />, subtitle: 'Segera Hadir', status: 'Dev' },
    { title: 'Total Unit', value: '---', icon: <Truck size={24} className="text-green-500" />, subtitle: 'Segera Hadir', status: 'Dev' },
    { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} className="text-purple-500" />, subtitle: 'Akun aktif', status: 'Active' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="text-primary" /> Dashboard
        </h1>
        <p className="text-foreground/60">Ringkasan operasional pemeliharaan PT BSIB</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className={`bg-card border border-border p-6 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all ${stat.status === 'Dev' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
            <div className="p-3 bg-background rounded-xl border border-border">
              {stat.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-foreground/60 font-medium uppercase tracking-wider">{stat.title}</p>
                {stat.status === 'Dev' && <span className="text-[8px] bg-orange-500/10 text-orange-500 px-1 rounded font-bold border border-orange-500/20 uppercase">Dev</span>}
              </div>
              <p className="text-2xl font-bold mt-0.5">{stat.value.toLocaleString()}</p>
              <p className="text-[10px] text-foreground/40 mt-0.5 italic">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Trend Sparepart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" /> Tren Barang Masuk
              </h2>
              <p className="text-xs text-foreground/50">Statistik penambahan stok 7 hari terakhir</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'var(--color-foreground)', opacity: 0.5, fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-foreground)', opacity: 0.5, fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: 'var(--color-primary)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-foreground/30 text-sm italic">Belum ada data tren</div>
            )}
          </div>
        </div>

        {/* Sidebar Chart - Distribution by Category */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" /> Sebaran Kategori
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: -20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--color-foreground)', fontSize: 11}} width={80} />
                <Tooltip 
                  cursor={{fill: 'var(--color-primary)', opacity: 0.05}}
                  contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--color-primary)' : 'var(--color-primary-light, #a78bfa)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Table */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Log Transaksi Terakhir
          </h2>
          <div className="space-y-4">
            {recentHistory.length === 0 ? (
              <p className="text-center py-8 text-foreground/40 italic">Belum ada aktivitas terbaru</p>
            ) : (
              recentHistory.map((item) => (
                <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-border/50 last:border-0 last:pb-0 group">
                  <div className={`p-2 rounded-xl transition-colors ${item.tipe === 'IN' ? 'bg-green-500/10 text-green-500 group-hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20'}`}>
                    {item.tipe === 'IN' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {item.spareparts?.nama_sparepart} 
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.tipe === 'IN' ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'}`}>
                        {item.tipe === 'IN' ? '+' : '-'}{item.jumlah}
                      </span>
                      <span className="text-[10px] text-foreground/40">• {item.nama_user} • {new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Future Module Preview (Tools & Units) */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[300px] relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary)_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-full text-primary mb-2">
            <LayoutDashboard size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold">Modul Analitik Unit & Tools</h3>
            <p className="text-sm text-foreground/50 max-w-[300px] mx-auto mt-2 italic">
              "Kami sedang menyiapkan visualisasi data real-time untuk performa armada dan ketersediaan alat kerja Anda."
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] bg-foreground/5 border border-border px-2 py-1 rounded-full font-bold opacity-60">MONITORING</span>
            <span className="text-[10px] bg-foreground/5 border border-border px-2 py-1 rounded-full font-bold opacity-60">REPORTING</span>
            <span className="text-[10px] bg-foreground/5 border border-border px-2 py-1 rounded-full font-bold opacity-60">ANALYTICS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
