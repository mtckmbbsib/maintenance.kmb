import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { 
  FileText, 
  Calendar, 
  Settings, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Download, 
  Clock,
  AlertCircle,
  CheckCircle2,
  Truck,
  X,
  Check,
  Package,
  Droplets
} from 'lucide-react';

const weeklyChecklist = [
  {
    group: "Engine & Transmisi",
    items: [
      "Periksa minyak power steering (Level dan Kondisi)",
      "Periksa minyak kopling (Level dan Kondisi)",
      "Periksa level air radiator",
      "Periksa oli mesin (kondisi, level, dan tambah jika perlu)",
      "Periksa adanya kebocoran oli atau air",
      "Periksa kondisi V-Belt (kekencangan dan kondisi fisik)",
      "Periksa dan lumasi rangkaian yang berputar (propeller)",
      "Periksa sistem pembuangan (kebocoran dan kondisi jalur knalpot)",
      "Periksa saluran buangan AC (pastikan tidak tersumbat)",
      "Periksa dan bersihkan filter AC",
      "Periksa dan bersihkan filter udara"
    ]
  },
  {
    group: "Chassis and Drive Train",
    items: [
      "Periksa kipas / wiper dan semprotan air bekerja dengan aman",
      "Periksa bagian ban (kondisi ban, kekencangan baut, tekanan)",
      "Periksa bagian transfer case, transmisi, dan differensial",
      "Periksa bagian PTO (kekencangan baut dan kebocoran oli)",
      "Periksa rangkaian steering dan tie rod",
      "Periksa aki (level air aki, kepala aki, baut braket, karat)",
      "Periksa bagian rem depan & belakang (kampas, bocor angin, pedal)",
      "Periksa dan lumasi semua point greas (spring dan brake)",
      "Periksa bagian spring depan & belakang (kondisi spring, baut, stopper)",
      "Periksa baut + nut chassis (kondisi dan kekencangan)",
      "Periksa spring stopper depan dan belakang"
    ]
  },
  {
    group: "Lampu dan Indikator",
    items: [
      "Periksa fungsi semua lampu kerja",
      "Periksa fungsi alarm mundur"
    ]
  },
  {
    group: "Mixing Unit / MMU",
    items: [
      "Periksa dan lumasi rangkaian yang berputar (Propeller PTO)",
      "Periksa dan lumasi semua bearing dan chain coupling proses mixing",
      "Periksa kondisi hydraulic pump (baut pengikat dan kebocoran)",
      "Periksa kondisi semua motor hidraulik (baut pengikat dan kebocoran)",
      "Periksa kondisi semua coupling",
      "Periksa level oli hidraulik (ganti per 200 HM / 1 Thn)",
      "Periksa kondisi hose hydraulik (baut pengikat dan kebocoran)",
      "Periksa kondisi piping hydraulik (baut pengikat dan kebocoran)",
      "Periksa kondisi cylinder boom auger (leaking dan crack)",
      "Periksa kondisi hydraulic cooler",
      "Periksa kondisi nemo pump secara visual",
      "Periksa kondisi hose emulsi dan produk",
      "Periksa level dan kebocoran cat pump (ganti jika tercampur air)",
      "Periksa kondisi hose gasser dan air",
      "Periksa semua pressure gauge (kondisi dan kebocoran)",
      "Periksa kondisi panel control (hydraulic dan electric)",
      "Periksa kondisi kontrol valve bank (baut pengikat dan kebocoran)",
      "Periksa kondisi hand reel (kondisi dan baut pengikat)",
      "Periksa kondisi tangga (kondisi dan baut pengikat)",
      "Periksa kondisi main hole",
      "Periksa kondisi APAR (6 kg) (kondisi dan level)",
      "Cek semua baut + nut bin mmu",
      "Periksa kondisi mud guard",
      "Periksa kondisi semua sign di tank",
      "Periksa kondisi dan kebocoran semua tank"
    ]
  }
];

const reportTypes = [
  {
    id: 'weekly',
    title: 'Weekly Service',
    description: 'Ringkasan aktivitas service mingguan dan Mechanical Availability.',
    icon: Calendar,
    color: 'bg-blue-500',
    subTypes: []
  },
  {
    id: 'service',
    title: 'Service Berkala',
    description: 'Laporan pemeliharaan rutin berdasarkan Hour Meter (HM).',
    icon: Settings,
    color: 'bg-purple-500',
    subTypes: ['HM 250', 'HM 500', 'HM 1000']
  },
  {
    id: 'pump_safety',
    title: 'Laporan Pump Safety',
    description: 'Inspeksi sistem pengaman dan fungsi kritis unit pompa.',
    icon: ShieldCheck,
    color: 'bg-emerald-500',
    subTypes: []
  }
];

export const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [selectedType, setSelectedType] = useState(null);
  const [units, setUnits] = useState([]);
  const [inventory, setInventory] = useState([]); // Spare parts from warehouse
  const [formStep, setFormStep] = useState(0); 
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchUnit, setSearchUnit] = useState('');
  const [showUnitList, setShowUnitList] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: '',
    date_start: '',
    date_end: '',
    ma_percent: '',
    activities: '',
    remarks: '',
    checklist: {},
    usedParts: [], // { id, name, qty }
    usedOils: []   // { id, name, qty }
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [checklistStep, setChecklistStep] = useState(0);
  const [partSearch, setPartSearch] = useState('');
  const [oilSearch, setOilSearch] = useState('');
  const [oilsList, setOilsList] = useState([]);
  const [showPartSuggestions, setShowPartSuggestions] = useState(false);
  const [showOilSuggestions, setShowOilSuggestions] = useState(false);

  const { profile, authUser } = useAuth();
  const { setBreadcrumbs } = usePageHeader();

  // Update sticky header breadcrumbs dynamically
  useEffect(() => {
    if (view === 'list') {
      setBreadcrumbs([{ label: 'Report' }]);
    } else if (view === 'create' && selectedType) {
      const crumbs = [{ label: 'Report' }, { label: selectedType.title }];
      if (formData.unit_id) crumbs.push({ label: formData.unit_id });
      setBreadcrumbs(crumbs);
    }
    return () => setBreadcrumbs([]);
  }, [view, selectedType, formData.unit_id]);

  useEffect(() => {
    fetchReports();
    fetchUnits();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data: sp } = await supabase.from('spareparts').select('*').order('nama_sparepart');
    const { data: oil } = await supabase.from('oil_consumables').select('*').order('nama_barang');
    setInventory(sp || []);
    setOilsList(oil || []); // I need to add oilsList state to Reports.jsx too
  };

  const categories = [...new Set(units.map(u => u.type))];

  const fetchUnits = async () => {
    const { data } = await supabase.from('units').select('*').order('id');
    setUnits(data || []);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles (nama)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('nama').eq('id', authUser.id).single();
      
      // 1. Save the report
      const { data: reportData, error: reportError } = await supabase.from('reports').insert({
        type: selectedType.id,
        sub_type: selectedType.id === 'service' ? formData.sub_type : null,
        unit_id: formData.unit_id,
        created_by: authUser.id,
        data: {
          date_range: { start: formData.date_start, end: formData.date_end },
          ma_percent: formData.ma_percent,
          activities: formData.activities,
          remarks: formData.remarks,
          checklist: formData.checklist,
          usedParts: formData.usedParts
        }
      }).select().single();

      if (reportError) throw reportError;

      // 2. Create Service Record for Unit History
      const { data: serviceRec, error: srvError } = await supabase.from('service_records').insert({
        unit_id: formData.unit_id,
        service_type: selectedType.title + (selectedType.id === 'service' ? ` (${formData.sub_type})` : ''),
        hm_service: 0, // Should probably add HM input to report form
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: formData.activities || formData.remarks || 'Automatic from Report',
        user_id: authUser.id,
        nama_user: profile?.nama
      }).select().single();

      if (srvError) throw srvError;

      // 3. Process Spare Part Deductions
      for (const part of formData.usedParts) {
        // Update Stock
        const { data: currentPart } = await supabase.from('spareparts').select('stok').eq('id', part.id).single();
        const newStock = (currentPart?.stok || 0) - part.qty;
        await supabase.from('spareparts').update({ stok: newStock }).eq('id', part.id);

        // Record History
        await supabase.from('sparepart_history').insert({
          sparepart_id: part.id,
          user_id: authUser.id,
          nama_user: profile?.nama || 'System',
          tipe: 'OUT',
          jumlah: part.qty,
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: `Maintenance Unit ${formData.unit_id} (Report #${reportData.id})`
        });

        // Link to Service Record
        await supabase.from('service_parts').insert({
          service_id: serviceRec.id,
          sparepart_id: part.id,
          jumlah: part.qty
        });
      }

      // 4. Process Oil Deductions
      for (const oil of formData.usedOils) {
        const { data: currentOil } = await supabase.from('oil_consumables').select('stok').eq('id', oil.id).single();
        const newStock = (currentOil?.stok || 0) - oil.qty;
        await supabase.from('oil_consumables').update({ stok: newStock }).eq('id', oil.id);

        await supabase.from('oil_consumable_history').insert({
          oil_consumable_id: oil.id,
          user_id: authUser.id,
          nama_user: profile?.nama || 'System',
          tipe: 'OUT',
          jumlah: oil.qty,
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: `Maintenance Unit ${formData.unit_id} (Report #${reportData.id})`
        });

        await supabase.from('service_oils').insert({
          service_id: serviceRec.id,
          oil_consumable_id: oil.id,
          jumlah: oil.qty
        });
      }
      
      setIsModalOpen(false);
      fetchReports();
      fetchInventory();
      setFormData({ unit_id: '', date_start: '', date_end: '', ma_percent: '', activities: '', remarks: '', checklist: {}, usedParts: [], usedOils: [] });
      setSearchUnit('');
      setFormStep(0);
      setChecklistStep(0);
      setView('list');
      alert('Laporan berhasil disimpan dan data service unit telah diperbarui.');
    } catch (err) {
      console.error('Error saving report:', err);
      alert('Gagal menyimpan laporan: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const addUsedPart = (part) => {
    const exists = formData.usedParts.find(p => p.id === part.id);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        usedParts: prev.usedParts.map(p => p.id === part.id ? { ...p, qty: p.qty + 1 } : p)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        usedParts: [...prev.usedParts, { id: part.id, name: part.nama_sparepart, qty: 1, stock: part.stok }]
      }));
    }
    setPartSearch('');
    setShowPartSuggestions(false);
  };

  const updatePartQty = (id, newQty) => {
    setFormData(prev => ({
      ...prev,
      usedParts: prev.usedParts.map(p => p.id === id ? { ...p, qty: Math.max(1, newQty) } : p)
    }));
  };

  const removeUsedPart = (id) => {
    setFormData(prev => ({
      ...prev,
      usedParts: prev.usedParts.filter(p => p.id !== id)
    }));
  };

  const addUsedOil = (oil) => {
    const exists = formData.usedOils.find(o => o.id === oil.id);
    if (exists) {
      setFormData(prev => ({
        ...prev,
        usedOils: prev.usedOils.map(o => o.id === oil.id ? { ...o, qty: o.qty + 1 } : o)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        usedOils: [...prev.usedOils, { id: oil.id, name: oil.nama_barang, qty: 1, stock: oil.stok }]
      }));
    }
    setOilSearch('');
    setShowOilSuggestions(false);
  };

  const updateOilQty = (id, newQty) => {
    setFormData(prev => ({
      ...prev,
      usedOils: prev.usedOils.map(o => o.id === id ? { ...o, qty: Math.max(1, newQty) } : o)
    }));
  };

  const removeUsedOil = (id) => {
    setFormData(prev => ({
      ...prev,
      usedOils: prev.usedOils.filter(o => o.id !== id)
    }));
  };

  const updateChecklistItem = (item, field, value) => {
    setFormData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [item]: {
          ...(prev.checklist[item] || { status: 'OK', comment: '' }),
          [field]: value
        }
      }
    }));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'final': return 'text-emerald-500 bg-emerald-500/10';
      case 'draft': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-foreground/60 bg-foreground/5';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {view === 'list' ? (
        <>
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Report & Analytics</h1>
              <p className="text-foreground/60 mt-1">Dokumentasi dan analisis performa maintenance.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari laporan..." 
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <button className="p-2.5 bg-card border border-border rounded-xl hover:bg-foreground/5 transition-colors">
                <Filter size={20} />
              </button>
            </div>
          </div>

          {/* Report Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button 
                  key={type.id}
                  onClick={() => { setSelectedType(type); setView('create'); setFormStep(0); setChecklistStep(0); }}
                  className="group relative bg-card border border-border p-6 rounded-2xl text-left hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 overflow-hidden"
                >
                  <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{type.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed mb-6">
                    {type.description}
                  </p>
                  <div className="flex items-center text-primary font-bold text-sm">
                    Buat Laporan <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {/* Decorative background element */}
                  <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${type.color} opacity-[0.03] rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
                </button>
              );
            })}
          </div>

          {/* Recent Reports Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background/30 backdrop-blur-sm">
              <h2 className="font-bold flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Riwayat Laporan Terbaru
              </h2>
              <div className="flex bg-background/50 p-1 rounded-lg border border-border/50">
                {['all', 'weekly', 'service', 'pump'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-foreground/5 text-foreground/60'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold text-foreground/40 uppercase tracking-wider border-b border-border">
                    <th className="px-6 py-4">Laporan</th>
                    <th className="px-6 py-4">Tipe / HM</th>
                    <th className="px-6 py-4">Unit</th>
                    <th className="px-6 py-4">Dibuat Oleh</th>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-foreground/40 italic">Memuat data laporan...</td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-foreground/40 italic">Belum ada laporan yang dibuat.</td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="hover:bg-foreground/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${report.type === 'weekly' ? 'bg-blue-500/10 text-blue-500' : report.type === 'service' ? 'bg-purple-500/10 text-purple-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                              <FileText size={16} />
                            </div>
                            <span className="font-bold text-sm">{report.type === 'weekly' ? 'Weekly Service' : report.type === 'service' ? 'Service Berkala' : 'Pump Safety'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-primary">{report.sub_type || '-'}</td>
                        <td className="px-6 py-4 text-sm font-medium">{report.unit_id || '-'}</td>
                        <td className="px-6 py-4 text-sm font-medium">{report.profiles?.nama || 'Unknown'}</td>
                        <td className="px-6 py-4 text-xs font-medium text-foreground/60">
                          {new Date(report.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(report.status)}`}>
                            <CheckCircle2 size={10} />
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors">
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="animate-in slide-in-from-right-8 duration-500">
          {/* Full Page Form Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('list')}
                className="p-3 bg-card border border-border rounded-2xl hover:bg-foreground/5 transition-all group"
              >
                <ChevronRight size={24} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${selectedType?.color}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Mode Pengisian Laporan</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{selectedType?.title}</h2>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {[0, 1, 2].map((step) => (
                <div key={step} className={`w-3 h-3 rounded-full transition-all ${formStep === step ? `${selectedType?.color} w-8` : 'bg-foreground/10'}`} />
              ))}
            </div>
          </div>

          <div className="md:p-4">
              {selectedType?.id === 'weekly' ? (
                <div className="max-w-4xl mx-auto">
                  {/* Step Indicators for Mobile/Full */}
                  <div className="flex items-center justify-between mb-12 px-4 md:px-20">
                    {[
                      { label: 'Kategori', icon: Filter },
                      { label: 'Pilih Unit', icon: Truck },
                      { label: 'Checklist', icon: FileText }
                    ].map((step, idx) => {
                      const Icon = step.icon;
                      return (
                        <div key={idx} className="flex items-center flex-1 last:flex-initial">
                          <div className="flex flex-col items-center relative">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formStep >= idx ? `${selectedType?.color} text-white shadow-xl shadow-black/20` : 'bg-foreground/5 text-foreground/20'}`}>
                              <Icon size={20} />
                            </div>
                            <span className={`absolute -bottom-6 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider ${formStep === idx ? 'text-foreground' : 'text-foreground/20'}`}>{step.label}</span>
                          </div>
                          {idx < 2 && <div className={`h-0.5 flex-1 mx-4 ${formStep > idx ? selectedType?.color : 'bg-foreground/5'}`} />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-16">
                    {formStep === 0 && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-10">
                          <h3 className="text-xl font-bold mb-2 text-blue-500">Pilih Kategori Unit</h3>
                          <p className="text-sm text-foreground/40">Tentukan jenis alat yang akan dilakukan pemeriksaan mingguan.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => { setSelectedCategory(cat); setFormStep(1); }}
                              className="bg-background border border-border p-10 rounded-3xl text-center hover:border-blue-500 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
                            >
                              <p className="font-bold text-2xl group-hover:text-blue-500 transition-colors uppercase tracking-tighter">{cat}</p>
                              <p className="text-xs text-foreground/40 font-bold uppercase tracking-widest mt-2">{units.filter(u => u.type === cat).length} Unit</p>
                              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formStep === 1 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-blue-500">Daftar Unit: {selectedCategory}</h3>
                            <p className="text-sm text-foreground/40">Pilih nomor lambung unit yang ingin Anda input datanya.</p>
                          </div>
                          <button onClick={() => setFormStep(0)} className="px-6 py-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Ganti Kategori</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {units.filter(u => u.type === selectedCategory).map(unit => (
                            <button
                              key={unit.id}
                              onClick={() => {
                                setFormData({...formData, unit_id: unit.id});
                                setFormStep(2);
                              }}
                              className="bg-background border border-border p-6 rounded-2xl text-left hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-between group"
                            >
                              <div>
                                <p className="font-bold text-xl">{unit.id}</p>
                                <p className="text-[10px] text-foreground/40 font-bold uppercase">{unit.model}</p>
                              </div>
                              <ChevronRight size={20} className="text-foreground/10 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formStep === 2 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12 pb-20">
                        {/* Summary Header */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-blue-500/5 p-8 rounded-3xl border border-blue-500/10 gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                              <Truck size={32} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Unit Sedang Diperiksa</p>
                              <h3 className="font-black text-3xl tracking-tighter">{formData.unit_id}</h3>
                              <p className="text-xs text-foreground/40 font-medium">{selectedCategory} â€¢ MMU Service BSIB</p>
                            </div>
                          </div>
                          <div className="flex gap-4 w-full md:w-auto">
                            <div className="flex-1 md:w-48">
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">Periode Mulai</label>
                              <input type="date" required value={formData.date_start} onChange={e => setFormData({...formData, date_start: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                            <div className="flex-1 md:w-48">
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">Periode Selesai</label>
                              <input type="date" required value={formData.date_end} onChange={e => setFormData({...formData, date_end: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50" />
                            </div>
                          </div>
                        </div>

                        {/* Checklist Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                          {/* Sidebar Navigation */}
                          <div className="lg:sticky lg:top-8 space-y-2">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-foreground/30 mb-4 px-2">Daftar Pemeriksaan</label>
                            {weeklyChecklist.map((group, idx) => (
                              <button
                                key={group.group}
                                onClick={() => {
                                  setChecklistStep(idx);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`w-full text-left px-5 py-4 rounded-2xl text-xs font-bold transition-all border ${checklistStep === idx ? 'bg-blue-500 text-white border-blue-400 shadow-xl shadow-blue-500/20 translate-x-2' : 'bg-background border-border text-foreground/60 hover:bg-foreground/5'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{group.group}</span>
                                  {checklistStep === idx && <ChevronRight size={14} />}
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Items List */}
                          <div className="lg:col-span-3 space-y-12">
                            <div className="space-y-6">
                              <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-xl italic">{checklistStep + 1}</div>
                                <h4 className="text-2xl font-bold tracking-tight">{weeklyChecklist[checklistStep].group}</h4>
                              </div>
                              
                              <div className="space-y-4">
                                {weeklyChecklist[checklistStep].items.map((item, idx) => (
                                  <div key={item} className="p-6 bg-background border border-border rounded-3xl space-y-6 hover:border-blue-500/30 transition-all shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                      <p className="text-sm font-bold leading-relaxed flex-1"><span className="text-blue-500/50 mr-2">#{idx + 1}</span> {item}</p>
                                      <div className="flex bg-foreground/5 p-1.5 rounded-xl shrink-0 self-start md:self-center">
                                        {[
                                          { id: 'OK', color: 'bg-emerald-500' },
                                          { id: 'X', color: 'bg-red-500' },
                                          { id: 'NA', color: 'bg-blue-500' }
                                        ].map(btn => (
                                          <button
                                            key={btn.id}
                                            type="button"
                                            onClick={() => updateChecklistItem(item, 'status', btn.id)}
                                            className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${formData.checklist[item]?.status === btn.id ? `${btn.color} text-white shadow-lg` : 'text-foreground/30 hover:text-foreground/60'}`}
                                          >
                                            {btn.id}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="relative">
                                      <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                                      <input 
                                        type="text" 
                                        placeholder="Tambahkan catatan temuan atau perbaikan di sini..." 
                                        value={formData.checklist[item]?.comment || ''}
                                        onChange={(e) => updateChecklistItem(item, 'comment', e.target.value)}
                                        className="w-full bg-foreground/[0.02] border border-border/50 rounded-xl pl-12 pr-4 py-4 text-xs outline-none focus:bg-background focus:border-blue-500/30 transition-all italic"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>                            {/* Footer Navigation */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-12 border-t border-border mt-12">
                              <button 
                                type="button"
                                disabled={checklistStep === 0}
                                onClick={() => {
                                  setChecklistStep(prev => prev - 1);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-2 text-xs font-bold text-foreground/40 disabled:opacity-20 hover:text-blue-500 transition-colors"
                              >
                                <ChevronRight size={18} className="rotate-180" />
                                Bagian Sebelumnya
                              </button>
                              
                              {checklistStep < weeklyChecklist.length - 1 ? (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setChecklistStep(prev => prev + 1);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="w-full sm:w-auto px-10 py-4 bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                  Lanjut ke {weeklyChecklist[checklistStep + 1].group}
                                  <ChevronRight size={18} />
                                </button>
                              ) : (
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setFormStep(3);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="w-full sm:w-auto px-10 py-4 bg-orange-500 text-white rounded-2xl font-bold text-sm shadow-2xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                  Lanjut ke Input Spare Part
                                  <Package size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {formStep === 3 && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12 pb-20 max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/20">
                            <Package size={24} />
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold tracking-tight text-orange-500">Pemakaian Spare Part</h4>
                            <p className="text-xs text-foreground/40 font-medium">Input suku cadang yang digunakan dalam perbaikan ini.</p>
                          </div>
                        </div>

                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-3xl p-8 space-y-8">
                          {/* Part Search Input */}
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
                            <input 
                              type="text" 
                              placeholder="Cari spare part di gudang..." 
                              value={partSearch}
                              onFocus={() => setShowPartSuggestions(true)}
                              onChange={(e) => {
                                setPartSearch(e.target.value);
                                setShowPartSuggestions(true);
                              }}
                              className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold"
                            />
                            
                            {showPartSuggestions && partSearch && (
                              <div className="absolute z-30 w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                {inventory
                                  .filter(p => p.nama_sparepart.toLowerCase().includes(partSearch.toLowerCase()))
                                  .map(part => (
                                    <button
                                      key={part.id}
                                      onClick={() => addUsedPart(part)}
                                      className="w-full text-left px-6 py-4 hover:bg-orange-500/10 transition-colors border-b border-border/50 last:border-0 flex justify-between items-center"
                                    >
                                      <div>
                                        <p className="font-bold text-sm">{part.nama_sparepart}</p>
                                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest">{part.kategori} â€¢ PN: {part.part_number || '-'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-xs font-black ${part.stok > 0 ? 'text-emerald-500' : 'text-red-500'}`}>Stok: {part.stok}</p>
                                      </div>
                                    </button>
                                  ))
                                }
                              </div>
                            )}
                            {showPartSuggestions && (
                              <div className="fixed inset-0 z-20" onClick={() => setShowPartSuggestions(false)} />
                            )}
                          </div>

                          {/* List of Added Parts */}
                          <div className="space-y-3">
                            {formData.usedParts.length === 0 ? (
                              <div className="py-12 text-center border-2 border-dashed border-orange-500/10 rounded-2xl bg-background/50">
                                <Package size={40} className="mx-auto mb-4 text-orange-500/20" />
                                <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Belum ada part yang ditambahkan</p>
                              </div>
                            ) : (
                              formData.usedParts.map(part => (
                                <div key={part.id} className="bg-background border border-border p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-300">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                                      <Package size={20} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm">{part.name}</p>
                                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Stok Gudang: {part.stock}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3 bg-foreground/5 p-1.5 rounded-xl border border-border/50">
                                      <button 
                                        type="button"
                                        onClick={() => updatePartQty(part.id, part.qty - 1)}
                                        className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-sm font-black"
                                      >-</button>
                                      <span className="w-10 text-center font-mono font-black text-lg">{part.qty}</span>
                                      <button 
                                        type="button"
                                        onClick={() => updatePartQty(part.id, part.qty + 1)}
                                        className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all text-sm font-black"
                                      >+</button>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => removeUsedPart(part.id)}
                                      className="p-3 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                      <X size={20} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Oil/Lube Usage Section */}
                        <div className="flex items-center gap-4 mb-8 mt-12">
                          <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                            <ShieldCheck size={24} />
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold tracking-tight text-primary">Pemakaian Oli & Consumable</h4>
                            <p className="text-xs text-foreground/40 font-medium">Input oli atau pelumas yang digunakan.</p>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 space-y-8">
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={20} />
                            <input 
                              type="text" 
                              placeholder="Cari oli atau consumable..." 
                              value={oilSearch}
                              onFocus={() => setShowOilSuggestions(true)}
                              onChange={(e) => {
                                setOilSearch(e.target.value);
                                setShowOilSuggestions(true);
                              }}
                              className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
                            />
                            
                            {showOilSuggestions && oilSearch && (
                              <div className="absolute z-30 w-full mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                {oilsList
                                  .filter(o => o.nama_barang.toLowerCase().includes(oilSearch.toLowerCase()))
                                  .map(oil => (
                                    <button
                                      key={oil.id}
                                      onClick={() => addUsedOil(oil)}
                                      className="w-full text-left px-6 py-4 hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0 flex justify-between items-center"
                                    >
                                      <div>
                                        <p className="font-bold text-sm">{oil.nama_barang}</p>
                                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest">{oil.kategori} â€¢ Merk: {oil.merk || '-'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-xs font-black ${oil.stok > 0 ? 'text-emerald-500' : 'text-red-500'}`}>Stok: {oil.stok} {oil.satuan}</p>
                                      </div>
                                    </button>
                                  ))
                                }
                              </div>
                            )}
                            {showOilSuggestions && <div className="fixed inset-0 z-20" onClick={() => setShowOilSuggestions(false)} />}
                          </div>

                          <div className="space-y-3">
                            {formData.usedOils.length === 0 ? (
                              <div className="py-12 text-center border-2 border-dashed border-primary/10 rounded-2xl bg-background/50">
                                <ShieldCheck size={40} className="mx-auto mb-4 text-primary/20" />
                                <p className="text-xs text-foreground/30 font-bold uppercase tracking-widest">Belum ada oli yang ditambahkan</p>
                              </div>
                            ) : (
                              formData.usedOils.map(oil => (
                                <div key={oil.id} className="bg-background border border-border p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-300">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                                      <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm">{oil.name}</p>
                                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Stok: {oil.stock}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3 bg-foreground/5 p-1.5 rounded-xl border border-border/50">
                                      <button type="button" onClick={() => updateOilQty(oil.id, oil.qty - 1)} className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-sm font-black">-</button>
                                      <span className="w-10 text-center font-mono font-black text-lg">{oil.qty}</span>
                                      <button type="button" onClick={() => updateOilQty(oil.id, oil.qty + 1)} className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all text-sm font-black">+</button>
                                    </div>
                                    <button type="button" onClick={() => removeUsedOil(oil.id)} className="p-3 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><X size={20} /></button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Final Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-12 border-t border-border">
                          <button 
                            type="button"
                            onClick={() => setFormStep(2)}
                            className="w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-2 text-xs font-bold text-foreground/40 hover:text-blue-500 transition-colors"
                          >
                            <ChevronRight size={18} className="rotate-180" />
                            Kembali ke Checklist
                          </button>
                          
                          <button 
                            type="button"
                            onClick={handleReportSubmit}
                            disabled={submitLoading}
                            className="w-full sm:w-auto px-12 py-5 bg-emerald-500 text-white rounded-2xl font-black text-base shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                            {submitLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={24} />}
                            FINALISASI & SIMPAN LAPORAN
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8">
                    <AlertCircle size={48} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 italic">Segera Hadir!</h3>
                  <p className="text-foreground/60 max-w-md mx-auto mb-10">
                    Modul pengisian untuk <strong>{selectedType?.title}</strong> sedang kami siapkan agar se-elegan modul Weekly Service.
                  </p>
                  <button onClick={() => setView('list')} className="px-10 py-4 bg-foreground/5 hover:bg-foreground/10 rounded-2xl font-bold text-xs transition-all uppercase tracking-widest">Kembali ke Dashboard</button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
