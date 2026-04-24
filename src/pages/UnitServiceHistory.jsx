import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePageHeader } from '../contexts/PageHeaderContext';
import {
  ChevronRight, Truck, Activity, History, Loader2,
  Package, Droplets, Calendar, Wrench
} from 'lucide-react';

export const UnitServiceHistory = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageHeader();

  const [unit, setUnit] = useState(null);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    return () => setBreadcrumbs([]);
  }, [unitId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: unitData }, { data: historyData }] = await Promise.all([
        supabase.from('units').select('*').eq('id', unitId).single(),
        supabase
          .from('service_records')
          .select(`
            *,
            service_parts(jumlah, spareparts(nama_sparepart, satuan)),
            service_oils(jumlah, oil_consumables(nama_barang, satuan))
          `)
          .eq('unit_id', unitId)
          .order('tanggal', { ascending: false })
      ]);
      setUnit(unitData);
      setServiceHistory(historyData || []);
      // Update sticky header breadcrumbs
      setBreadcrumbs([
        { label: 'Unit' },
        { label: unitData?.id || unitId },
        { label: 'Riwayat Service' }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const serviceTypeStyle = (type = '') => {
    if (type.includes('Periodic'))  return { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',   dot: 'bg-blue-500',   border: 'border-blue-500/20'  };
    if (type.includes('Repair') || type.includes('Breakdown')) return { badge: 'bg-red-500/10 text-red-500 border-red-500/20', dot: 'bg-red-500', border: 'border-red-500/20' };
    if (type.includes('Overhaul')) return { badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', dot: 'bg-orange-500', border: 'border-orange-500/20' };
    return { badge: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary', border: 'border-primary/20' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-foreground/40">
        <Loader2 className="animate-spin" size={36} />
        <p className="font-medium">Memuat riwayat service...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Breadcrumb Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/unit')}
            className="p-3 bg-card border border-border rounded-2xl hover:bg-foreground/5 transition-all group shrink-0"
          >
            <ChevronRight size={22} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Manajemen Unit</span>
              <ChevronRight size={12} className="text-foreground/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Riwayat Service</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{unit?.id}</h1>
          </div>
        </div>

        {/* Unit Summary Card */}
        {unit && (
          <div className="flex flex-wrap items-center gap-0 bg-card border border-border rounded-2xl overflow-hidden shrink-0">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Truck size={18} />
              </div>
              <div>
                <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">{unit.type}</p>
                <p className="font-bold text-sm">{unit.pabrikan} {unit.model}</p>
              </div>
            </div>
            <div className="border-l border-border px-5 py-4">
              <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">HM Saat Ini</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity size={13} className="text-orange-500" />
                <span className="font-mono font-black text-orange-500">{Number(unit.current_hm).toLocaleString()}</span>
                <span className="text-[10px] text-foreground/40">HM</span>
              </div>
            </div>
            <div className="border-l border-border px-5 py-4">
              <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Total Service</p>
              <p className="font-black text-2xl mt-0.5">{serviceHistory.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {serviceHistory.length === 0 ? (
        <div className="flex flex-col items-center py-28 border-2 border-dashed border-border rounded-3xl text-foreground/40 gap-4">
          <History size={52} className="opacity-20" />
          <div className="text-center">
            <p className="font-bold text-lg">Belum ada riwayat service</p>
            <p className="text-sm mt-1 max-w-sm">Riwayat akan muncul secara otomatis setelah laporan dibuat melalui menu <strong>Report</strong>.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[2.05rem] top-5 bottom-5 w-px bg-gradient-to-b from-border via-border to-transparent hidden md:block" />

          <div className="space-y-5">
            {serviceHistory.map((rec, idx) => {
              const style = serviceTypeStyle(rec.service_type);
              return (
                <div
                  key={rec.id}
                  className="relative md:pl-20 animate-in fade-in slide-in-from-bottom-3 duration-500"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Timeline dot */}
                  <div className={`hidden md:flex absolute left-[0.85rem] top-[1.6rem] w-5 h-5 rounded-full items-center justify-center border-2 border-background ${style.dot}`} />

                  <div className={`bg-card border rounded-3xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/5 ${style.border}`}>

                    {/* ── Card Header ── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-foreground/[0.02] border-b border-border">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${style.badge}`}>
                          <Wrench size={10} />
                          {rec.service_type}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/70">
                          <Calendar size={13} className="text-foreground/30" />
                          {new Date(rec.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Activity size={13} className="text-orange-500" />
                          <span className="font-mono font-black text-orange-500">{(rec.hm_service || 0).toLocaleString()}</span>
                          <span className="text-xs text-foreground/40">HM</span>
                        </div>
                        <span className="text-xs text-foreground/40">
                          Mekanik: <span className="font-semibold text-foreground/70">{rec.nama_user || '-'}</span>
                        </span>
                      </div>
                    </div>

                    {/* ── Parts & Oils Grid ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">

                      {/* Spare Parts */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center">
                            <Package size={14} />
                          </div>
                          <p className="text-xs font-black text-foreground/50 uppercase tracking-widest">Spare Part</p>
                        </div>
                        {rec.service_parts?.length > 0 ? (
                          <div className="space-y-2">
                            {rec.service_parts.map((p, i) => (
                              <div key={i} className="flex items-center justify-between bg-orange-500/5 border border-orange-500/10 rounded-xl px-4 py-2.5">
                                <span className="text-sm font-medium">{p.spareparts?.nama_sparepart || '-'}</span>
                                <span className="text-sm font-black text-orange-500">
                                  {p.jumlah} <span className="font-normal text-xs text-foreground/40">{p.spareparts?.satuan}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-border rounded-xl px-4 py-3 text-xs text-foreground/30 italic">
                            Tidak ada penggantian spare part
                          </div>
                        )}
                      </div>

                      {/* Oils */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                            <Droplets size={14} />
                          </div>
                          <p className="text-xs font-black text-foreground/50 uppercase tracking-widest">Oli & Consumable</p>
                        </div>
                        {rec.service_oils?.length > 0 ? (
                          <div className="space-y-2">
                            {rec.service_oils.map((o, i) => (
                              <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
                                <span className="text-sm font-medium">{o.oil_consumables?.nama_barang || '-'}</span>
                                <span className="text-sm font-black text-primary">
                                  {o.jumlah} <span className="font-normal text-xs text-foreground/40">{o.oil_consumables?.satuan}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-border rounded-xl px-4 py-3 text-xs text-foreground/30 italic">
                            Tidak ada penggunaan oli
                          </div>
                        )}
                      </div>

                      {/* Keterangan */}
                      {rec.keterangan && (
                        <div className="col-span-2 pt-4 border-t border-border/60">
                          <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-2">Keterangan / Temuan</p>
                          <p className="text-sm leading-relaxed text-foreground/80 bg-foreground/5 rounded-xl px-4 py-3 italic">{rec.keterangan}</p>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-2 border-t border-border/50 text-[10px] text-foreground/25 text-right">
                      Record ID: {rec.id.split('-')[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
