import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Printer, Send, Camera, X, Building2, Clock, AlertCircle, Menu } from 'lucide-react';

interface LocationState { role: string; username: string; }

const TIME_SLOTS = [
  '07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', '09:30 AM - 10:30 AM', 
  '10:30 AM - 11:30 AM', '11:30 AM - 12:30 PM', '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM'
];

export default function CheckerPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const [myBuildings, setMyBuildings] = useState<string[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[0]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, { present: boolean; late: string; absent: boolean; remarks: string; photo: File | null }>>({});
  
  const [activeRemarksId, setActiveRemarksId] = useState<number | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');
  const [tempPhoto, setTempPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // NEW: Sidebar toggle for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const dateToday = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  const checkerName = state?.username || 'Assigned Checker';

  if (!state || !state.role || !state.role.startsWith('Checker')) return <Navigate to="/" />;

  useEffect(() => {
    Promise.all([
        fetch('https://capstone-backend-api-vh11.onrender.com/api/faculties').then(res => res.json()),
        fetch('https://capstone-backend-api-vh11.onrender.com/api/checkers').then(res => res.json())
    ]).then(([facultiesData, checkersData]) => {
        setFaculties(facultiesData.filter((f: any) => f.status === 'Active'));
        const myProfile = checkersData.find((c: any) => c.username === state.username);
        if (myProfile && Array.isArray(myProfile.assigned_building)) setMyBuildings(myProfile.assigned_building);
    }).catch(err => console.error(err));
  }, [state.username]);

  const currentDayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const displayedFaculties = faculties.filter(faculty => {
    if (!faculty.weekly_schedule || !Array.isArray(faculty.weekly_schedule)) return false;
    return faculty.weekly_schedule.some((slot: any) => 
      slot.day.toLowerCase() === currentDayOfWeek.toLowerCase() &&
      slot.building === selectedBuilding &&
      slot.time === selectedTime
    );
  });

  const sortedAllFaculties = [...faculties].sort((a, b) => {
    const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
    const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleLogout = () => navigate('/');

  const toggleAttendance = (id: number, field: 'present' | 'absent') => {
    setAttendance(prev => {
      const current = prev[id] || { present: false, late: '', absent: false, remarks: '', photo: null };
      if (current.late !== '' || current.remarks !== '') return prev;
      const newValue = !current[field];
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: newValue,
          ...(field === 'present' && newValue ? { absent: false } : {}),
          ...(field === 'absent' && newValue ? { present: false } : {})
        }
      };
    });
  };

  const updateLateTime = (id: number, value: string) => setAttendance(prev => ({...prev, [id]: { ...(prev[id] || { present: false, late: '', absent: false, remarks: '', photo: null }), late: value, present: false, absent: false }}));
  
  const openRemarksModal = (id: number) => { 
    setActiveRemarksId(id); 
    const current = attendance[id]; 
    setTempRemarks(current?.remarks || ''); 
    setTempPhoto(current?.photo || null); 
  };
  
  const saveRemarks = () => {
    if (!tempRemarks.trim() && !tempPhoto) {
        alert("Validation Error: Please type a reason or attach a photo evidence before saving.");
        return;
    }
    if (activeRemarksId !== null) {
      setAttendance(prev => ({...prev, [activeRemarksId]: { ...(prev[activeRemarksId] || { present: false, late: '', absent: false, remarks: '', photo: null }), remarks: tempRemarks, photo: tempPhoto, present: false, absent: false}}));
    }
    setActiveRemarksId(null);
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) setTempPhoto(e.target.files[0]); };

  const submitReport = async () => {
    if (Object.keys(attendance).length === 0) return alert("Validation Error: Please check the attendance of at least one faculty member before submitting the report.");
    setIsSubmitting(true);
    try {
      const payload = { checker_name: checkerName, building: selectedBuilding || 'Multiple', schedule_time: 'Daily Master Tally', report_date: dateToday, records: attendance };
      const response = await fetch('https://capstone-backend-api-vh11.onrender.com/api/reports/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) { alert("Daily Tally Report successfully submitted to Admin!"); setAttendance({}); } else { alert("Failed to submit report."); }
    } catch (err) { alert("Server error submitting report."); }
    setIsSubmitting(false);
  };

  // RESPONSIVE SIDEBAR COMPONENT
  const Sidebar = () => (
    <>
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-brand-dark/50 md:hidden backdrop-blur-sm print:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`absolute md:relative z-50 flex flex-col flex-shrink-0 w-64 h-full text-white transition-transform duration-300 ease-in-out shadow-2xl bg-brand-dark print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between p-6 border-b border-brand/30">
          <div>
            <h2 className="text-2xl font-bold text-white">Checker Panel</h2>
            <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium text-white/80">{checkerName}</p>
            </div>
          </div>
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {selectedBuilding && (
              <button onClick={() => {setSelectedBuilding(null); setIsSidebarOpen(false);}} className="flex items-center w-full gap-3 px-4 py-3 font-bold transition-all duration-300 bg-brand/20 text-white hover:bg-brand hover:text-white rounded-xl">
                  <Building2 size={20} /> Change Building
              </button>
          )}
        </nav>
        <div className="p-4 border-t border-brand/30">
          <button onClick={handleLogout} className="flex items-center w-full gap-3 px-4 py-3 text-red-300 transition-colors hover:bg-red-900/30 hover:text-red-200 rounded-xl">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
    </>
  );

  if (!selectedBuilding) {
    return (
      <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg">
        <Sidebar />
        <main className="flex flex-col items-center justify-center flex-1 p-6 md:p-10 overflow-y-auto">
          {/* Mobile Menu Button for Home Screen */}
          <button className="absolute top-6 left-6 p-2 text-white rounded-lg md:hidden bg-brand shadow-md" onClick={() => setIsSidebarOpen(true)}>
             <Menu size={24} />
          </button>

          <div className="mb-8 md:mb-12 mt-12 md:mt-0 text-center">
            <h1 className="mb-2 text-3xl md:text-4xl font-bold text-brand-dark">Start Your Rounds</h1>
            <p className="text-base md:text-lg text-brand-dark/60">Select your assigned building to begin.</p>
          </div>
          
          {myBuildings.length === 0 ? (
             <div className="p-6 md:p-8 text-center bg-red-50 border-2 border-red-200 rounded-2xl mx-4">
                 <h2 className="text-xl md:text-2xl font-bold text-red-700">No Buildings Assigned</h2>
                 <p className="mt-2 text-sm md:text-base text-red-600">Please contact the Administrator to get your building assignments.</p>
             </div>
          ) : (
            <div className="grid w-full max-w-5xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-8">
                {myBuildings.map(bldg => (
                <button key={bldg} onClick={() => setSelectedBuilding(bldg)} className="relative flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 overflow-hidden transition-all duration-500 bg-white border-2 shadow-lg group hover:bg-brand text-brand-dark hover:text-white rounded-3xl hover:shadow-2xl hover:shadow-brand/30 border-brand-light/20 hover:border-brand">
                    <div className="p-3 md:p-4 transition-colors duration-500 rounded-full bg-brand-bg group-hover:bg-white/20">
                        <Building2 size={32} className="md:w-10 md:h-10 transition-colors duration-500 text-brand group-hover:text-white" />
                    </div>
                    <span className="text-xl md:text-2xl font-bold">{bldg}</span>
                </button>
                ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg print:block print:h-auto print:bg-white">
      <Sidebar />
      <main className="flex flex-col flex-1 w-full h-full overflow-hidden p-4 sm:p-6 md:p-8 print:p-0 print:overflow-visible">
        
        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block pb-6 mb-6 border-b-4 border-black">
            <h1 className="text-3xl font-bold text-black uppercase">Official Attendance Report</h1>
            <div className="grid grid-cols-2 mt-4 text-black text-lg">
                <p><strong>Checker Name:</strong> {checkerName}</p>
                <p><strong>Date:</strong> {dateToday}</p>
                <p><strong>Location:</strong> {selectedBuilding}</p>
                <p><strong>Time Slot:</strong> {selectedTime}</p>
            </div>
        </div>

        {/* RESPONSIVE ON-SCREEN HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 p-5 md:p-6 mb-6 bg-white border shadow-sm rounded-2xl border-brand-light/20 print:hidden">
          <div className="flex items-start gap-3 w-full sm:w-auto">
            <button className="p-2 mt-1 text-white rounded-lg md:hidden bg-brand shrink-0" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
            </button>
            <div>
              <h1 className="mb-1 text-xs md:text-sm font-bold tracking-wider uppercase text-white/80">{dateToday}</h1>
              <h2 className="flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold text-brand-dark"><Building2 size={24} className="md:w-7 md:h-7 text-brand" />{selectedBuilding}</h2>
            </div>
          </div>
          <button onClick={() => window.print()} className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 md:px-6 py-3 text-sm md:text-base font-bold transition-all border rounded-xl bg-brand-bg text-brand-dark hover:bg-brand-light/20 border-brand-light/30">
            <Printer size={18} className="md:w-5 md:h-5" /> Print Daily Tally
          </button>
        </header>

        {/* HORIZONTALLY SCROLLABLE RIBBON */}
        <div className="mb-6 print:hidden">
            <div className="flex items-center gap-2 px-2 mb-3">
                <Clock size={18} className="text-brand" /><span className="text-sm font-bold text-brand-dark">Select Time Slot</span>
            </div>
            <div className="flex gap-2 md:gap-3 px-2 pb-4 overflow-x-auto scrollbar-hide snap-x">
            {TIME_SLOTS.map(time => {
                const [startTime, endTime] = time.split(' - ');
                return (
                  <button key={time} onClick={() => setSelectedTime(time)} className={`snap-start whitespace-nowrap px-4 py-2 md:px-5 md:py-2 rounded-xl text-xs md:text-sm font-bold border-2 transition-all shadow-sm flex flex-col items-center justify-center shrink-0 ${selectedTime === time ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' : 'bg-white text-brand-dark/70 border-brand-light/20 hover:border-brand hover:text-brand'}`}>
                  <span>{startTime}</span><span>{endTime}</span>
                  </button>
                );
            })}
            </div>
        </div>

        {/* RESPONSIVE TABLE WRAPPER */}
        <div className="flex flex-col flex-1 overflow-hidden bg-white border shadow-sm rounded-2xl border-brand-light/20 print:border-none print:shadow-none">
          <div className="flex-1 w-full overflow-auto print:overflow-visible">
            <table className="w-full text-left border-collapse min-w-[800px] print:min-w-full print:text-sm">
                <thead className="sticky top-0 z-10 print:static">
                <tr className="text-xs md:text-sm uppercase border-b shadow-sm bg-brand-bg/95 backdrop-blur-md text-brand-dark border-brand-light/20 print:bg-transparent print:border-black print:text-black">
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold print:px-2">Faculty Name</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold text-center print:px-2">Room</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold text-center text-green-600 print:text-black print:px-2">Present</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold text-center text-orange-500 print:text-black print:px-2">Late (Time)</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold text-center text-red-500 print:text-black print:px-2">Absent</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 font-bold text-center text-brand print:text-black print:px-2">Remarks</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-brand-light/10 print:divide-gray-300">
                {displayedFaculties.map((faculty) => {
                    const fullName = `${faculty.last_name}, ${faculty.first_name}`.toUpperCase();
                    const record = attendance[faculty.id] || { present: false, late: '', absent: false, remarks: '' };
                    const isLocked = record.late !== '' || record.remarks !== '';

                    return (
                    <tr key={faculty.id} className="transition-colors hover:bg-brand-bg/50">
                        <td className="px-4 md:px-6 py-4 md:py-5 text-sm md:text-lg font-bold text-brand-dark print:text-black print:px-2">{fullName}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-sm md:text-lg font-bold text-center text-brand-dark/70 print:text-black print:px-2">{faculty.room || 'TBA'}</td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                            <label className={`relative inline-flex items-center justify-center ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input type="checkbox" disabled={isLocked} className="sr-only peer" checked={record.present} onChange={() => toggleAttendance(faculty.id, 'present')} />
                                <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 transition-all bg-gray-100 border-2 border-gray-300 rounded-lg shadow-sm peer-checked:bg-green-500 peer-checked:border-green-500 print:border-black print:bg-white print:peer-checked:bg-black">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white transition-opacity opacity-0 peer-checked:opacity-100 print:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </label>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                            <div className="print:hidden"><input type="time" className="p-1 md:p-2 text-sm md:text-lg font-bold text-center bg-white border-2 border-gray-300 shadow-sm w-28 md:w-36 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-brand-dark" value={record.late} onChange={(e) => updateLateTime(faculty.id, e.target.value)} /></div>
                            <span className="hidden font-bold print:block">{record.late || '-'}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                            <label className={`relative inline-flex items-center justify-center ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                <input type="checkbox" disabled={isLocked} className="sr-only peer" checked={record.absent} onChange={() => toggleAttendance(faculty.id, 'absent')} />
                                <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 transition-all bg-gray-100 border-2 border-gray-300 rounded-lg shadow-sm peer-checked:bg-red-500 peer-checked:border-red-500 print:border-black print:bg-white print:peer-checked:bg-black">
                                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white transition-opacity opacity-0 peer-checked:opacity-100 print:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </div>
                            </label>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                            <button onClick={() => openRemarksModal(faculty.id)} className={`print:hidden px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold border-2 rounded-lg transition-all shadow-sm whitespace-nowrap ${record.remarks ? 'bg-brand text-white border-brand' : 'bg-white border-brand-light/30 text-brand hover:bg-brand/10'}`}>
                                {record.remarks ? '✓ VIEW/EDIT' : '+ ADD'}
                            </button>
                            <span className="hidden text-xs print:block">{record.remarks || '-'}</span>
                        </td>
                    </tr>
                    );
                })}
                {displayedFaculties.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 font-medium text-center text-slate-400 print:text-black">No faculties are scheduled for this building during this time slot today.</td></tr>
                )}
                </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-4 md:mt-6 print:hidden">
          <button onClick={submitReport} disabled={isSubmitting} className="flex items-center justify-center w-full sm:w-auto gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 text-base md:text-xl font-bold text-white transition-all shadow-lg bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand rounded-2xl shadow-brand/30 hover:scale-105 active:scale-95 disabled:opacity-50">
             {isSubmitting ? 'SUBMITTING...' : 'SUBMIT TALLY'} <Send size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
      </main>

      {/* --- FINANCE PRINT-ONLY VIEW (Hidden on screen) --- */}
      <div className="hidden print:block w-full h-auto p-8 text-black bg-white">
        <table className="w-full text-left border-collapse border border-gray-400 mt-6">
            <thead>
                <tr className="bg-gray-200 text-sm uppercase">
                    <th className="p-3 border border-gray-400 font-bold">Faculty Name</th>
                    <th className="p-3 border border-gray-400 font-bold">Schedule & Location</th>
                    <th className="p-3 border border-gray-400 font-bold text-center">Recorded Status</th>
                    <th className="p-3 border border-gray-400 font-bold">Checker Remarks</th>
                </tr>
            </thead>
            <tbody>
                {sortedAllFaculties.map(faculty => {
                    const record = attendance[faculty.id];
                    let status = "UNMARKED"; let statusColor = "text-gray-400 italic"; 
                    if (record) {
                        if (record.present) { status = "PRESENT"; statusColor = "text-green-700 font-bold"; }
                        else if (record.absent) { status = "ABSENT"; statusColor = "text-red-700 font-bold"; }
                        else if (record.late !== '') { status = `LATE (${record.late})`; statusColor = "text-orange-600 font-bold"; }
                    }
                    return (
                        <tr key={faculty.id} className="border-b border-gray-400">
                            <td className="p-3 border border-gray-400 font-bold uppercase">{faculty.last_name}, {faculty.first_name}</td>
                            <td className="p-3 border border-gray-400 text-sm"><div className="font-bold">{faculty.schedule_time}</div><div className="text-gray-600">{faculty.building} - Rm {faculty.room}</div></td>
                            <td className={`p-3 border border-gray-400 text-center ${statusColor}`}>{status}</td>
                            <td className="p-3 border border-gray-400 text-sm">{record?.remarks || '-'}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        <div className="flex justify-between px-16 mt-24">
            <div className="text-center"><div className="w-64 mb-2 border-b border-black"></div><p className="font-bold uppercase text-lg">{checkerName}</p><p className="text-gray-600">Assigned Checker Signature</p></div>
            <div className="text-center"><div className="w-64 mb-2 border-b border-black"></div><p className="font-bold uppercase text-lg">Finance Office</p><p className="text-gray-600">Received By / Date</p></div>
        </div>
      </div>

      {/* --- REMARKS MODAL --- */}
      {activeRemarksId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-brand-dark/60 print:hidden">
          <div className="relative w-full max-w-lg p-6 md:p-8 bg-white border shadow-2xl rounded-3xl border-brand-light/20">
            <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="flex items-center gap-2 text-xl md:text-2xl font-bold uppercase text-brand-dark"><Camera size={24} className="text-brand" /> Add Remarks</h3>
                <button onClick={() => setActiveRemarksId(null)} className="p-2 transition-colors rounded-full text-slate-400 hover:text-brand-dark bg-brand-bg"><X size={24} /></button>
            </div>
            <p className="mb-2 text-xs md:text-sm font-medium text-brand-dark/60">A text reason or photo evidence is required.</p>
            <textarea rows={4} placeholder="Type reason..." value={tempRemarks} onChange={(e) => setTempRemarks(e.target.value)} className="w-full p-3 md:p-4 mb-4 md:mb-6 text-base md:text-lg font-medium leading-relaxed border-2 outline-none border-brand-light/30 rounded-2xl focus:border-brand focus:ring-0 resize-none text-brand-dark bg-brand-bg/30" />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
            <div className="flex flex-col gap-3 md:gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition-all border-2 border-dashed rounded-2xl shadow-sm bg-brand-bg text-brand-dark border-brand-light/40 hover:bg-brand-light/10 hover:border-brand"><Camera size={20} className="md:w-5 md:h-5" /> {tempPhoto ? `Photo: ${tempPhoto.name.substring(0,10)}...` : 'Attach Photo'}</button>
                <button onClick={saveRemarks} className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white transition-all shadow-lg bg-brand hover:bg-brand-dark rounded-2xl shadow-brand/20">Save Remarks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}