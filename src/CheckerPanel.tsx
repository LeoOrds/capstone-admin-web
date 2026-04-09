import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Printer, Send, Camera, X, Building2, Clock, Menu, ClipboardList, ChevronDown, ChevronUp, Save, AlertCircle } from 'lucide-react';

import logo from './assets/logo1.jpg';

const TIME_SLOTS = [
  '07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', '09:30 AM - 10:30 AM',
  '10:30 AM - 11:30 AM', '11:30 AM - 12:30 PM', '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM'
];

const timeToMinutes = (timeStr: string) => {
  try {
    const cleanStr = timeStr.toUpperCase().replace(/\s/g, ''); 
    const isPM = cleanStr.includes('PM');
    const isAM = cleanStr.includes('AM');
    const timePart = cleanStr.replace('AM', '').replace('PM', ''); 
    
    let [hours, minutes] = timePart.split(':');
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (isNaN(h) || isNaN(m)) return 0;
    if (h === 12 && isAM) h = 0;
    if (h < 12 && isPM) h += 12;
    return h * 60 + m;
  } catch (e) { return 0; }
};

const isTimeOverlap = (selectedSlot: string, facultySlot: string) => {
  try {
    const [sStartStr] = selectedSlot.split(/-|–/).map(s => s.trim());
    const [fStartStr, fEndStr] = facultySlot.split(/-|–/).map(s => s.trim());

    const selectedStart = timeToMinutes(sStartStr);
    const facultyStart = timeToMinutes(fStartStr);
    const facultyEnd = timeToMinutes(fEndStr || fStartStr);

    if (selectedStart === 0 || facultyStart === 0) return false;

    return (selectedStart >= facultyStart && selectedStart < facultyEnd);
  } catch (e) { return false; }
};

export default function CheckerPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | number | null>(null);

  const userRole = sessionStorage.getItem('userRole');
  const sessionUsername = sessionStorage.getItem('username');
  const navigate = useNavigate();

  const [myBuildings, setMyBuildings] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBuilding = searchParams.get('bldg');
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[0]);
  const [faculties, setFaculties] = useState<any[]>([]);
  
  const [isTallySaved, setIsTallySaved] = useState(false);

  const dateToday = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  const draftKey = `checker_draft_${sessionUsername}_${dateToday.replace(/[\s,]+/g, '_')}`;

  const [attendance, setAttendance] = useState<Record<string, { present: boolean; late: string; absent: boolean; remarks: string; photo: File | null }>>(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try { return JSON.parse(savedDraft); } catch (e) { return {}; }
    }
    return {};
  });

  useEffect(() => {
    const safeToSave = Object.keys(attendance).reduce((acc, key) => {
      const { photo, ...rest } = attendance[key];
      acc[key] = { ...rest, photo: null };
      return acc;
    }, {} as any);
    
    localStorage.setItem(draftKey, JSON.stringify(safeToSave));
  }, [attendance, draftKey]);

  const [activeRemarksId, setActiveRemarksId] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');
  const [tempPhoto, setTempPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!userRole || !userRole.startsWith('Checker')) return <Navigate to="/" />;
  const checkerName = sessionUsername || 'Assigned Checker';

  const fetchReports = () => {
    fetch(`https://capstone-backend-api-vh11.onrender.com/api/reports?t=${Date.now()}`)
      .then(res => res.json())
      .then(reportsData => {
        if (Array.isArray(reportsData)) setReports(reportsData.filter(r => r.checker_name === checkerName));
      }).catch(err => console.error(err));
  };

  useEffect(() => {
    const cacheBuster = `?t=${Date.now()}`;
    
    const fetchCloudDraft = async () => {
      try {
        const response = await fetch(`https://capstone-backend-api-vh11.onrender.com/api/drafts/${checkerName}/${dateToday.replace(/[\s,]+/g, '_')}`);
        const data = await response.json();
        if (data.success && Object.keys(data.draft).length > 0) {
          setAttendance(prev => ({ ...prev, ...data.draft })); 
        }
      } catch (err) { console.log("Could not fetch cloud draft"); }
    };
    
    fetchCloudDraft();
    fetchReports();

    Promise.all([
      fetch(`https://capstone-backend-api-vh11.onrender.com/api/faculties${cacheBuster}`).then(res => res.json()),
      fetch(`https://capstone-backend-api-vh11.onrender.com/api/checkers${cacheBuster}`).then(res => res.json())
    ]).then(([facultiesData, checkersData]) => {
      setFaculties(facultiesData.filter((f: any) => f.status === 'Active'));
      const myProfile = checkersData.find((c: any) => c.username === sessionUsername);
      if (myProfile && Array.isArray(myProfile.assigned_building)) setMyBuildings(myProfile.assigned_building);
    }).catch(err => console.error(err));

  }, [sessionUsername, checkerName]);

  const currentDayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const expectedChecks = faculties.reduce((total, faculty) => {
    if (!faculty.weekly_schedule || !Array.isArray(faculty.weekly_schedule)) return total;
    const todaysAssignedSlots = faculty.weekly_schedule.filter((slot: any) =>
      String(slot.day).trim().toLowerCase() === String(currentDayOfWeek).trim().toLowerCase() &&
      myBuildings.includes(slot.building)
    );
    return total + todaysAssignedSlots.length;
  }, 0);

  const completedChecks = Object.values(attendance).filter(record =>
    record.present || record.absent || record.late !== '' || record.remarks !== ''
  ).length;

  const isAllBuildingsChecked = expectedChecks > 0 && completedChecks >= expectedChecks;

  const displayedFaculties = faculties.filter(faculty => {
    if (!faculty.weekly_schedule || !Array.isArray(faculty.weekly_schedule)) return false;
    return faculty.weekly_schedule.some((slot: any) =>
      String(slot.day).trim().toLowerCase() === String(currentDayOfWeek).trim().toLowerCase() &&
      String(slot.building).trim().toLowerCase() === String(selectedBuilding).trim().toLowerCase() &&
      isTimeOverlap(selectedTime, slot.time)
    );
  }).sort((a, b) => {
    const slotA = a.weekly_schedule.find((s: any) => s.day.toLowerCase() === currentDayOfWeek.toLowerCase() && s.building === selectedBuilding && isTimeOverlap(selectedTime, s.time));
    const slotB = b.weekly_schedule.find((s: any) => s.day.toLowerCase() === currentDayOfWeek.toLowerCase() && s.building === selectedBuilding && isTimeOverlap(selectedTime, s.time));

    const keyA = slotA ? `${a.id}-${slotA.time}` : String(a.id);
    const keyB = slotB ? `${b.id}-${slotB.time}` : String(b.id);

    const recA = attendance[keyA];
    const recB = attendance[keyB];
    const isCheckedA = recA && (recA.present || recA.absent || recA.late !== '' || recA.remarks !== '');
    const isCheckedB = recB && (recB.present || recB.absent || recB.late !== '' || recB.remarks !== '');

    if (isCheckedA && !isCheckedB) return 1;
    if (!isCheckedA && isCheckedB) return -1;
    return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
  });

  const handleLogout = () => {
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  const toggleAttendance = (sessionKey: string, field: 'present' | 'absent') => {
    const currentStatus = attendance[sessionKey];
    const isAlreadyMarked = currentStatus && (currentStatus.present || currentStatus.absent || currentStatus.late !== '' || currentStatus.remarks !== '');

    if (isAlreadyMarked) {
      const confirmChange = window.confirm("Are you Sure to Change the Marked checked on this faculty?");
      if (!confirmChange) return;
    }

    setIsTallySaved(false); 

    setAttendance(prev => {
      const current = prev[sessionKey] || { present: false, late: '', absent: false, remarks: '', photo: null };
      const newValue = !current[field];
      return {
        ...prev,
        [sessionKey]: {
          ...current,
          [field]: newValue,
          ...(newValue ? {
            ...(field === 'present' ? { absent: false, late: '', remarks: '', photo: null } : {}),
            ...(field === 'absent' ? { present: false, late: '', remarks: '', photo: null } : {})
          } : {})
        }
      };
    });
  };

  const updateLateTime = (sessionKey: string, value: string) => {
    const currentStatus = attendance[sessionKey];
    const isAlreadyMarked = currentStatus && (currentStatus.present || currentStatus.absent || currentStatus.late !== '' || currentStatus.remarks !== '');

    if (isAlreadyMarked && currentStatus.late !== value) {
      const confirmChange = window.confirm("Are you Sure to Change the Marked checked on this faculty?");
      if (!confirmChange) return;
    }

    setIsTallySaved(false); 

    setAttendance(prev => ({
      ...prev,
      [sessionKey]: {
        ...(prev[sessionKey] || { present: false, late: '', absent: false, remarks: '', photo: null }),
        late: value,
        present: false, 
        absent: false,
        remarks: '',
        photo: null
      }
    }));
  };

  const saveRemarks = () => {
    if (!tempRemarks.trim() && !tempPhoto) {
      alert("Validation Error: Please type a reason or attach a photo evidence before saving.");
      return;
    }

    if (activeRemarksId !== null) {
      const sessionKey = activeRemarksId;
      const currentStatus = attendance[sessionKey];
      const isAlreadyMarked = currentStatus && (currentStatus.present || currentStatus.absent || currentStatus.late !== '' || currentStatus.remarks !== '');

      if (isAlreadyMarked && (currentStatus.remarks !== tempRemarks || currentStatus.photo !== tempPhoto)) {
        const confirmChange = window.confirm("Are you Sure to Change the Marked checked on this faculty?");
        if (!confirmChange) return;
      }

      setIsTallySaved(false);

      setAttendance(prev => ({
        ...prev,
        [sessionKey]: {
          ...(prev[sessionKey] || { present: false, late: '', absent: false, remarks: '', photo: null }),
          remarks: tempRemarks,
          photo: tempPhoto,
          present: false, 
          absent: false,
          late: ''
        }
      }));
    }
    setActiveRemarksId(null);
  };

  const openRemarksModal = (sessionKey: string) => {
    setActiveRemarksId(sessionKey);
    const current = attendance[sessionKey];
    setTempRemarks(current?.remarks || '');
    setTempPhoto(current?.photo || null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) setTempPhoto(e.target.files[0]); };

  const handleSaveToRecords = async () => {
    if (!isAllBuildingsChecked) {
      return alert(`Action Denied: You have only checked ${completedChecks} out of ${expectedChecks} assigned faculty sessions across your buildings today. Please complete all buildings before generating a tally record.`);
    }
    
    try {
      const payload = { checker_name: checkerName, report_date: dateToday.replace(/[\s,]+/g, '_'), records: attendance };
      await fetch('https://capstone-backend-api-vh11.onrender.com/api/drafts/save', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
      });
      setIsTallySaved(true);
    } catch (err) { console.error("Failed to sync to cloud", err); }

    setSearchParams({ view: 'records' });
    setExpandedReportId('pending-draft'); 
  };

  const submitFinalToAdmin = async (recordsToSubmit: any) => {
    const confirmSubmit = window.confirm("Are you sure you are done checking all buildings for today? This will officially send your report to the Administrator.");
    if (!confirmSubmit) return;

    setIsSubmitting(true);
    try {
      const payload = { checker_name: checkerName, building: 'Multiple', schedule_time: 'Daily Master Tally', report_date: dateToday, draft_key: dateToday.replace(/[\s,]+/g, '_'), records: recordsToSubmit };
      const response = await fetch('https://capstone-backend-api-vh11.onrender.com/api/reports/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) { 
        alert("Daily Tally Report successfully submitted to Admin!");
        setAttendance({}); 
        localStorage.removeItem(draftKey); 
        fetchReports(); 
      } else { 
        alert("Failed to submit report.");
      }
    } catch (err) { 
      alert("Server error submitting report."); 
    }
    setIsSubmitting(false);
  };

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
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {(selectedBuilding || searchParams.get('view') === 'records') && (
            <button
              onClick={() => { setSearchParams({}); setIsSidebarOpen(false); }}
              className="flex items-center w-full gap-3 px-4 py-3 font-bold transition-all duration-300 bg-white text-brand shadow-lg rounded-xl hover:bg-slate-100"
            >
              <Building2 size={20} /> Back to Buildings
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

  if (searchParams.get('view') === 'records') {
    const pendingDraft = Object.keys(attendance).length > 0 ? [{
      id: 'pending-draft',
      report_date: dateToday,
      checker_name: checkerName,
      records: attendance,
      isPending: true
    }] : [];

    const allReportsDisplay = [...pendingDraft, ...reports];

    return (
      <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg print:h-auto print:bg-white print:block">
        
        {/* --- PRINTER SETTINGS & WATERMARK CSS --- */}
        <style type="text/css">
          {`
            @media print {
              @page { size: landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              
              /* Locks the watermark to the center of every printed page */
              .print-watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 0;
                /* Adjust this number (0.1 to 1.0) to change the transparency. 
                   0.15 is highly recommended so text stays readable! */
                opacity: 0.15; 
                pointer-events: none;
              }
            }
          `}
        </style>

        {/* --- GLOBAL & PRINT BACKGROUND WATERMARK --- */}
        <img 
          src={logo} 
          alt="Watermark" 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] opacity-10 pointer-events-none z-0 fams-logo-purple print:block print:opacity-15 print:grayscale-0" 
        />

        <Sidebar />
        <main className="flex-1 w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 print:p-0 print:overflow-visible relative z-10">
          <header className="flex items-center gap-4 mb-6 md:mb-8 print:hidden">
            <button className="p-2 text-white rounded-lg md:hidden bg-brand shadow-md" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-brand-dark">Faculty Attendance Record</h1>
              <p className="text-slate-500">View your submitted tally reports.</p>
            </div>
          </header>

          <div className="p-6 mb-8 bg-white/90 backdrop-blur-sm border shadow-sm border-brand-light/30 rounded-2xl print:hidden">
            <p className="font-bold text-brand-dark">Checked Faculties from the 1st day to the 15th day, and 16th to the 20th day of the month</p>
            <p className="mt-2 text-slate-500">Days cover for example: <span className="font-semibold text-brand">"March 1 to March 15"</span></p>
          </div>

          <div className="space-y-4 print:space-y-0">
            {allReportsDisplay.map((report: any) => {
              const isExpanded = expandedReportId === report.id;
              let parsedRecords: any = {};
              try { parsedRecords = typeof report.records === 'string' ? JSON.parse(report.records) : report.records; } catch (e) { }
              const uniqueFacultyIds = Array.from(new Set(Object.keys(parsedRecords).map(key => key.split('-')[0])));

              return (
                <div key={report.id} className={`overflow-hidden bg-white/90 backdrop-blur-sm border shadow-sm rounded-2xl ${report.isPending ? 'border-orange-300 ring-2 ring-orange-100' : 'border-brand-light/30'} ${!isExpanded ? 'print:hidden' : 'print:block print:border-none print:shadow-none print:mb-8 print:bg-transparent'}`}>
                  
                  <button onClick={() => setExpandedReportId(isExpanded ? null : report.id)} className={`flex items-center justify-between w-full p-4 md:p-6 text-left transition-colors print:hidden ${report.isPending ? 'bg-orange-50 hover:bg-orange-100/50' : 'hover:bg-brand-light/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold tracking-wider uppercase text-brand-dark">
                        Faculty Attendance Record - {report.report_date}
                      </span>
                      {report.isPending && (
                        <span className="bg-orange-100 text-orange-600 text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1 font-bold rounded-full border border-orange-200 shadow-sm animate-pulse">
                          DRAFT (NOT SUBMITTED)
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className={report.isPending ? "text-orange-500" : "text-brand"} /> : <ChevronDown className="text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 md:p-6 print:p-0 print:border-none print:bg-transparent overflow-hidden">
                      <div className="hidden print:block pb-4 mb-4 border-b-2 border-black">
                         <h2 className="text-2xl font-bold uppercase text-black">Faculty Attendance Record</h2>
                         <p className="text-lg text-black mt-1">{report.report_date}</p>
                         <p className="text-md text-gray-600">Submitted by: {report.checker_name}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-3 mb-4 print:hidden">
                        {report.isPending ? (
                          <button onClick={() => submitFinalToAdmin(report.records)} disabled={isSubmitting} className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm md:text-base font-bold text-white transition-all rounded-xl shadow-lg bg-green-600 hover:bg-green-700 hover:shadow-green-600/30 hover:-translate-y-0.5 disabled:opacity-50">
                            <Send size={18} /> {isSubmitting ? 'SENDING...' : '🚀 SUBMIT FINAL TO ADMIN'}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm md:text-base font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl select-none">
                            ✅ Officially Submitted
                          </div>
                        )}
                        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-brand-dark bg-white border-2 border-brand-light/30 transition-all rounded-xl shadow-sm hover:border-brand hover:text-brand hover:bg-brand-light/5">
                          <Printer size={18} /> Print Report
                        </button>
                      </div>

                      <div className="overflow-x-auto pb-4 custom-scrollbar print:overflow-visible print:pb-0">
                        {/* Ensure table background is transparent for print so watermark shows */}
                        <table className="w-full text-left border-collapse min-w-[1200px] print:w-full print:min-w-full print:text-[9px] print:bg-transparent">
                          <thead>
                            <tr className={`text-[10px] md:text-xs font-bold tracking-tight uppercase border-b border-slate-200 text-brand-dark print:bg-transparent print:text-black print:border-black ${report.isPending ? 'bg-orange-100/30' : 'bg-brand-light/10'}`}>
                              <th className={`px-4 py-4 border-r border-slate-200 w-56 sticky left-0 z-20 print:static print:w-auto print:bg-transparent print:border-gray-400 print:p-2 ${report.isPending ? 'bg-orange-50' : 'bg-brand-light/10'}`}>FACULTY NAME</th>
                              {TIME_SLOTS.map(timeColumn => {
                                const [startTime, endTime] = timeColumn.split(' - ');
                                return (
                                  <th key={timeColumn} className="px-1 py-2 md:px-2 md:py-4 text-center border-r border-slate-200 print:border-gray-400 print:p-1">
                                    <div className="flex flex-col items-center justify-center text-[9px] md:text-[10px] print:text-[8px] leading-tight font-bold">
                                      <span>{startTime.replace(' AM','AM').replace(' PM','PM')}</span>
                                      <span className="text-[8px] print:hidden my-0.5">-</span>
                                      <span>{endTime.replace(' AM','AM').replace(' PM','PM')}</span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm print:divide-gray-300 print:bg-transparent">
                            {uniqueFacultyIds.length === 0 && <tr><td colSpan={TIME_SLOTS.length + 1} className="p-6 text-center text-slate-400">No records found.</td></tr>}
                            {uniqueFacultyIds.map(facultyId => {
                              const faculty = faculties.find(f => String(f.id) === String(facultyId));
                              const name = faculty ? `${faculty.last_name}, ${faculty.first_name}`.toUpperCase() : `ID: ${facultyId}`;
                              return (
                                <tr key={facultyId} className="hover:bg-brand-light/10 print:bg-transparent group">
                                  <td className="px-4 py-3 font-bold border-r border-slate-200 text-brand-dark sticky left-0 z-10 bg-white/95 group-hover:bg-slate-50/95 print:static print:text-black print:border-gray-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] print:shadow-none transition-colors print:p-2 print:bg-transparent">
                                    {name}
                                  </td>
                                  {TIME_SLOTS.map(timeColumn => {
                                    let record = null;
                                    const matchingKeys = Object.keys(parsedRecords).filter(k => k.startsWith(`${facultyId}-`) || k === String(facultyId));
                                    for (const key of matchingKeys) {
                                      if (key === String(facultyId)) { record = parsedRecords[key]; break; }
                                      const savedTimeStr = key.replace(`${facultyId}-`, '');
                                      if (isTimeOverlap(timeColumn, savedTimeStr) || timeColumn.replace(/\s/g,'') === savedTimeStr.replace(/\s/g,'')) {
                                        record = parsedRecords[key]; break;
                                      }
                                    }
                                    let statusDisplay = <span className="text-slate-300 print:text-gray-400">-</span>;
                                    if (record && (record.present || record.absent || record.late || record.remarks)) {
                                      statusDisplay = (
                                        <div className="flex flex-col items-center justify-center gap-1 py-1 print:gap-0.5">
                                          {record.present && <span className="font-bold text-green-600 print:text-black">P</span>}
                                          {record.absent && <span className="font-bold text-red-500 print:text-black">A</span>}
                                          {record.late && <span className="font-bold text-[10px] md:text-xs text-orange-500 print:text-black print:text-[10px] whitespace-nowrap">L ({record.late})</span>}
                                          {record.remarks && (
                                            <span className="inline-block text-[9px] md:text-[10px] print:text-[9px] text-slate-600 print:text-black bg-slate-100 print:bg-transparent border border-slate-200 print:border-none rounded px-1.5 py-0.5 w-full max-w-[80px] md:max-w-[100px] print:max-w-none whitespace-normal break-words leading-tight shadow-sm print:shadow-none print:p-0">
                                              {record.remarks}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }
                                    return <td key={timeColumn} className="px-1 py-2 md:px-2 md:py-3 text-center align-middle border-r border-slate-100 print:border-gray-400 print:p-1 min-w-[60px] md:min-w-[100px] print:min-w-0 print:bg-transparent">{statusDisplay}</td>;
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {allReportsDisplay.length === 0 && <div className="p-12 text-center border-2 border-dashed rounded-2xl border-slate-200 text-slate-400 print:hidden">No tallies yet.</div>}
          </div>
        </main>
      </div>
    );
  }

  if (!selectedBuilding) {
    return (
      <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg">
        {/* --- GLOBAL BACKGROUND WATERMARK --- */}
        <img 
          src={logo} 
          alt="Watermark" 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] opacity-10 pointer-events-none z-0 fams-logo-purple" 
        />
        <Sidebar />
        <main className="relative z-10 flex flex-col items-center justify-center flex-1 p-6 md:p-10 overflow-y-auto">
          <button className="absolute top-6 left-6 p-2 text-white rounded-lg md:hidden bg-brand shadow-md" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
          <div className="mb-8 md:mb-12 mt-12 md:mt-0 text-center">
            <p className="mb-3 text-sm md:text-base font-bold tracking-widest uppercase text-brand">{dateToday}</p>
            <h1 className="mb-2 text-3xl md:text-4xl font-bold text-brand-dark">Start Your Rounds</h1>
            <p className="text-base md:text-lg text-brand-dark/60">Select your assigned building to begin.</p>
          </div>
          {myBuildings.length === 0 ? (
            <div className="p-6 md:p-8 text-center bg-red-50 border-2 border-red-200 rounded-2xl mx-4"><h2 className="text-xl md:text-2xl font-bold text-red-700">No Buildings Assigned</h2></div>
          ) : (
            <div className="grid w-full max-w-5xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-8">
              {myBuildings.map(bldg => (
                <button key={bldg} onClick={() => setSearchParams({ bldg })} className="relative flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-8 overflow-hidden transition-all duration-500 bg-white/90 backdrop-blur-sm border-2 shadow-lg group hover:bg-brand text-brand-dark hover:text-white rounded-3xl hover:shadow-2xl hover:shadow-brand/30 border-brand-light/20 hover:border-brand">
                  <div className="p-3 md:p-4 transition-colors duration-500 rounded-full bg-brand-bg group-hover:bg-white/20"><Building2 size={32} className="md:w-10 md:h-10 transition-colors duration-500 text-brand group-hover:text-white" /></div>
                  <span className="text-xl md:text-2xl font-bold">{bldg}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-center w-full max-w-5xl mt-8 md:mt-12 px-4 md:px-8">
            <button onClick={() => setSearchParams({ view: 'records' })} className="flex items-center justify-center w-full md:w-auto gap-3 px-8 py-4 text-base md:text-lg font-bold transition-all duration-300 bg-white/90 backdrop-blur-sm border-2 border-brand-light/30 text-brand-dark hover:bg-brand hover:text-white hover:border-brand rounded-2xl shadow-sm hover:shadow-lg group">
              <ClipboardList size={24} className="text-brand transition-colors group-hover:text-white" /> View Attendance Records
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden font-sans bg-brand-bg print:block print:h-auto print:bg-white">
      {/* --- GLOBAL BACKGROUND WATERMARK --- */}
      <img 
        src={logo} 
        alt="Watermark" 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] opacity-10 pointer-events-none z-0 fams-logo-purple" 
      />
      <Sidebar />
      <main className="relative z-10 flex flex-col flex-1 w-full h-full overflow-hidden p-4 sm:p-6 md:p-8 print:p-0 print:overflow-visible">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 md:p-6 mb-6 bg-white/90 backdrop-blur-sm border shadow-sm rounded-2xl border-brand-light/20 print:hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="p-2 text-white rounded-lg md:hidden bg-brand shrink-0" onClick={() => setIsSidebarOpen(true)}><Menu size={24} /></button>
            <div>
              <h1 className="mb-1 text-xs md:text-sm font-bold tracking-wider uppercase text-slate-500">{dateToday}</h1>
              <h2 className="flex items-center gap-2 md:gap-3 text-2xl md:text-3xl font-bold text-brand-dark"><Building2 size={24} className="md:w-7 md:h-7 text-brand" />{selectedBuilding}</h2>
            </div>
          </div>
        </header>

        <div className="mb-6 print:hidden">
          <div className="flex items-center gap-2 px-2 mb-3"><Clock size={18} className="text-brand" /><span className="text-sm font-bold text-brand-dark">Select Time Slot</span></div>
          <div className="flex gap-2 md:gap-3 px-2 pb-4 overflow-x-auto scrollbar-hide snap-x">
            {TIME_SLOTS.map(time => {
              const [startTime, endTime] = time.split(' - ');
              return (
                <button key={time} onClick={() => setSelectedTime(time)} className={`snap-start whitespace-nowrap px-4 py-2 md:px-5 md:py-2 rounded-xl text-xs md:text-sm font-bold border-2 transition-all shadow-sm flex flex-col items-center justify-center shrink-0 ${selectedTime === time ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' : 'bg-white/90 backdrop-blur-sm text-brand-dark/70 border-brand-light/20 hover:border-brand hover:text-brand'}`}>
                  <span>{startTime}</span><span>{endTime}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden bg-white/90 backdrop-blur-sm border shadow-sm rounded-2xl border-brand-light/20 print:border-none print:shadow-none">
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
                  const activeSlot = faculty.weekly_schedule?.find((slot: any) => String(slot.day).trim().toLowerCase() === String(currentDayOfWeek).trim().toLowerCase() && slot.building === selectedBuilding && isTimeOverlap(selectedTime, slot.time));
                  const displayRoom = activeSlot && activeSlot.room ? activeSlot.room : 'TBA';
                  const sessionKey = activeSlot ? `${faculty.id}-${activeSlot.time}` : String(faculty.id);
                  const fullName = `${faculty.last_name}, ${faculty.first_name}`.toUpperCase();
                  const record = attendance[sessionKey as any] || { present: false, late: '', absent: false, remarks: '' };
                  const isCheckedOff = record.present || record.absent || record.late !== '' || record.remarks !== '';
                  return (
                    <tr key={faculty.id} className={`transition-all duration-500 ${isCheckedOff ? 'bg-slate-50/50' : 'hover:bg-brand-bg/50'}`}>
                      <td className={`px-4 md:px-6 py-4 md:py-5 text-sm md:text-lg font-bold text-brand-dark print:text-black print:px-2 transition-opacity duration-500 ${isCheckedOff ? 'opacity-30' : ''}`}>{fullName}</td>
                      <td className={`px-4 md:px-6 py-4 md:py-5 text-sm md:text-lg font-bold text-center text-brand-dark/70 print:text-black print:px-2 transition-opacity duration-500 ${isCheckedOff ? 'opacity-30' : ''}`}>{displayRoom}</td>
                      <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                        <label className="relative inline-flex items-center justify-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={record.present} onChange={() => toggleAttendance(sessionKey, 'present')} />
                          <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 transition-all bg-gray-100 border-2 border-gray-300 rounded-lg shadow-sm peer-checked:bg-green-500 peer-checked:border-green-500 print:border-black print:bg-white print:peer-checked:bg-black"><svg className="w-4 h-4 md:w-5 md:h-5 text-white transition-opacity opacity-0 peer-checked:opacity-100 print:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
                        </label>
                      </td>
                      <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                        <div className="print:hidden"><input type="time" className="p-1 md:p-2 text-sm md:text-lg font-bold text-center bg-white border-2 border-gray-300 shadow-sm w-28 md:w-36 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 text-brand-dark" value={record.late} onChange={(e) => updateLateTime(sessionKey, e.target.value)} /></div>
                        <span className="hidden font-bold print:block">{record.late || '-'}</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                        <label className="relative inline-flex items-center justify-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={record.absent} onChange={() => toggleAttendance(sessionKey, 'absent')} />
                          <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 transition-all bg-gray-100 border-2 border-gray-300 rounded-lg shadow-sm peer-checked:bg-red-500 peer-checked:border-red-500 print:border-black print:bg-white print:peer-checked:bg-black"><svg className="w-4 h-4 md:w-5 md:h-5 text-white transition-opacity opacity-0 peer-checked:opacity-100 print:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></div>
                        </label>
                      </td>
                      <td className="px-4 md:px-6 py-4 md:py-5 text-center print:px-2">
                        <button onClick={() => openRemarksModal(sessionKey)} className={`print:hidden px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold border-2 rounded-lg transition-all shadow-sm whitespace-nowrap ${record.remarks ? 'bg-brand text-white border-brand' : 'bg-white border-brand-light/30 text-brand hover:bg-brand/10'}`}>{record.remarks ? '✓ VIEW/EDIT' : '+ ADD'}</button>
                      </td>
                    </tr>
                  );
                })}
                {displayedFaculties.length === 0 && <tr><td colSpan={6} className="px-6 py-12 font-medium text-center text-slate-400 print:text-black">No faculties scheduled.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end mt-4 md:mt-6 print:hidden">
          <button onClick={handleSaveToRecords} disabled={!isAllBuildingsChecked || isTallySaved} className={`flex items-center justify-center w-full sm:w-auto gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 text-sm md:text-lg font-bold transition-all shadow-lg rounded-2xl ${!isAllBuildingsChecked ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80' : isTallySaved ? 'bg-green-600 shadow-green-600/30 text-white cursor-default' : 'bg-gradient-to-r from-brand to-brand-light hover:from-brand-dark hover:to-brand shadow-brand/30 hover:scale-105 active:scale-95 text-white'}`}>
            {!isAllBuildingsChecked ? (
               <><AlertCircle size={20} className="md:w-6 md:h-6" /> INCOMPLETE ({completedChecks}/{expectedChecks} CHECKS)</>
            ) : isTallySaved ? (
               <>✅ TALLY SAVED TO RECORDS</>
            ) : (
               <><Save size={20} className="md:w-6 md:h-6" /> SAVE TALLY TO RECORDS</>
            )}
          </button>
        </div>
      </main>

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
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition-all border-2 border-dashed rounded-2xl shadow-sm bg-brand-bg text-brand-dark border-brand-light/40 hover:bg-brand-light/10 hover:border-brand"><Camera size={20} className="md:w-5 md:h-5" /> Attach Photo</button>
              <button onClick={saveRemarks} className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg font-bold text-white transition-all shadow-lg bg-brand hover:bg-brand-dark rounded-2xl shadow-brand/20">Save Remarks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}