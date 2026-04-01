import React, { useState, useEffect } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- Helpers ---
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calculateDays = (dateString) => {
  if (!dateString) return 0;
  const start = new Date(dateString).setHours(0,0,0,0);
  const now = new Date().setHours(0,0,0,0);
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
};

// --- Biological Healing Timelines ---
const getLungFact = (days) => {
  if (days === 0) return "Day 1: In 12 hours, carbon monoxide in your blood drops to normal.";
  if (days === 1) return "Day 2: Nerve endings begin to heal. Sense of smell and taste sharpen.";
  if (days === 2) return "Day 3: Nicotine is flushed. Bronchial tubes relax, making breathing easier.";
  if (days === 3) return "Day 4: Energy levels are rising. Physical withdrawal is passing.";
  if (days < 7) return `Day ${days + 1}: Your body is actively repairing tissue.`;
  if (days < 14) return `Day ${days + 1}: Blood circulation is heavily improving. Walking is easier.`;
  if (days < 30) return `Day ${days + 1}: Lung function increasing. Mental fog is lifting.`;
  if (days < 90) return `Day ${days + 1}: Coughing reduced. Lung cilia are actively regrowing.`;
  if (days < 365) return `Day ${days + 1}: Coronary heart disease risk is halved.`;
  return `Day ${days + 1}: Monumental achievement. Profound lung healing.`;
};

const getLiverFact = (days) => {
  if (days === 0) return "Day 1: Blood sugar starts normalizing. Dehydration reverses.";
  if (days < 7) return `Day ${days + 1}: Sleep cycles regulating. REM sleep increases drastically.`;
  if (days < 14) return `Day ${days + 1}: Liver inflammation decreases. Stomach lining heals.`;
  if (days < 30) return `Day ${days + 1}: Skin hydration improves. Noticeable reduction in puffiness.`;
  if (days < 90) return `Day ${days + 1}: Liver fat reduces by up to 15%. Memory improves.`;
  return `Day ${days + 1}: Your liver has largely regenerated. Cardiovascular risk dropped.`;
};

export default function StreakReset() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [appStartDate, setAppStartDate] = useState(getTodayStr()); 
  
  const [smokeLastReset, setSmokeLastReset] = useState(getTodayStr());
  const [smokeBest, setSmokeBest] = useState(0);
  const [alcoholLastReset, setAlcoholLastReset] = useState(getTodayStr());
  const [alcoholBest, setAlcoholBest] = useState(0);
  const [movedLastReset, setMovedLastReset] = useState(getTodayStr());
  const [movedBest, setMovedBest] = useState(0);
  
  const [slips, setSlips] = useState({ smoke: [], alcohol: [], moved: [] }); 
  const [notes, setNotes] = useState({}); 
  const [cravings, setCravings] = useState([]);

  // UI State
  const [currentMonthView, setCurrentMonthView] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // 1. Save Function (Moved UP so it can be used by loadData)
  const updateStateAndSave = async (key, value) => {
    const currentUser = auth.currentUser; // Get fresh auth state
    if (currentUser) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { [key]: value }, { merge: true });
      } catch (error) {
        console.error("Error saving:", error);
      }
    }
    // Local Update
    if (key === 'appStartDate') setAppStartDate(value);
    if (key === 'smokeLastReset') setSmokeLastReset(value);
    if (key === 'smokeBest') setSmokeBest(value);
    if (key === 'alcoholLastReset') setAlcoholLastReset(value);
    if (key === 'alcoholBest') setAlcoholBest(value);
    if (key === 'movedLastReset') setMovedLastReset(value);
    if (key === 'movedBest') setMovedBest(value);
    if (key === 'slips') setSlips(value);
    if (key === 'notes') setNotes(value);
    if (key === 'cravings') setCravings(value);
  };

  // 2. Fetch Data
  const loadData = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.appStartDate) setAppStartDate(data.appStartDate);
      else updateStateAndSave('appStartDate', getTodayStr()); 
      
      if (data.smokeLastReset) setSmokeLastReset(data.smokeLastReset);
      if (data.smokeBest) setSmokeBest(data.smokeBest);
      if (data.alcoholLastReset) setAlcoholLastReset(data.alcoholLastReset);
      if (data.alcoholBest) setAlcoholBest(data.alcoholBest);
      if (data.movedLastReset) setMovedLastReset(data.movedLastReset);
      if (data.movedBest) setMovedBest(data.movedBest);
      
      if (data.slips) setSlips(data.slips);
      if (data.notes) setNotes(data.notes);
      if (data.cravings) setCravings(data.cravings);
    } else {
      // First time user initialization
      updateStateAndSave('appStartDate', getTodayStr());
    }
  };

  // 3. Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) await loadData(currentUser.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading your data...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-neutral-800">Streak Reset 🔥</h1>
        <p className="text-neutral-500 mb-8">Log in to sync across all your devices.</p>
        <button onClick={() => signInWithPopup(auth, provider)} className="bg-neutral-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-neutral-700">
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- Logic & Derived State ---
  const today = getTodayStr();
  const smokeStreak = calculateDays(smokeLastReset);
  const alcoholStreak = calculateDays(alcoholLastReset);
  const movedStreak = calculateDays(movedLastReset);
  
  const moneySaved = smokeStreak * 100;
  const hoursSaved = Math.floor((smokeStreak * 40) / 60);

  const lungMessage = getLungFact(smokeStreak);
  const liverMessage = getLiverFact(alcoholStreak);

  // The new Slip Logic
  const handleSlip = (type) => {
    if (window.confirm(`Progress isn't linear. Record a slip for ${type} today and reset streak?`)) {
      
      // 1. Record the slip date
      const updatedSlips = { ...slips };
      if (!updatedSlips[type]) updatedSlips[type] = [];
      if (!updatedSlips[type].includes(today)) {
        updatedSlips[type].push(today);
      }
      updateStateAndSave('slips', updatedSlips);

      // 2. Update the Best score and Reset the timer
      if (type === 'smoke') {
        updateStateAndSave('smokeBest', Math.max(smokeBest, smokeStreak));
        updateStateAndSave('smokeLastReset', today);
      } else if (type === 'alcohol') {
        updateStateAndSave('alcoholBest', Math.max(alcoholBest, alcoholStreak));
        updateStateAndSave('alcoholLastReset', today);
      } else {
        updateStateAndSave('movedBest', Math.max(movedBest, movedStreak));
        updateStateAndSave('movedLastReset', today);
      }
    }
  };

  const handleNoteChange = (e) => {
    const updatedNotes = { ...notes, [selectedDate]: e.target.value };
    updateStateAndSave('notes', updatedNotes);
  };

  const logCraving = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedCravings = [{ time, date: today }, ...cravings].slice(0, 8);
    updateStateAndSave('cravings', updatedCravings);
  };

  // --- Calendar Logic ---
  const getCalendarDays = () => {
    const year = currentMonthView.getFullYear();
    const month = currentMonthView.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    return days;
  };

  const prevMonth = () => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonthView(new Date(currentMonthView.getFullYear(), currentMonthView.getMonth() + 1, 1));

  // --- Apple Fitness Ring Component ---
  const DayRing = ({ dateStr }) => {
    if (!dateStr) return <div className="w-10 h-10"></div>; 
    
    const dayNum = parseInt(dateStr.split('-')[2], 10);
    const isSelected = dateStr === selectedDate;
    const isFuture = dateStr > today;
    const isBeforeAppStart = dateStr < appStartDate;
    
    // Automatic Success Logic: You succeeded if the day has passed, you had the app, and you DID NOT slip.
    const smokeSuccess = !isFuture && !isBeforeAppStart && !(slips.smoke || []).includes(dateStr);
    const alcoholSuccess = !isFuture && !isBeforeAppStart && !(slips.alcohol || []).includes(dateStr);
    const movedSuccess = !isFuture && !isBeforeAppStart && !(slips.moved || []).includes(dateStr);

    const r1 = 15, r2 = 11, r3 = 7, c = 20; 
    
    return (
      <button 
        onClick={() => !isFuture && setSelectedDate(dateStr)}
        disabled={isFuture}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full mx-auto transition-all ${
          isSelected ? 'bg-neutral-800 scale-110 shadow-md' : 
          isFuture ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-neutral-200'
        }`}
      >
        <span className={`absolute text-[11px] font-bold z-10 ${isSelected ? 'text-white' : 'text-neutral-600'}`}>{dayNum}</span>
        <svg width="40" height="40" className="transform -rotate-90 absolute top-0 left-0">
          {/* Background tracks (faint) */}
          <circle cx={c} cy={c} r={r1} stroke={isSelected ? "#404040" : "#ecfdf5"} strokeWidth="2.5" fill="none" />
          <circle cx={c} cy={c} r={r2} stroke={isSelected ? "#404040" : "#eff6ff"} strokeWidth="2.5" fill="none" />
          <circle cx={c} cy={c} r={r3} stroke={isSelected ? "#404040" : "#fff7ed"} strokeWidth="2.5" fill="none" />
          
          {/* Active Rings */}
          {smokeSuccess && <circle cx={c} cy={c} r={r1} stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * r1} />}
          {alcoholSuccess && <circle cx={c} cy={c} r={r2} stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * r2} />}
          {movedSuccess && <circle cx={c} cy={c} r={r3} stroke="#f97316" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * r3} />}
        </svg>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 font-sans pb-10">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 pt-8 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Streak Reset 🔥</h1>
          <p className="text-neutral-500 text-sm mt-1">Clarity & Consistency</p>
        </div>
        <button onClick={() => signOut(auth)} className="text-xs font-medium bg-white px-3 py-1.5 rounded-full border border-neutral-200 shadow-sm hover:bg-neutral-50 transition-colors">
          Sign Out
        </button>
      </header>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Streaks, Money, Time */}
        <div className="lg:col-span-4 space-y-6">
          
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Your Streaks</h2>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex justify-between items-center group">
              <div>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Smoke-Free</div>
                <div className="text-xs text-neutral-400">Best: {smokeBest}</div>
              </div>
              <div className="text-right flex items-center gap-4">
                <span className="text-4xl font-black text-emerald-500">{smokeStreak}</span>
                <button onClick={() => handleSlip('smoke')} className="text-[10px] uppercase font-bold text-red-400 bg-red-50 hover:bg-red-500 hover:text-white transition-colors px-2 py-1 rounded">Slip</button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Alcohol-Free</div>
                <div className="text-xs text-neutral-400">Best: {alcoholBest}</div>
              </div>
              <div className="text-right flex items-center gap-4">
                <span className="text-4xl font-black text-blue-500">{alcoholStreak}</span>
                <button onClick={() => handleSlip('alcohol')} className="text-[10px] uppercase font-bold text-red-400 bg-red-50 hover:bg-red-500 hover:text-white transition-colors px-2 py-1 rounded">Slip</button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Moved Body</div>
                <div className="text-xs text-neutral-400">Best: {movedBest}</div>
              </div>
              <div className="text-right flex items-center gap-4">
                <span className="text-4xl font-black text-orange-500">{movedStreak}</span>
                <button onClick={() => handleSlip('moved')} className="text-[10px] uppercase font-bold text-red-400 bg-red-50 hover:bg-red-500 hover:text-white transition-colors px-2 py-1 rounded">Slip</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <section className="bg-emerald-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
              <h2 className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">Wealth Kept</h2>
              <div className="text-2xl font-black text-emerald-400 mt-2">₹{moneySaved.toLocaleString('en-IN')}</div>
              <p className="text-[10px] text-emerald-500 mt-2">@ 4 cigs/day</p>
            </section>
            
            <section className="bg-blue-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
              <h2 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mb-1">Time Won Back</h2>
              <div className="text-2xl font-black text-blue-400 mt-2">{hoursSaved} hrs</div>
              <p className="text-[10px] text-blue-500 mt-2">@ 40 mins/day</p>
            </section>
          </div>

        </div>

        {/* CENTER COLUMN: Calendar & Interactive Action Log */}
        <div className="lg:col-span-5 space-y-6">
          
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-800">
                {currentMonthView.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-50 hover:bg-neutral-200 transition-colors">←</button>
                <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-50 hover:bg-neutral-200 transition-colors">→</button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 mb-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-[10px] font-bold text-neutral-400 uppercase">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-4">
              {getCalendarDays().map((dateStr, i) => (
                <DayRing key={i} dateStr={dateStr} />
              ))}
            </div>
            
            {/* Calendar Legend */}
            <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Smoke</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Alcohol</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Moved</span>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 border-t-4 border-t-neutral-800 transition-all">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-sm font-bold text-neutral-800">
                Journal • {selectedDate === today ? "Today" : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h2>
            </div>
            
            <textarea 
              value={notes[selectedDate] || ""}
              onChange={handleNoteChange}
              placeholder="Log thoughts, triggers, or wins for this day..."
              className="w-full text-sm text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-800 resize-none h-32"
            />
          </section>

        </div>

        {/* RIGHT COLUMN: Health Timelines & Cravings Log */}
        <div className="lg:col-span-3 space-y-6">
          
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
            <h2 className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Lung Repair Status</h2>
            <p className="text-xs font-medium text-neutral-700 leading-relaxed">{lungMessage}</p>
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
            <h2 className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Liver/Brain Status</h2>
            <p className="text-xs font-medium text-neutral-700 leading-relaxed">{liverMessage}</p>
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col h-full max-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700">Craving Log</h2>
              <button onClick={logCraving} className="bg-neutral-800 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full hover:bg-neutral-700 active:scale-95 transition-transform">
                + Urge Passed
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
              {cravings.length > 0 ? (
                cravings.map((c, i) => (
                  <div key={i} className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100 flex justify-between items-center">
                    <span className="text-xs font-medium text-neutral-700">Resisted</span>
                    <span className="text-[10px] text-neutral-400 font-medium">{c.date === today ? 'Today' : c.date.slice(5)} • {c.time}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic text-center px-4">
                  No cravings logged yet. Stay strong!
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}