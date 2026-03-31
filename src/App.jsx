import React, { useState, useEffect } from 'react';
import { auth, provider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const calculateDays = (dateString) => {
  if (!dateString) return 0;
  const start = new Date(dateString).setHours(0,0,0,0);
  const now = new Date().setHours(0,0,0,0);
  const diff = now - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export default function StreakReset() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [whyIQuit, setWhyIQuit] = useState("Write your 'Why' here. E.g., Better health, discipline, clear mind.");
  const [smokeLastReset, setSmokeLastReset] = useState(getTodayStr());
  const [smokeBest, setSmokeBest] = useState(0);
  const [alcoholLastReset, setAlcoholLastReset] = useState(getTodayStr());
  const [alcoholBest, setAlcoholBest] = useState(0);
  const [dailyLogs, setDailyLogs] = useState({});
  const [cravings, setCravings] = useState([]);

  // 1. Fetch Data from Firebase (Moved ABOVE the useEffect so it is declared first)
  const loadData = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.whyIQuit) setWhyIQuit(data.whyIQuit);
      if (data.smokeLastReset) setSmokeLastReset(data.smokeLastReset);
      if (data.smokeBest) setSmokeBest(data.smokeBest);
      if (data.alcoholLastReset) setAlcoholLastReset(data.alcoholLastReset);
      if (data.alcoholBest) setAlcoholBest(data.alcoholBest);
      if (data.dailyLogs) setDailyLogs(data.dailyLogs);
      if (data.cravings) setCravings(data.cravings);
    }
  };

  // 2. Listen for Login/Logout
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadData(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Save Data to Firebase
  const saveDataToCloud = async (newData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), newData, { merge: true });
    } catch (error) {
      console.error("Error saving to cloud:", error);
    }
  };

  // Wrapper to update state AND save to cloud immediately
  const updateStateAndSave = (key, value) => {
    const newData = { [key]: value };
    saveDataToCloud(newData);
    
    // Update local state
    if (key === 'smokeLastReset') setSmokeLastReset(value);
    if (key === 'smokeBest') setSmokeBest(value);
    if (key === 'alcoholLastReset') setAlcoholLastReset(value);
    if (key === 'alcoholBest') setAlcoholBest(value);
    if (key === 'dailyLogs') setDailyLogs(value);
    if (key === 'cravings') setCravings(value);
    if (key === 'whyIQuit') setWhyIQuit(value);
  };

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  if (loading) return <div className="p-10 text-center text-neutral-500">Loading your data...</div>;

  // If not logged in, show login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 font-sans">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-neutral-800">Streak Reset 🔥</h1>
        <p className="text-neutral-500 mb-8">Log in to sync across all your devices.</p>
        <button onClick={handleLogin} className="bg-neutral-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-neutral-700 transition-colors">
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- Handlers for the UI ---
  const today = getTodayStr();
  const smokeStreak = calculateDays(smokeLastReset);
  const alcoholStreak = calculateDays(alcoholLastReset);
  const todayLog = dailyLogs[today] || { smokeFree: false, alcoholFree: false, moved: false };

  const handleSlip = (type) => {
    if (window.confirm(`It's okay. Progress isn't linear. Reset ${type} streak?`)) {
      if (type === 'smoke') {
        updateStateAndSave('smokeBest', Math.max(smokeBest, smokeStreak));
        updateStateAndSave('smokeLastReset', getTodayStr());
      } else {
        updateStateAndSave('alcoholBest', Math.max(alcoholBest, alcoholStreak));
        updateStateAndSave('alcoholLastReset', getTodayStr());
      }
    }
  };

  const toggleDailyLog = (key) => {
    const updatedLogs = {
      ...dailyLogs,
      [today]: { ...todayLog, [key]: !todayLog[key] }
    };
    updateStateAndSave('dailyLogs', updatedLogs);
  };

  const logCraving = () => {
    const newCraving = { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: today };
    const updatedCravings = [newCraving, ...cravings].slice(0, 10);
    updateStateAndSave('cravings', updatedCravings);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 font-sans pb-10">
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Header */}
        <header className="text-center pt-6 pb-2 relative">
          <h1 className="text-3xl font-bold tracking-tight">Streak Reset 🔥</h1>
          <p className="text-neutral-500 text-sm mt-1">Clarity & Consistency</p>
          <button onClick={handleLogout} className="absolute top-6 right-0 text-xs text-neutral-400 hover:text-neutral-600">
            Sign Out
          </button>
        </header>

        {/* Big Streak Counters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center relative overflow-hidden">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Smoke-Free</span>
            <span className="text-5xl font-black text-emerald-500">{smokeStreak}</span>
            <span className="text-xs text-neutral-400 mt-1">Days</span>
            <div className="w-full flex justify-between items-center mt-4">
              <span className="text-xs text-neutral-400">Best: {smokeBest}</span>
              <button onClick={() => handleSlip('smoke')} className="text-xs text-red-400 hover:bg-red-50 px-2 py-1 rounded transition-colors">Slip</button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center relative overflow-hidden">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Alcohol-Free</span>
            <span className="text-5xl font-black text-blue-500">{alcoholStreak}</span>
            <span className="text-xs text-neutral-400 mt-1">Days</span>
            <div className="w-full flex justify-between items-center mt-4">
              <span className="text-xs text-neutral-400">Best: {alcoholBest}</span>
              <button onClick={() => handleSlip('alcohol')} className="text-xs text-red-400 hover:bg-red-50 px-2 py-1 rounded transition-colors">Slip</button>
            </div>
          </div>
        </div>

        {/* Daily Check-in */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-700 mb-3">Today's Log</h2>
          <div className="space-y-3">
            <button 
              onClick={() => toggleDailyLog('smokeFree')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${todayLog.smokeFree ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
              <span className="font-medium">✅ Did not smoke</span>
            </button>
            <button 
              onClick={() => toggleDailyLog('alcoholFree')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${todayLog.alcoholFree ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
              <span className="font-medium">✅ Did not drink</span>
            </button>
            <button 
              onClick={() => toggleDailyLog('moved')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${todayLog.moved ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
              <span className="font-medium">🏃‍♂️ Moved my body</span>
            </button>
          </div>
        </section>

        {/* Craving Logger */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-neutral-700">Cravings</h2>
            <button onClick={logCraving} className="bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-neutral-700 active:scale-95 transition-transform">
              + Log Craving
            </button>
          </div>
          {cravings.length > 0 ? (
            <ul className="text-sm text-neutral-500 space-y-2">
              {cravings.slice(0, 3).map((c, i) => (
                <li key={i} className="flex justify-between border-b border-neutral-50 pb-1">
                  <span>Urge resisted</span>
                  <span>{c.date === today ? 'Today' : c.date} at {c.time}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400 italic">No cravings logged recently. You're doing great.</p>
          )}
        </section>

        {/* Why I Quit */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-700 mb-2">Why I Quit</h2>
          <textarea 
            value={whyIQuit}
            onChange={(e) => updateStateAndSave('whyIQuit', e.target.value)}
            className="w-full text-sm text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none h-24"
          />
        </section>

      </div>
    </div>
  );
}