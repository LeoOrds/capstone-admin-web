import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, Settings, LogOut, Activity, Plus, Edit, X, UploadCloud, Search, Loader2, ClipboardList, Trash2, Building2, Eye, AlertCircle, Menu } from 'lucide-react';

// localhost
// http://localhost:5000

interface LocationState { role: string; }

const BUILDINGS = ['BUILDING 1', 'BUILDING 2', 'BUILDING 3', 'BUILDING 4', 'BUILDING 5', 'BUILDING 6'];
const TIME_SLOTS = [
  '07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', '09:30 AM - 10:30 AM', 
  '10:30 AM - 11:30 AM', '11:30 AM - 12:30 PM', '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  
  const [activeTab, setActiveTab] = useState('Checkers'); 
  const [stats, setStats] = useState({ total_checkers: 0, active_checkers: 0, total_faculties: 0, active_faculties: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [checkers, setCheckers] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]); 
  const [reports, setReports] = useState<any[]>([]); 
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [facultySearch, setFacultySearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // NEW: Sidebar toggle state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'checker' | 'faculty'>('checker');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formError, setFormError] = useState('');

  const [checkerFormData, setCheckerFormData] = useState({ id: '', first_name: '', last_name: '', username: '', password: '', assigned_building: [] as string[], status: 'Active' });
  const [facultyFormData, setFacultyFormData] = useState({ id: '', first_name: '', last_name: '', department: '', weekly_schedule: [] as { day: string, time: string, building: string, room: string }[], status: 'Active' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCheckers = () => fetch('https://capstone-backend-api-vh11.onrender.com/api/checkers').then(res => res.json()).then(setCheckers);
  const fetchFaculties = () => fetch('https://capstone-backend-api-vh11.onrender.com/api/faculties').then(res => res.json()).then(setFaculties);
  const fetchReports = () => fetch('https://capstone-backend-api-vh11.onrender.com/api/reports').then(res => res.json()).then(setReports);

  useEffect(() => {
    if (activeTab === 'Dashboard') {
      fetch('https://capstone-backend-api-vh11.onrender.com/api/stats').then(res => res.json()).then(setStats);
      fetch('https://capstone-backend-api-vh11.onrender.com/api/recent-activity').then(res => res.json()).then(setActivities);
    }
    if (activeTab === 'Checkers') fetchCheckers();
    if (activeTab === 'Faculty') fetchFaculties();
    if (activeTab === 'Reports') fetchReports();
  }, [activeTab]); 

  if (!state || !state.role || state.role !== 'Admin') return <Navigate to="/" />;

  const filteredFaculties = faculties.filter(f => {
    const searchTerm = facultySearch.toLowerCase();
    return ((f.first_name || '').toLowerCase().includes(searchTerm) || (f.last_name || '').toLowerCase().includes(searchTerm) || (f.department || '').toLowerCase().includes(searchTerm));
  });

  const openCheckerModal = (mode: 'add' | 'edit', checker?: any) => {
    setFormError(''); setModalType('checker'); setModalMode(mode);
    let currentBuildings: string[] = [];
    if (mode === 'edit' && checker && Array.isArray(checker.assigned_building)) currentBuildings = checker.assigned_building;
    setCheckerFormData(mode === 'edit' ? { ...checker, password: '', assigned_building: currentBuildings } : { id: '', first_name: '', last_name: '', username: '', password: '', assigned_building: [], status: 'Active' });
    setIsModalOpen(true);
  };

  const openFacultyModal = (mode: 'add' | 'edit', faculty?: any) => {
    setFormError(''); setModalType('faculty'); setModalMode(mode);
    setFacultyFormData(mode === 'edit' ? { ...faculty, weekly_schedule: Array.isArray(faculty.weekly_schedule) ? faculty.weekly_schedule : [] } : { id: '', first_name: '', last_name: '', department: '', weekly_schedule: [], status: 'Active' });
    setIsModalOpen(true);
  };

  const addScheduleSlot = () => setFacultyFormData(prev => ({...prev, weekly_schedule: [...prev.weekly_schedule, { day: 'Monday', time: TIME_SLOTS[0], building: BUILDINGS[0], room: '' }]}));
  const updateScheduleSlot = (index: number, field: string, value: string) => {
    const updatedSchedule = [...facultyFormData.weekly_schedule];
    updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
    setFacultyFormData(prev => ({ ...prev, weekly_schedule: updatedSchedule }));
  };
  const removeScheduleSlot = (index: number) => setFacultyFormData(prev => ({ ...prev, weekly_schedule: facultyFormData.weekly_schedule.filter((_, i) => i !== index) }));

  const toggleBuildingAssignment = (bldg: string) => {
    setCheckerFormData(prev => {
        const currentBuildings = Array.isArray(prev.assigned_building) ? prev.assigned_building : [];
        if (currentBuildings.includes(bldg)) return { ...prev, assigned_building: currentBuildings.filter(b => b !== bldg) };
        return { ...prev, assigned_building: [...currentBuildings, bldg] };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const isChecker = modalType === 'checker';

    if (isChecker) {
        if (checkerFormData.assigned_building.length === 0) return setFormError("You must assign at least one building to the Checker.");
        if (modalMode === 'add' && checkerFormData.password.length < 6) return setFormError("Password must be at least 6 characters long.");
    }
    if (!isChecker) {
        const hasEmptyRoom = facultyFormData.weekly_schedule.some(slot => !slot.room.trim());
        if (hasEmptyRoom) return setFormError("All assigned schedule blocks must have a Room Number filled in.");
    }

    const url = modalMode === 'add' ? `https://capstone-backend-api-vh11.onrender.com/api/${isChecker ? 'checkers' : 'faculties'}` : `https://capstone-backend-api-vh11.onrender.com/api/${isChecker ? 'checkers' : 'faculties'}/${isChecker ? checkerFormData.id : facultyFormData.id}`;

    try {
      const response = await fetch(url, { method: modalMode === 'add' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isChecker ? checkerFormData : facultyFormData) });
      const data = await response.json();
      if (!data.success) { setFormError("Database Error: " + (data.details || data.error || "Unknown error")); return; }
      setIsModalOpen(false);
      isChecker ? fetchCheckers() : fetchFaculties();
    } catch (err) { setFormError("SERVER CONNECTION ERROR: Make sure backend is running."); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const response = await fetch('https://capstone-backend-api-vh11.onrender.com/api/faculties/import', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) { alert(data.message); fetchFaculties(); } else alert("Upload failed: " + data.error);
    } catch (err) { alert("Error uploading file"); }
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-brand-dark/50 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`absolute md:relative z-50 flex flex-col flex-shrink-0 w-64 h-full text-white transition-transform duration-300 ease-in-out shadow-xl bg-brand-dark ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-brand/30">
          <div>
              <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
              <p className="mt-1 text-xs text-white/70">Faculty Attendance System</p>
          </div>
          {/* Mobile close button inside sidebar */}
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {['Dashboard', 'Checkers', 'Faculty', 'Reports'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }} className={`flex items-center w-full gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${activeTab === tab ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'hover:bg-brand/20 text-white/80 hover:text-white'}`}>
               {tab === 'Dashboard' && <LayoutDashboard size={20} />}
               {tab === 'Checkers' && <Users size={20} />}
               {tab === 'Faculty' && <GraduationCap size={20} />}
               {tab === 'Reports' && <ClipboardList size={20} />}
               {tab === 'Checkers' ? 'Checkers Mgmt' : tab === 'Faculty' ? 'Faculty Mgmt' : tab === 'Reports' ? 'Attendance Logs' : tab}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand/30">
          <button onClick={() => navigate('/')} className="flex items-center w-full gap-3 px-4 py-3 text-red-300 transition-colors rounded-xl hover:bg-red-900/30 hover:text-red-200">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="relative flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
        
        {/* RESPONSIVE HEADER */}
        <header className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
              <button className="p-2 text-white rounded-lg md:hidden bg-brand" onClick={() => setIsSidebarOpen(true)}>
                  <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold sm:text-2xl md:text-3xl text-brand-dark">
                {activeTab === 'Checkers' ? 'Checkers Management' : activeTab === 'Faculty' ? 'Faculty Management' : activeTab === 'Reports' ? 'Submitted Attendance Logs' : activeTab}
              </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-4 py-2 text-sm font-semibold border rounded-full shadow-sm text-brand-dark bg-brand-light/20 border-brand-light/30">Admin Logged In</span>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col p-6 bg-white border shadow-sm border-brand-light/20 rounded-2xl"><span className="text-sm font-medium text-slate-500">Total Checkers</span><span className="mt-2 text-4xl font-bold text-brand-dark">{stats.total_checkers}</span></div>
              <div className="flex flex-col p-6 bg-white border shadow-sm border-brand-light/20 rounded-2xl"><span className="text-sm font-medium text-slate-500">Active Checkers</span><span className="mt-2 text-4xl font-bold text-brand">{stats.active_checkers}</span></div>
              <div className="flex flex-col p-6 bg-white border shadow-sm border-brand-light/20 rounded-2xl"><span className="text-sm font-medium text-slate-500">Total Faculties</span><span className="mt-2 text-4xl font-bold text-brand-dark">{stats.total_faculties}</span></div>
              <div className="flex flex-col p-6 bg-white border shadow-sm border-brand-light/20 rounded-2xl"><span className="text-sm font-medium text-slate-500">Active Faculties</span><span className="mt-2 text-4xl font-bold text-brand">{stats.active_faculties}</span></div>
            </div>
            <div className="w-full overflow-hidden bg-white border shadow-sm border-brand-light/20 rounded-2xl">
              <div className="flex items-center gap-2 px-6 py-5 border-b border-brand-light/20 bg-brand-bg/50"><Activity size={18} className="text-brand" /><h3 className="font-semibold text-brand-dark">Recent Activity</h3></div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="text-sm border-b border-brand-light/20 bg-brand-bg/80 text-slate-500"><th className="px-6 py-3 font-semibold text-brand-dark">User</th><th className="px-6 py-3 font-semibold text-brand-dark">Action</th><th className="px-6 py-3 font-semibold text-brand-dark">Role</th><th className="px-6 py-3 font-semibold text-brand-dark">Date & Time</th></tr></thead>
                  <tbody className="text-sm divide-y divide-brand-light/10 text-slate-700">
                    {activities.map((log) => (<tr key={log.id} className="transition-colors hover:bg-brand-light/5"><td className="px-6 py-4 font-medium">{log.user}</td><td className="px-6 py-4">{log.action}</td><td className="px-6 py-4">{log.role}</td><td className="px-6 py-4 text-slate-500">{new Date(log.created_at).toLocaleString()}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Checkers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border shadow-sm border-brand-light/20 rounded-2xl">
              <h2 className="text-lg font-semibold text-brand-dark">Manage Checkers</h2>
              <button onClick={() => openCheckerModal('add')} className="flex items-center w-full sm:w-auto justify-center gap-2 px-4 py-2 text-sm font-bold text-white transition-all shadow-md bg-brand rounded-xl hover:bg-brand-dark shadow-brand/20"><Plus size={18} /> Add New Checker</button>
            </div>
            <div className="w-full overflow-hidden bg-white border shadow-sm border-brand-light/20 rounded-2xl">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="text-sm border-b border-brand-light/20 bg-brand-bg/80 text-slate-500">
                        <th className="px-6 py-4 font-semibold text-brand-dark">ID</th>
                        <th className="px-6 py-4 font-semibold text-brand-dark">Name</th>
                        <th className="px-6 py-4 font-semibold text-brand-dark">Username</th>
                        <th className="px-6 py-4 font-semibold text-brand-dark">Assigned Buildings</th>
                        <th className="px-6 py-4 font-semibold text-brand-dark">Status</th>
                        <th className="px-6 py-4 font-semibold text-right text-brand-dark">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-brand-light/10 text-slate-700">
                    {checkers.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-brand-light/5">
                        <td className="px-6 py-4 text-slate-500">#{c.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{c.first_name} {c.last_name}</td>
                        <td className="px-6 py-4">{c.username}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                                {c.assigned_building && Array.isArray(c.assigned_building) && c.assigned_building.length > 0 
                                    ? c.assigned_building.map((b: string) => <span key={b} className="px-2 py-1 text-xs font-bold border rounded bg-brand-bg text-brand-dark border-brand-light/30">{b}</span>)
                                    : <span className="text-xs italic text-slate-400">None Assigned</span>
                                }
                            </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${c.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openCheckerModal('edit', c)} className="p-2 transition-colors border rounded-lg text-brand bg-brand-light/20 hover:bg-brand hover:text-white border-brand-light/30"><Edit size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Faculty' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 p-4 bg-white border shadow-sm border-brand-light/20 md:flex-row md:items-center md:justify-between rounded-2xl">
              <h2 className="text-lg font-semibold text-brand-dark">Manage Faculty</h2>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 transition-all border w-full sm:w-64 bg-brand-bg border-brand-light/30 rounded-xl focus-within:ring-2 focus-within:ring-brand focus-within:border-brand"><Search size={18} className="text-brand/50" /><input type="text" placeholder="Search faculty..." className="w-full text-sm bg-transparent border-none outline-none text-slate-700 placeholder-brand/50" value={facultySearch} onChange={(e) => setFacultySearch(e.target.value)} /></div>
                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm font-bold transition-all border text-brand-dark bg-brand-light/30 border-brand-light/50 rounded-xl hover:bg-brand-light/50 disabled:opacity-70">{isLoading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />} Import</button>
                    <button onClick={() => openFacultyModal('add')} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 text-sm font-bold text-white transition-all shadow-md bg-brand rounded-xl hover:bg-brand-dark shadow-brand/20"><Plus size={18} /> Add New</button>
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden bg-white border shadow-sm border-brand-light/20 rounded-2xl">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead><tr className="text-sm border-b border-brand-light/20 bg-brand-bg/80 text-slate-500"><th className="px-6 py-4 font-semibold text-brand-dark">ID</th><th className="px-6 py-4 font-semibold text-brand-dark">Name</th><th className="px-6 py-4 font-semibold text-brand-dark">Department</th><th className="px-6 py-4 font-semibold text-brand-dark">Scheduled Classes</th><th className="px-6 py-4 font-semibold text-brand-dark">Status</th><th className="px-6 py-4 font-semibold text-right text-brand-dark">Actions</th></tr></thead>
                  <tbody className="text-sm divide-y divide-brand-light/10 text-slate-700">
                    {filteredFaculties.map((f) => (
                      <tr key={f.id} className="transition-colors hover:bg-brand-light/5">
                        <td className="px-6 py-4 font-medium text-slate-500">#{f.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{f.first_name} {f.last_name}</td>
                        <td className="px-6 py-4">{f.department}</td>
                        <td className="px-6 py-4"><span className="font-bold text-brand">{Array.isArray(f.weekly_schedule) ? f.weekly_schedule.length : 0} Session(s) assigned</span></td>
                        <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${f.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{f.status}</span></td>
                        <td className="px-6 py-4 text-right"><button onClick={() => openFacultyModal('edit', f)} className="p-2 transition-colors border rounded-lg text-brand bg-brand-light/20 hover:bg-brand hover:text-white border-brand-light/30"><Edit size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Reports' && (
          <div className="space-y-6">
            <div className="w-full overflow-hidden bg-white border shadow-sm border-brand-light/20 rounded-2xl">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="text-sm border-b border-brand-light/20 bg-brand-bg/80 text-slate-500">
                      <th className="px-6 py-4 font-semibold text-brand-dark">Date Submitted</th>
                      <th className="px-6 py-4 font-semibold text-brand-dark">Checker Name</th>
                      <th className="px-6 py-4 font-semibold text-brand-dark">Building</th>
                      <th className="px-6 py-4 font-semibold text-brand-dark">Time Slot</th>
                      <th className="px-6 py-4 font-semibold text-right text-brand-dark">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-brand-light/10 text-slate-700">
                    {reports.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-brand-light/5">
                        <td className="px-6 py-4 font-bold text-brand-dark">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4">{r.checker_name}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{r.building}</td>
                        <td className="px-6 py-4"><span className="px-3 py-1 font-bold border rounded-lg bg-brand-bg border-brand-light/30 text-brand-dark">{r.schedule_time}</span></td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedReport(r)} className="flex items-center justify-center gap-2 px-4 py-2 ml-auto text-sm font-bold text-white transition-all shadow-md bg-brand rounded-xl hover:bg-brand-dark shadow-brand/20">
                              <Eye size={16} /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 font-medium text-center text-slate-400">No attendance reports have been submitted yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- ADD/EDIT MODAL (RESPONSIVE) --- */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-brand-dark/50">
          <div className="w-full max-w-3xl p-6 md:p-8 overflow-y-auto bg-white border shadow-2xl max-h-[95vh] rounded-2xl border-brand-light/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-brand-dark">
                {modalMode === 'add' ? `Add New ${modalType === 'checker' ? 'Checker' : 'Faculty'}` : `Edit ${modalType === 'checker' ? 'Checker' : 'Faculty'}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 transition-colors rounded-full text-slate-400 hover:text-brand-dark bg-brand-bg"><X size={24} /></button>
            </div>
            
            {formError && (
                <div className="flex items-center gap-3 p-4 mb-6 text-sm font-bold text-red-700 bg-red-100 border border-red-300 rounded-xl">
                    <AlertCircle size={20} className="flex-shrink-0" /> {formError}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block mb-2 text-sm font-bold text-brand-dark">First Name</label><input type="text" required pattern="[A-Za-z\s\-]*" title="Only letters and spaces are allowed" value={modalType === 'checker' ? checkerFormData.first_name : facultyFormData.first_name} onChange={e => modalType === 'checker' ? setCheckerFormData({...checkerFormData, first_name: e.target.value}) : setFacultyFormData({...facultyFormData, first_name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30" /></div>
                <div><label className="block mb-2 text-sm font-bold text-brand-dark">Last Name</label><input type="text" required pattern="[A-Za-z\s\-]*" title="Only letters and spaces are allowed" value={modalType === 'checker' ? checkerFormData.last_name : facultyFormData.last_name} onChange={e => modalType === 'checker' ? setCheckerFormData({...checkerFormData, last_name: e.target.value}) : setFacultyFormData({...facultyFormData, last_name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30" /></div>
              </div>

              {modalType === 'checker' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 text-sm font-bold text-brand-dark">Username (Letters/Numbers only)</label>
                        <input type="text" required pattern="[a-zA-Z0-9]*" title="Letters and numbers only. No spaces." minLength={4} value={checkerFormData.username} onChange={e => setCheckerFormData({...checkerFormData, username: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30" />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-bold text-brand-dark">Password {modalMode === 'edit' && <span className="text-xs font-normal text-slate-400">(Leave blank to keep)</span>}</label>
                        <input type={modalMode === 'add' ? 'text' : 'password'} required={modalMode === 'add'} minLength={6} value={checkerFormData.password} onChange={e => setCheckerFormData({...checkerFormData, password: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30" />
                    </div>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 p-4 border-2 border-brand-light/30 rounded-2xl bg-brand-bg/30">
                    <label className="block mb-3 text-sm font-bold text-brand-dark">Assign Buildings (Select multiple)</label>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {BUILDINGS.map(bldg => {
                            const isSelected = Array.isArray(checkerFormData.assigned_building) && checkerFormData.assigned_building.includes(bldg);
                            return (
                                <button key={bldg} type="button" onClick={() => toggleBuildingAssignment(bldg)} className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm md:px-4 border-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' : 'bg-white text-brand-dark/70 border-brand-light/30 hover:border-brand hover:text-brand'}`}>
                                    <Building2 size={16} />
                                    <span className="font-bold">{bldg}</span>
                                </button>
                            );
                        })}
                    </div>
                  </div>
                </>
              )}

              {modalType === 'faculty' && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-bold text-brand-dark">Department</label>
                    <input type="text" required pattern="[A-Za-z\s]*" title="Only letters and spaces are allowed" value={facultyFormData.department} onChange={e => setFacultyFormData({...facultyFormData, department: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30" />
                  </div>
                  
                  <div className="p-4 md:p-5 mt-6 border-2 border-brand-light/30 rounded-2xl bg-brand-bg/30">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                        <label className="text-sm font-bold text-brand-dark">Weekly Schedule Blocks</label>
                        <button type="button" onClick={addScheduleSlot} className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-white transition-colors bg-brand rounded-xl hover:bg-brand-dark shadow-md shadow-brand/20"><Plus size={16}/> Add Session</button>
                    </div>

                    <div className="space-y-3">
                        {facultyFormData.weekly_schedule.map((slot, index) => (
                            <div key={index} className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-3 bg-white border shadow-sm rounded-xl border-slate-200">
                                <select value={slot.day} onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)} className="w-full md:w-1/4 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand border-slate-200">
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={slot.time} onChange={(e) => updateScheduleSlot(index, 'time', e.target.value)} className="w-full md:w-1/3 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand border-slate-200">
                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={slot.building} onChange={(e) => updateScheduleSlot(index, 'building', e.target.value)} className="w-full md:w-1/4 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand border-slate-200">
                                    {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Room #" pattern="[A-Za-z0-9\-]*" title="Letters and numbers only" value={slot.room} onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)} className="flex-1 w-full md:w-20 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-brand border-slate-200" required />
                                    <button type="button" onClick={() => removeScheduleSlot(index)} className="p-2 text-red-500 transition-colors bg-red-100 rounded-lg hover:bg-red-200 shrink-0"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                        {facultyFormData.weekly_schedule.length === 0 && <p className="text-sm italic text-center text-slate-500">No schedule assigned. They will not appear on the Checker App.</p>}
                    </div>
                  </div>
                </>
              )}
              
              {modalMode === 'edit' && (
                <div>
                  <label className="block mb-2 text-sm font-bold text-brand-dark">Status</label>
                  <select value={modalType === 'checker' ? checkerFormData.status : facultyFormData.status} onChange={e => modalType === 'checker' ? setCheckerFormData({...checkerFormData, status: e.target.value}) : setFacultyFormData({...facultyFormData, status: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-brand-bg/30">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold transition-colors border text-brand-dark bg-brand-bg rounded-xl hover:bg-brand-light/20 border-brand-light/30">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-6 py-3 font-bold text-white transition-colors shadow-md bg-brand rounded-xl hover:bg-brand-dark shadow-brand/20">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-brand-dark/50">
          <div className="w-full max-w-4xl p-6 md:p-8 overflow-y-auto bg-white border shadow-2xl max-h-[90vh] rounded-2xl border-brand-light/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b gap-4 border-brand-light/20">
              <div>
                <h3 className="text-xl md:text-2xl font-bold uppercase text-brand-dark">Attendance Log Details</h3>
                <p className="mt-1 text-sm text-slate-500">Submitted on {new Date(selectedReport.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="self-end sm:self-auto p-2 transition-colors rounded-full text-slate-400 hover:text-brand-dark bg-brand-bg"><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 mb-8 border rounded-xl bg-brand-bg/50 border-brand-light/30">
                <div><span className="text-xs font-bold uppercase text-slate-500">Checker Name</span><p className="font-bold text-brand-dark">{selectedReport.checker_name}</p></div>
                <div><span className="text-xs font-bold uppercase text-slate-500">Building Location</span><p className="font-bold text-brand-dark">{selectedReport.building}</p></div>
                <div><span className="text-xs font-bold uppercase text-slate-500">Report Date</span><p className="font-bold text-brand-dark">{selectedReport.report_date}</p></div>
                <div><span className="text-xs font-bold uppercase text-slate-500">Time Slot</span><p className="font-bold text-brand-dark">{selectedReport.schedule_time}</p></div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                      <tr className="text-sm font-bold tracking-wider uppercase border-b bg-brand-bg/80 text-brand-dark border-brand-light/20">
                          <th className="px-4 py-3">Faculty Name</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Checker Remarks</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light/10 text-slate-700">
                      {(() => {
                          let recordsObj = {};
                          try { recordsObj = typeof selectedReport.records === 'string' ? JSON.parse(selectedReport.records) : selectedReport.records; } catch (e) {}
                          const entries = Object.entries(recordsObj);
                          if (entries.length === 0) return <tr><td colSpan={3} className="py-8 italic font-medium text-center text-slate-400">No faculties were checked in this report.</td></tr>;
                          return entries.map(([facultyId, data]: [string, any]) => {
                              const faculty = faculties.find(f => f.id.toString() === facultyId);
                              const name = faculty ? `${faculty.last_name}, ${faculty.first_name}`.toUpperCase() : `UNKNOWN FACULTY`;
                              let statusBadge = <span className="italic text-slate-400">Unmarked</span>;
                              if (data.present) statusBadge = <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 border border-green-200 rounded-full">PRESENT</span>;
                              else if (data.absent) statusBadge = <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded-full">ABSENT</span>;
                              else if (data.late) statusBadge = <span className="px-3 py-1 text-xs font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-full">LATE ({data.late})</span>;
                              return (
                                  <tr key={facultyId} className="transition-colors hover:bg-brand-light/5">
                                      <td className="px-4 py-4 font-bold text-brand-dark">{name}</td>
                                      <td className="px-4 py-4 text-center">{statusBadge}</td>
                                      <td className="px-4 py-4 text-sm font-medium text-slate-600">{data.remarks || '-'}</td>
                                  </tr>
                              );
                          });
                      })()}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}