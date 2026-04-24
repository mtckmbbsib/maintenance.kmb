import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageHeaderProvider, usePageHeader } from '../contexts/PageHeaderContext';
import { LayoutDashboard, Wrench, Package, Truck, FileText, Users, LogOut, Menu, X, Droplets, ChevronRight } from 'lucide-react';

export const Layout = () => {
  return (
    <PageHeaderProvider>
      <LayoutInner />
    </PageHeaderProvider>
  );
};

const LayoutInner = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { breadcrumbs } = usePageHeader();

  const menuItems = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Mekanik', 'User'] },
    { path: '/spare-part', name: 'Spare Part', icon: <Package size={20} />, roles: ['Admin', 'Mekanik'] },
    { path: '/oil-consumable', name: 'Oil & Consumable', icon: <Droplets size={20} />, roles: ['Admin', 'Mekanik'] },
    { path: '/tools', name: 'Tools', icon: <Wrench size={20} />, roles: ['Admin', 'Mekanik'], isDev: true },
    { path: '/unit', name: 'Unit', icon: <Truck size={20} />, roles: ['Admin', 'Mekanik'] },
    { path: '/report', name: 'Report', icon: <FileText size={20} />, roles: ['Admin', 'Mekanik'], isDev: true },
    { path: '/user-management', name: 'Manajemen User', icon: <Users size={20} />, roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(profile?.role));

  const handleSignOut = async () => {
    await signOut();
  };

  // Determine default breadcrumb from current menu item
  const currentMenu = menuItems.find(item => 
    item.path !== '/' 
      ? location.pathname.startsWith(item.path)
      : location.pathname === '/'
  );
  const defaultLabel = currentMenu?.name || 'Dashboard';
  // Use dynamic breadcrumbs if set by child page, otherwise fall back to menu name
  const displayCrumbs = breadcrumbs.length > 0 ? breadcrumbs : [{ label: defaultLabel }];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 w-full bg-card z-50 px-4 py-3 flex justify-between items-center border-b">
        <div className="font-bold text-xl text-primary flex items-center gap-2">
          <Wrench className="text-primary" /> BSIB Maint
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-card border-r flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b hidden lg:flex">
          <div className="font-bold text-2xl text-primary flex items-center gap-2">
            <Wrench className="text-primary" /> BSIB
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group
                    ${isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-foreground/70 hover:bg-card-foreground/5 hover:text-foreground'}
                  `}
                >
                  <span className={`${isActive ? 'text-primary' : 'text-foreground/50'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.name}</span>
                  {item.isDev && (
                    <span className="text-[9px] bg-foreground/5 text-foreground/40 px-1.5 py-0.5 rounded border border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                      Dev
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {profile?.foto ? (
                <img src={profile.foto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-lg">
                  {profile?.nama?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-sm truncate">{profile?.nama}</p>
              <p className="text-xs text-foreground/50 truncate">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 lg:pt-0">
        {/* Sticky Page Header */}
        <div className="shrink-0 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-1.5 h-5 bg-primary rounded-full shrink-0" />
            {displayCrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={14} className="text-foreground/30" />}
                <span className={`text-sm font-bold tracking-tight ${
                  i < displayCrumbs.length - 1 ? 'text-foreground/40' : 'text-foreground'
                }`}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground/40 shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">{profile?.site || 'BSIB'}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};
