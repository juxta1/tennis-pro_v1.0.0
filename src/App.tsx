import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Calendar, 
  PlusCircle, 
  LayoutDashboard, 
  History, 
  ChevronRight, 
  MapPin, 
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Settings,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { Match, Stats, SurfaceType } from './types';

const SURFACES: SurfaceType[] = ['Clay', 'Grass', 'Hard', 'Carpet'];

const renderMatchCard = (match: Match, onClick?: () => void) => {
  const s1 = match.score1?.split(',') || [];
  const s2 = match.score2?.split(',') || [];
  
  // Determine winner
  let sets1 = 0;
  let sets2 = 0;
  let games1 = 0;
  let games2 = 0;
  for (let i = 0; i < s1.length; i++) {
    const g1 = parseInt(s1[i]) || 0;
    const g2 = parseInt(s2[i]) || 0;
    games1 += g1;
    games2 += g2;
    if (g1 > g2) sets1++;
    else if (g2 > g1) sets2++;
  }

  const totalGames = games1 + games2;
  const winPercentage = totalGames > 0 ? ((games1 / totalGames) * 100).toFixed(0) : '0';

  return (
    <div 
      key={match.id} 
      onClick={onClick}
      className={`bg-white p-4 rounded-2xl border border-stone-200 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:border-emerald-500 active:scale-[0.98]' : ''}`}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-100">
            {match.surface}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {match.season}
          </span>
        </div>
        <span className="text-xs text-stone-400 font-medium">{match.date}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${sets1 > sets2 ? 'text-emerald-600' : 'text-stone-700'}`}>{match.player1}</span>
            <div className="flex gap-1">
              {s1.map((score, i) => (
                <span key={i} className={`font-mono font-bold text-sm w-6 text-center rounded ${parseInt(s1[i]) > parseInt(s2[i]) ? 'bg-emerald-50 text-emerald-700' : 'text-stone-400'}`}>
                  {score}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${sets2 > sets1 ? 'text-emerald-600' : 'text-stone-700'}`}>{match.player2}</span>
            <div className="flex gap-1">
              {s2.map((score, i) => (
                <span key={i} className={`font-mono font-bold text-sm w-6 text-center rounded ${parseInt(s2[i]) > parseInt(s1[i]) ? 'bg-emerald-50 text-emerald-700' : 'text-stone-400'}`}>
                  {score}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {match.status === 'completed' && (
        <div className="mt-3 pt-3 border-t border-stone-50 flex justify-between items-center">
          <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
            Games: {games1} - {games2}
          </div>
          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            {winPercentage}% Win
          </div>
        </div>
      )}
    </div>
  );
};

const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let season = '';
  if (month >= 2 && month <= 4) season = 'Spring';
  else if (month >= 5 && month <= 7) season = 'Summer';
  else if (month >= 8 && month <= 10) season = 'Fall';
  else season = 'Winter';
  return `${season} ${year}`;
};

export default function App() {
  const [view, setView] = useState<'dashboard' | 'schedule' | 'history' | 'setup'>('dashboard');
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [defaultStartTime, setDefaultStartTime] = useState('10:00');
  const [defaultDuration, setDefaultDuration] = useState('90');
  const [loading, setLoading] = useState(true);
  const [showScoreModal, setShowScoreModal] = useState<Match | null>(null);
  const [showEditModal, setShowEditModal] = useState<Match | null>(null);
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);
  
  // Set scores state
  const [setScores, setSetScores] = useState<{ p1: string, p2: string }[]>([{ p1: '', p2: '' }]);

  const safeFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      if (contentType && contentType.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || `Request failed with status ${res.status}`);
      }
      const text = await res.text();
      throw new Error(text || `Request failed with status ${res.status}`);
    }
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    }
    return res;
  };

  const fetchData = async () => {
    try {
      const data = await safeFetch('/api/init');
      
      setMatches(data.matches);
      setSeasons(data.seasons.length > 0 ? data.seasons : [getCurrentSeason()]);
      setUserName(data.settings.userName);
      setDefaultStartTime(data.settings.defaultStartTime);
      setDefaultDuration(data.settings.defaultDuration);
      setSurfaces(data.settings.surfaces || ['Clay', 'Grass', 'Hard', 'Carpet']);
      setPlayers(data.players);
      setGoogleConnected(data.googleConnected);
      
      if (!data.settings.userName && loading) {
        setView('setup');
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err.message);
      if (err.message.includes('Rate exceeded')) {
        alert('The server is currently busy. Please wait a moment and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (showEditModal) {
      if (showEditModal.score1 && showEditModal.score2) {
        const s1 = showEditModal.score1.split(',');
        const s2 = showEditModal.score2.split(',');
        const newSetScores = s1.map((score, i) => ({
          p1: score,
          p2: s2[i] || ''
        }));
        setSetScores(newSetScores);
      } else {
        setSetScores([{ p1: '', p2: '' }]);
      }
    } else if (showScoreModal) {
      setSetScores([{ p1: '', p2: '' }]);
    } else {
      setSetScores([{ p1: '', p2: '' }]);
    }
  }, [showEditModal, showScoreModal]);

  const handleAddMatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const season = showNewSeasonInput ? newSeasonName : formData.get('season');
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const duration = parseInt(formData.get('duration') as string);

    // Conflict Check
    const sameDayMatch = matches.find(m => m.date === date);
    if (sameDayMatch) {
      if (sameDayMatch.start_time === startTime) {
        alert(`Conflict! You already have a match scheduled at ${startTime} on ${date}. Please choose a different time.`);
        return;
      }
      const proceed = confirm(`Warning: You already have a match scheduled on ${date}. Do you want to proceed with scheduling another one?`);
      if (!proceed) return;
    }
    
    const newMatch = {
      player1: userName || formData.get('player1'),
      player2: formData.get('player2'),
      date: date,
      startTime: startTime,
      duration: duration,
      surface: formData.get('surface'),
      season: season,
    };

    try {
      const res = await safeFetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatch),
      });
      
      if (addToCalendar && googleConnected) {
        await safeFetch('/api/calendar/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            opponent: newMatch.player2,
            surface: newMatch.surface,
            date: newMatch.date,
            startTime: newMatch.startTime,
            duration: newMatch.duration
          }),
        });
      }

      fetchData();
      setView('dashboard');
      setShowNewSeasonInput(false);
      setNewSeasonName('');
    } catch (err) {
      console.error('Failed to add match', err);
    }
  };

  const handleDeletePlayer = async (name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await safeFetch(`/api/players/${name}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete player', err);
    }
  };

  const handleAddPlayer = async (name: string) => {
    if (!name) return;
    try {
      await safeFetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to add player', err);
    }
  };

  const handleDeleteSurface = async (surface: string) => {
    const newSurfaces = surfaces.filter(s => s !== surface);
    setSurfaces(newSurfaces);
    try {
      await safeFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surfaces: newSurfaces }),
      });
    } catch (err) {
      console.error('Failed to delete surface', err);
    }
  };

  const handleAddSurface = async (surface: string) => {
    if (!surface || surfaces.includes(surface)) return;
    const newSurfaces = [...surfaces, surface];
    setSurfaces(newSurfaces);
    try {
      await safeFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surfaces: newSurfaces }),
      });
    } catch (err) {
      console.error('Failed to add surface', err);
    }
  };

  const handleUpdateMatch = async (match: Match) => {
    try {
      await safeFetch(`/api/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match),
      });
      fetchData();
      setShowEditModal(null);
    } catch (err) {
      console.error('Failed to update match', err);
    }
  };

  const handleUpdateScore = async () => {
    if (!showScoreModal) return;
    const s1 = setScores.map(s => s.p1).filter(s => s !== '').join(',');
    const s2 = setScores.map(s => s.p2).filter(s => s !== '').join(',');
    
    try {
      await safeFetch(`/api/matches/${showScoreModal.id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score1: s1, score2: s2 }),
      });
      fetchData();
      setShowScoreModal(null);
    } catch (err) {
      console.error('Failed to update score', err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { url } = await safeFetch('/api/auth/google/url');
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (err) {
      console.error('Failed to get Google auth URL', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await safeFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, defaultStartTime, defaultDuration, surfaces }),
      });
      fetchData();
      setView('dashboard');
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + duration);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const calculateH2HStats = (opponent: string, surface: string) => {
    const completedMatches = matches.filter(m => m.status === 'completed');
    const matchesAgainst = completedMatches.filter(m => m.player2 === opponent && m.surface === surface);
    if (matchesAgainst.length === 0) return null;
    
    let gamesWon = 0;
    let gamesLost = 0;
    matchesAgainst.forEach(m => {
      const s1 = m.score1?.split(',').map(Number) || [];
      const s2 = m.score2?.split(',').map(Number) || [];
      s1.forEach(g => gamesWon += g);
      s2.forEach(g => gamesLost += g);
    });
    
    const totalGames = gamesWon + gamesLost;
    return {
      gamesWon,
      gamesLost,
      totalMatches: matchesAgainst.length,
      percentage: totalGames > 0 ? ((gamesWon / totalGames) * 100).toFixed(0) : '0'
    };
  };

  const today = new Date().toISOString().split('T')[0];
  const completedMatches = matches.filter(m => m.status === 'completed');
  const upcomingMatches = matches.filter(m => m.status === 'scheduled');
  
  // Calculate Win/Loss Ratio (Games)
  let totalGamesWon = 0;
  let totalGamesLost = 0;
  completedMatches.forEach(m => {
    const s1 = m.score1?.split(',').map(Number) || [];
    const s2 = m.score2?.split(',').map(Number) || [];
    s1.forEach(g => totalGamesWon += g);
    s2.forEach(g => totalGamesLost += g);
  });
  const totalGames = totalGamesWon + totalGamesLost;
  const winPercentage = totalGames > 0 ? ((totalGamesWon / totalGames) * 100).toFixed(0) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Trophy className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">Tennis Pro</h1>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">{userName || 'Guest'}</p>
            </div>
          </div>
          <button 
            onClick={() => setView('setup')}
            className="p-2 text-stone-400 hover:text-emerald-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm">
                  <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-2">Win Percentage</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-black text-emerald-600">{winPercentage}%</p>
                    <p className="text-xs text-stone-400 font-bold">Games</p>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500" 
                      style={{ width: `${winPercentage}%` }}
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-50 space-y-2">
                    {surfaces
                      .map(s => {
                        const sMatches = completedMatches.filter(m => m.surface === s);
                        let sGamesWon = 0;
                        let sGamesLost = 0;
                        sMatches.forEach(m => {
                          const s1 = m.score1?.split(',').map(Number) || [];
                          const s2 = m.score2?.split(',').map(Number) || [];
                          s1.forEach(g => sGamesWon += g);
                          s2.forEach(g => sGamesLost += g);
                        });
                        const totalSGames = sGamesWon + sGamesLost;
                        const sWinRate = totalSGames > 0 ? ((sGamesWon / totalSGames) * 100).toFixed(0) : '0';
                        return { surface: s, winRate: sWinRate, matchCount: sMatches.length };
                      })
                      .sort((a, b) => b.matchCount - a.matchCount)
                      .map(({ surface, winRate, matchCount }) => (
                        <div key={surface} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-stone-400 uppercase">{surface}</span>
                            {matchCount > 0 && <span className="text-[8px] text-stone-300 font-medium">({matchCount} matches)</span>}
                          </div>
                          <span className="text-[9px] font-black text-emerald-600">{winRate}% Games</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="bg-stone-900 p-5 rounded-3xl shadow-xl text-white">
                  <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mb-2">Matches</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-black">{completedMatches.length}</p>
                      <p className="text-[10px] text-stone-500 font-bold uppercase">Played</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-400">{upcomingMatches.length}</p>
                      <p className="text-[10px] text-stone-500 font-bold uppercase">Next</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Matches */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Next Matches
                  </h2>
                </div>
                <div className="space-y-3">
                  {upcomingMatches.map(match => (
                    <div 
                      key={match.id} 
                      className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between hover:border-emerald-500 transition-all cursor-pointer group"
                      onClick={() => setShowEditModal(match)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {match.surface}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">
                            {match.season}
                          </span>
                        </div>
                        <div className="font-bold text-stone-800">
                          {match.player1} <span className="text-stone-300 font-normal mx-1">vs</span> {match.player2}
                        </div>
                        <div className="mt-2 space-y-2">
                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-[0.15em]">H2H Records vs {match.player2}</p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {surfaces
                              .map(s => ({ surface: s, stats: calculateH2HStats(match.player2, s) }))
                              .sort((a, b) => (b.stats?.totalMatches || 0) - (a.stats?.totalMatches || 0))
                              .map(({ surface, stats }) => (
                                <div key={surface} className="flex flex-col gap-1 bg-stone-50/50 p-2 rounded-xl border border-stone-100">
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] font-bold uppercase ${surface === match.surface ? 'text-emerald-600' : 'text-stone-400'}`}>
                                      {surface} {surface === match.surface && '•'}
                                    </span>
                                    <span className="text-[9px] font-black text-emerald-600">{stats?.percentage || '0'}% Games</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500" 
                                        style={{ width: `${stats?.percentage || 0}%` }}
                                      />
                                    </div>
                                    <div className="text-[8px] font-bold text-stone-400 whitespace-nowrap">
                                      {stats?.gamesWon || 0}W - {stats?.gamesLost || 0}L <span className="text-stone-300">({stats?.totalMatches || 0}m)</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div className="text-[10px] text-stone-400 font-bold uppercase mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {match.date} {match.start_time && `• ${match.start_time} - ${calculateEndTime(match.start_time, match.duration || 0)}`}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setShowScoreModal(match)}
                          className="bg-emerald-600 text-white text-[10px] font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
                        >
                          Score
                        </button>
                        <button 
                          onClick={() => setShowEditModal(match)}
                          className="bg-stone-100 text-stone-600 text-[10px] font-bold px-4 py-2.5 rounded-xl hover:bg-stone-200 transition-all active:scale-95 whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  {upcomingMatches.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-stone-200 text-stone-400 italic text-sm">
                      No matches scheduled
                    </div>
                  )}
                </div>
              </section>

              {/* Recent History */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    Recent Results
                  </h2>
                  <button onClick={() => setView('history')} className="text-xs font-bold text-emerald-600 uppercase tracking-wider">View All</button>
                </div>
                <div className="space-y-3">
                  {completedMatches.slice(0, 3).map(match => renderMatchCard(match))}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-black tracking-tight">New Match</h2>
              <form onSubmit={handleAddMatch} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Opponent Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                    <input 
                      name="player2" 
                      required 
                      list="players-list"
                      className="w-full bg-white border border-stone-200 rounded-2xl pl-11 pr-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                      placeholder="Who are you playing?"
                    />
                    <datalist id="players-list">
                      {players.map(p => <option key={p} value={p} />)}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      defaultValue={today}
                      required 
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Start Time</label>
                    <input 
                      type="time" 
                      name="startTime" 
                      defaultValue={defaultStartTime}
                      required 
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Duration (min)</label>
                    <input 
                      type="number" 
                      name="duration" 
                      defaultValue={defaultDuration}
                      required 
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Surface</label>
                    <select 
                      name="surface" 
                      className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold appearance-none"
                    >
                      {surfaces.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Season</label>
                  <div className="flex gap-2">
                    {!showNewSeasonInput ? (
                      <>
                        <select 
                          name="season" 
                          className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold appearance-none"
                        >
                          {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button 
                          type="button"
                          onClick={() => setShowNewSeasonInput(true)}
                          className="p-4 bg-stone-100 text-stone-500 rounded-2xl hover:bg-stone-200 transition-colors"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex gap-2">
                        <input 
                          value={newSeasonName}
                          onChange={(e) => setNewSeasonName(e.target.value)}
                          className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                          placeholder="e.g. Summer 2026"
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewSeasonInput(false)}
                          className="p-4 bg-stone-100 text-stone-500 rounded-2xl hover:bg-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {googleConnected && (
                  <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <input 
                      type="checkbox" 
                      id="addToCalendar"
                      checked={addToCalendar}
                      onChange={(e) => setAddToCalendar(e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="addToCalendar" className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Add to Google Calendar
                    </label>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] mt-4"
                >
                  Schedule Match
                </button>
              </form>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-black tracking-tight">League History</h2>
              
              {seasons.map(season => {
                const seasonMatches = completedMatches.filter(m => m.season === season);
                if (seasonMatches.length === 0) return null;
                return (
                  <div key={season} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-stone-400 whitespace-nowrap">{season}</h3>
                      <div className="h-px w-full bg-stone-200" />
                    </div>
                    <div className="space-y-3">
                      {seasonMatches.map(match => renderMatchCard(match, () => setShowEditModal(match)))}
                    </div>
                  </div>
                );
              })}

              {completedMatches.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-200 text-stone-400 italic text-sm">
                  No match history found
                </div>
              )}
            </motion.div>
          )}

          {view === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 py-10"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-600/20 mb-6">
                  <User className="text-white w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Player Profile</h2>
                <p className="text-stone-400 font-medium">Enter your name to personalize the app</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Your Full Name</label>
                  <input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required 
                    className="w-full bg-white border border-stone-200 rounded-3xl px-6 py-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-lg"
                    placeholder="e.g. Mark Henry"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Default Start Time</label>
                    <input 
                      type="time"
                      value={defaultStartTime}
                      onChange={(e) => setDefaultStartTime(e.target.value)}
                      required 
                      className="w-full bg-white border border-stone-200 rounded-3xl px-6 py-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Default Duration (min)</label>
                    <input 
                      type="number"
                      value={defaultDuration}
                      onChange={(e) => setDefaultDuration(e.target.value)}
                      required 
                      className="w-full bg-white border border-stone-200 rounded-3xl px-6 py-5 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                {/* Google Calendar Integration */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Integrations</label>
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${googleConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-50 text-stone-400'}`}>
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">Google Calendar</p>
                        <p className="text-xs text-stone-400">{googleConnected ? 'Connected' : 'Not connected'}</p>
                      </div>
                    </div>
                    {!googleConnected ? (
                      <button 
                        type="button"
                        onClick={handleConnectGoogle}
                        className="bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-black transition-all"
                      >
                        Connect
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Management */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Manage Opponents</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        id="new-player-input"
                        className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        placeholder="New opponent name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPlayer((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-player-input') as HTMLInputElement;
                          handleAddPlayer(input.value);
                          input.value = '';
                        }}
                        className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {players.map(p => (
                        <div key={p} className="bg-white border border-stone-200 rounded-full px-3 py-1 flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-600">{p}</span>
                          <button 
                            type="button"
                            onClick={() => handleDeletePlayer(p)}
                            className="text-stone-300 hover:text-red-500 transition-colors"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Surface Management */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Manage Surfaces</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        id="new-surface-input"
                        className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        placeholder="New surface type..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSurface((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('new-surface-input') as HTMLInputElement;
                          handleAddSurface(input.value);
                          input.value = '';
                        }}
                        className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {surfaces.map(s => (
                        <div key={s} className="bg-white border border-stone-200 rounded-full px-3 py-1 flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-600">{s}</span>
                          <button 
                            type="button"
                            onClick={() => handleDeleteSurface(s)}
                            className="text-stone-300 hover:text-red-500 transition-colors"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-stone-900 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Save Settings
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Edit Match Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-black mb-6 text-center tracking-tight">Edit Match</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateMatch({
                ...showEditModal,
                player2: formData.get('player2') as string,
                date: formData.get('date') as string,
                start_time: formData.get('startTime') as string,
                duration: parseInt(formData.get('duration') as string),
                surface: formData.get('surface') as string,
                season: formData.get('season') as string,
                status: formData.get('status') as any,
                score1: setScores.map(s => s.p1).filter(s => s !== '').join(','),
                score2: setScores.map(s => s.p2).filter(s => s !== '').join(','),
              });
            }} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Opponent</label>
                <input name="player2" defaultValue={showEditModal.player2} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Date</label>
                  <input type="date" name="date" defaultValue={showEditModal.date} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Time</label>
                  <input type="time" name="startTime" defaultValue={showEditModal.start_time || ''} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Duration</label>
                  <input type="number" name="duration" defaultValue={showEditModal.duration || 0} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Surface</label>
                  <select name="surface" defaultValue={showEditModal.surface} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold">
                    {surfaces.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Season</label>
                  <input name="season" defaultValue={showEditModal.season} required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Status</label>
                  <select name="status" defaultValue={showEditModal.status} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-stone-100">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Scores per Set</label>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                  <div className="font-bold text-stone-400 text-[9px] uppercase tracking-widest">Player</div>
                  <div className="text-center font-bold text-stone-400 text-[9px] uppercase w-10">Set 1</div>
                  <div className="text-center font-bold text-stone-400 text-[9px] uppercase w-10">Set 2</div>
                  <div className="text-center font-bold text-stone-400 text-[9px] uppercase w-10">Set 3</div>
                  
                  <div className="font-black text-stone-800 text-xs truncate">{showEditModal.player1}</div>
                  {setScores.map((s, i) => (
                    <input 
                      key={i}
                      type="number"
                      value={s.p1}
                      onChange={(e) => {
                        const newScores = [...setScores];
                        newScores[i].p1 = e.target.value;
                        setSetScores(newScores);
                      }}
                      className="w-10 h-10 text-center font-black bg-stone-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  ))}
                  {[...Array(3 - setScores.length)].map((_, i) => (
                    <div key={i} className="w-10 h-10 bg-stone-50 rounded-lg border border-dashed border-stone-200" />
                  ))}

                  <div className="font-black text-stone-800 text-xs truncate">{showEditModal.player2}</div>
                  {setScores.map((s, i) => (
                    <input 
                      key={i}
                      type="number"
                      value={s.p2}
                      onChange={(e) => {
                        const newScores = [...setScores];
                        newScores[i].p2 = e.target.value;
                        setSetScores(newScores);
                      }}
                      className="w-10 h-10 text-center font-black bg-stone-100 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                  ))}
                  {[...Array(3 - setScores.length)].map((_, i) => (
                    <div key={i} className="w-10 h-10 bg-stone-50 rounded-lg border border-dashed border-stone-200" />
                  ))}
                </div>

                <div className="flex gap-2">
                  {setScores.length < 3 && (
                    <button 
                      type="button"
                      onClick={() => setSetScores([...setScores, { p1: '', p2: '' }])}
                      className="flex-1 py-2 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-[10px] font-bold uppercase hover:border-emerald-500 hover:text-emerald-600 transition-all"
                    >
                      + Add Set
                    </button>
                  )}
                  {setScores.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => setSetScores(setScores.slice(0, -1))}
                      className="flex-1 py-2 border-2 border-dashed border-red-100 rounded-xl text-red-300 text-[10px] font-bold uppercase hover:border-red-500 hover:text-red-600 transition-all"
                    >
                      - Remove Set
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 py-4 font-black text-stone-400 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 font-black text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
                >
                  Update
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Score Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl"
          >
            <h3 className="text-2xl font-black mb-8 text-center tracking-tight">Match Score</h3>
            
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                <div className="font-bold text-stone-400 text-xs uppercase tracking-widest">Player</div>
                <div className="text-center font-bold text-stone-400 text-[10px] uppercase w-10">Set 1</div>
                <div className="text-center font-bold text-stone-400 text-[10px] uppercase w-10">Set 2</div>
                <div className="text-center font-bold text-stone-400 text-[10px] uppercase w-10">Set 3</div>
                
                <div className="font-black text-stone-800 truncate">{showScoreModal.player1}</div>
                {setScores.map((s, i) => (
                  <input 
                    key={i}
                    type="number"
                    value={s.p1}
                    onChange={(e) => {
                      const newScores = [...setScores];
                      newScores[i].p1 = e.target.value;
                      setSetScores(newScores);
                    }}
                    className="w-10 h-12 text-center font-black bg-stone-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ))}
                {[...Array(3 - setScores.length)].map((_, i) => (
                  <div key={i} className="w-10 h-12 bg-stone-50 rounded-xl border border-dashed border-stone-200" />
                ))}

                <div className="font-black text-stone-800 truncate">{showScoreModal.player2}</div>
                {setScores.map((s, i) => (
                  <input 
                    key={i}
                    type="number"
                    value={s.p2}
                    onChange={(e) => {
                      const newScores = [...setScores];
                      newScores[i].p2 = e.target.value;
                      setSetScores(newScores);
                    }}
                    className="w-10 h-12 text-center font-black bg-stone-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                ))}
                {[...Array(3 - setScores.length)].map((_, i) => (
                  <div key={i} className="w-10 h-12 bg-stone-50 rounded-xl border border-dashed border-stone-200" />
                ))}
              </div>

              {setScores.length < 3 && (
                <button 
                  onClick={() => setSetScores([...setScores, { p1: '', p2: '' }])}
                  className="w-full py-3 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 text-xs font-bold uppercase hover:border-emerald-500 hover:text-emerald-600 transition-all"
                >
                  + Add Set
                </button>
              )}
              {setScores.length > 1 && (
                <button 
                  onClick={() => setSetScores(setScores.slice(0, -1))}
                  className="w-full py-3 border-2 border-dashed border-red-100 rounded-2xl text-red-300 text-xs font-bold uppercase hover:border-red-500 hover:text-red-600 transition-all mt-2"
                >
                  - Remove Set
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowScoreModal(null);
                  setSetScores([{ p1: '', p2: '' }]);
                }}
                className="flex-1 py-4 font-black text-stone-400 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateScore}
                className="flex-1 py-4 font-black text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-stone-200 px-6 py-3 pb-8 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center gap-1.5 transition-all ${view === 'dashboard' ? 'text-emerald-600 scale-110' : 'text-stone-400'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </button>
          <button 
            onClick={() => setView('schedule')}
            className={`flex flex-col items-center gap-1.5 transition-all ${view === 'schedule' ? 'text-emerald-600 scale-110' : 'text-stone-400'}`}
          >
            <PlusCircle className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Add</span>
          </button>
          <button 
            onClick={() => setView('history')}
            className={`flex flex-col items-center gap-1.5 transition-all ${view === 'history' ? 'text-emerald-600 scale-110' : 'text-stone-400'}`}
          >
            <History className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
