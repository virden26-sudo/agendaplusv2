'use client';
import React, { useState, useSyncExternalStore } from 'react';
import { 
  Calendar, 
  LayoutDashboard, 
  ListTodo, 
  Settings, 
  Bell, 
  BookOpen,
  TrendingUp,
  MoreVertical,
  ChevronRight,
  FileText,
  Share2,
  CalendarCheck,
  GraduationCap,
  BookOpenCheck,
  SquareCheckBig,
  Sun,
  ArrowRight,
  Sparkles,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import SyllabusAI from './SyllabusAI';

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
      active 
        ? 'bg-teal-50 text-teal-600 shadow-sm shadow-teal-100/50 font-bold' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <span className={`${active ? 'text-teal-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'} transition-transform`}>
      {icon}
    </span>
    <span className="text-sm tracking-tight">{label}</span>
  </button>
);

const DashboardCard = ({ title, subtitle, icon, children, linkText }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-50 rounded-2xl text-teal-600">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
        <MoreVertical size={20} />
      </button>
    </div>
    
    <div className="flex-1 min-h-[140px]">
      {children}
    </div>

    <button className="mt-6 flex items-center justify-between w-full p-4 bg-slate-50 rounded-2xl group hover:bg-teal-50 transition-colors">
      <span className="text-sm font-bold text-slate-600 group-hover:text-teal-600">{linkText}</span>
      <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
    </button>
  </div>
);

const EmptyState = ({ icon, title, message }) => (
  <div className="h-full flex flex-col items-center justify-center py-4 text-center">
    <div className="mb-3 text-slate-200 bg-slate-50/50 p-4 rounded-full">
      {icon}
    </div>
    <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
    <p className="text-xs text-slate-400 max-w-[180px] leading-relaxed">{message}</p>
  </div>
);

const WelcomeScreen = ({ onGetStarted, handleSyncData }) => (
  <div className="min-h-svh bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
    <div className="max-w-md w-full">
      <div className="mb-8 inline-flex p-4 bg-teal-50 rounded-3xl animate-bounce [animation-duration:3000ms]">
        <BookOpen className="text-teal-600 w-12 h-12" />
      </div>
      <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>
        Agenda<span className="text-teal-600">+</span>
      </h1>
      <p className="text-lg text-slate-500 mb-10 leading-relaxed">
        Your AI-powered academic companion. We turn chaos into a perfect schedule.
      </p>
      
      <div className="space-y-4">
        <button 
          onClick={onGetStarted}
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-lg shadow-2xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
        >
          Get Started
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
        
        <button 
          onClick={handleSyncData}
          className="w-full bg-white border-2 border-slate-100 text-slate-600 py-5 rounded-3xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
        >
          <Share2 size={20} />
          Sync Old Data
        </button>
      </div>
      
      <div className="mt-12 flex items-center justify-center gap-6 text-slate-300">
        <div className="flex flex-col items-center gap-1">
          <Sparkles size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">AI Sync</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
        <div className="flex flex-col items-center gap-1">
          <Calendar size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Smart Plan</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
        <div className="flex flex-col items-center gap-1">
          <TrendingUp size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Progress</span>
        </div>
      </div>
    </div>
  </div>
);

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export default function Dashboard() {
  const mounted = useMounted();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assignments, setAssignments] = useState([]);
  const [showWelcome, setShowWelcome] = useState(() =>
    typeof window !== 'undefined' ? !localStorage.getItem('hasSeenWelcome') : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSyncAssignments = (newAssignments) => {
    setAssignments((prev) => [...prev, ...newAssignments]);
    setActiveTab('dashboard');
  };         

  const handleSyncData = () => {
    if (window.electronAPI && window.electronAPI.saveNote) {
      const syncMessage = `Manual sync performed. ${assignments.length} assignments tracked.`;
      window.electronAPI.saveNote(syncMessage);
      alert("Sync log saved to Desktop!");
    } else {
      alert("Sync only available in desktop version.");
    }
  };         

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  if (!mounted) return null;

  if (showWelcome) {
    return <WelcomeScreen onGetStarted={handleGetStarted} handleSyncData={handleSyncData} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6 max-w-7xl mx-auto flex-1 animate-in fade-in-50 duration-500">
            <div className="grid gap-6 auto-rows-fr grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              
              {/* Today's Schedule */}
              <div className="lg:col-span-2">
                <DashboardCard 
                  title="Today's Schedule" 
                  subtitle="Everything due today"
                  icon={<CalendarCheck className="h-6 w-6" />}
                  linkText="View Calendar"
                >
                  <EmptyState 
                    icon={<Sun size={32} />} 
                    title="Nothing Due Today" 
                    message="Enjoy your free day!" 
                  />
                </DashboardCard>
              </div>

              {/* Grades Overview */}
              <div className="lg:col-span-2">
                <DashboardCard 
                  title="Grades Overview" 
                  subtitle="Your current course grades"
                  icon={<GraduationCap className="h-6 w-6" />}
                  linkText="View Details"
                >
                  <EmptyState 
                    icon={<GraduationCap size={32} />} 
                    title="No Grades Yet" 
                    message="Sync a graded item to see your progress." 
                  />
                </DashboardCard>
              </div>

              {/* Upcoming Assignments */}
              <div className="lg:col-span-2">
                <DashboardCard 
                  title="Upcoming Assignments" 
                  subtitle="Stay on top of your deadlines"
                  icon={<BookOpenCheck className="h-6 w-6" />}
                  linkText="View All"
                >
                  {assignments.length === 0 ? (
                    <EmptyState 
                      icon={<BookOpenCheck size={32} />} 
                      title="No Upcoming Assignments" 
                      message="Sync your syllabus to add assignments." 
                    />
                  ) : (
                    <div className="space-y-3">
                      {assignments.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{item.title || item.name}</span>
                          <span className="text-xs text-slate-400">{item.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardCard>
              </div>

              {/* Personal Tasks */}
              <div className="lg:col-span-2">
                <DashboardCard 
                  title="Personal Tasks" 
                  subtitle="To-do items"
                  icon={<SquareCheckBig className="h-6 w-6" />}
                  linkText="Manage"
                >
                  <EmptyState 
                    icon={<SquareCheckBig size={32} />} 
                    title="No Tasks" 
                    message="Organize your personal to-dos here." 
                  />
                </DashboardCard>
              </div>

            </div>
          </div>
        );
      case 'syllabus':
        return <SyllabusAI onSync={handleSyncAssignments} />;
      default:
        return <div className="p-8 text-slate-400">Section Coming Soon</div>;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { id: 'calendar', icon: <Calendar size={20} />, label: 'Calendar' },
    { id: 'assignments', icon: <ListTodo size={20} />, label: 'Assignments' },
    { id: 'syllabus', icon: <FileText size={20} />, label: 'Syllabus AI' },
  ];

  return (
    <div style={{"--sidebar-width": "16rem", "--sidebar-width-icon": "3rem"}} className="flex min-h-svh w-full bg-[#f8fafc]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-2 rounded-xl"><BookOpen className="text-white w-6 h-6" /></div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: 'Comfortaa, cursive' }}>Agenda+</h1>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-100">
          <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <div className="mt-4 flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">U</div>
            <div>
              <p className="text-sm font-medium text-slate-800">New User</p>
              <p className="text-xs text-slate-500 italic">Ready to Sync</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <MenuIcon size={24} />
            </button>
            <h2 className="text-2xl font-bold text-slate-800 truncate">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
          </div>
          <div className="flex items-center gap-3">
           <button className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
             <Bell size={20} className="text-slate-400" />
           </button>
           <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
           <button 
             onClick={handleSyncData}
             className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
             <Share2 size={16} />
             <span className="hidden xs:inline">Sync</span>
           </button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
