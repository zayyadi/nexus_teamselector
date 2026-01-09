
import React, { useState, useMemo, useRef } from 'react';
import { Player, Team, GeneratorConfig } from './types';
import { aggressiveShuffle } from './utils/shuffle';
import { generateTeamIdentities } from './services/geminiService';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const [step, setStep] = useState<'config' | 'players' | 'results'>('config');
  const [config, setConfig] = useState<GeneratorConfig>({
    playersPerTeam: 2,
    numberOfTeams: 2
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalRequired = useMemo(() => config.playersPerTeam * config.numberOfTeams, [config]);

  const handleStartNaming = () => {
    const initialPlayers: Player[] = Array.from({ length: totalRequired }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: ''
    }));
    setPlayers(initialPlayers);
    setStep('players');
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Split by comma, newline, or semicolon
      const names = text.split(/[,\n\r;]+/).map(n => n.trim()).filter(n => n.length > 0);
      
      const newPlayers = [...players];
      names.forEach((name, index) => {
        if (index < newPlayers.length) {
          newPlayers[index].name = name;
        }
      });
      setPlayers(newPlayers);
      if (names.length < totalRequired) {
        setError(`Imported ${names.length} names. Filled remaining slots with blanks.`);
      } else {
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateTeams = async () => {
    if (players.some(p => !p.name.trim())) {
      setError("Please provide names for all players.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const shuffled = aggressiveShuffle<Player>(players, 10);
      const newTeams: Team[] = [];
      for (let i = 0; i < config.numberOfTeams; i++) {
        const start = i * config.playersPerTeam;
        const teamPlayers = shuffled.slice(start, start + config.playersPerTeam);
        newTeams.push({
          id: i,
          name: `Team ${i + 1}`,
          slogan: 'Shuffling the deck...',
          players: teamPlayers
        });
      }

      setTeams(newTeams);
      setStep('results');

      const identities = await generateTeamIdentities(newTeams);
      setTeams(prev => prev.map((t, idx) => ({
        ...t,
        name: identities[idx]?.name || t.name,
        slogan: identities[idx]?.slogan || t.slogan
      })));

    } catch (err) {
      console.error(err);
      setError("An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsImage = async () => {
    if (!resultsRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(resultsRef.current, { cacheBust: true, backgroundColor: '#0f172a' });
      const link = document.createElement('a');
      link.download = `nexus-teams-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPdf = async () => {
    if (!resultsRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(resultsRef.current, { cacheBust: true, backgroundColor: '#0f172a' });
      const pdf = new jsPDF('p', 'px', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`nexus-teams-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setStep('config');
    setPlayers([]);
    setTeams([]);
    setError(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-5xl mx-auto">
      <header className="text-center mb-10 w-full">
        <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          NEXUS SHUFFLER
        </h1>
        <p className="text-slate-400 text-lg">Cryptographically random team generation with AI flair.</p>
      </header>

      <main className="w-full">
        {step === 'config' && (
          <div className="glass-card rounded-2xl p-8 max-w-md mx-auto shadow-2xl animate-in fade-in zoom-in duration-500">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm">1</span>
              Configure Groups
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Players per Set (Team Size)</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.playersPerTeam}
                  onChange={(e) => setConfig({ ...config, playersPerTeam: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Number of Sets (Teams)</label>
                <input
                  type="number"
                  min="2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.numberOfTeams}
                  onChange={(e) => setConfig({ ...config, numberOfTeams: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-300 text-sm">
                  Total players required: <span className="font-bold text-white text-lg">{totalRequired}</span>
                </p>
              </div>

              <button
                onClick={handleStartNaming}
                disabled={totalRequired < 2}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                Proceed to Names
              </button>
            </div>
          </div>
        )}

        {step === 'players' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm">2</span>
                Enter Player Names
              </h2>
              <div className="flex gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleCsvUpload} 
                  accept=".csv,.txt" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Import CSV/Text
                </button>
                <button 
                  onClick={handleReset}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {players.map((player, idx) => (
                <div key={player.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                  <span className="text-slate-500 font-mono text-xs">{idx + 1}</span>
                  <input
                    type="text"
                    placeholder={`Player ${idx + 1}`}
                    className="bg-transparent border-b border-slate-700 focus:border-emerald-500 outline-none w-full py-1 text-slate-100 placeholder-slate-600 transition-all"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 mb-4 text-center text-sm bg-red-400/10 py-2 rounded-lg">{error}</p>}

            <div className="sticky bottom-8 w-full flex justify-center">
              <button
                onClick={handleGenerateTeams}
                disabled={isGenerating}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-12 py-4 rounded-full font-black text-xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3 active:scale-95 transition-all"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "GENERATE TEAMS"
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">The Roster is Ready</h2>
                <p className="text-slate-400">Randomized using High-Entropy Shuffling</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={isExporting}
                  onClick={exportAsImage}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-slate-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  PNG
                </button>
                <button
                  disabled={isExporting}
                  onClick={exportAsPdf}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-slate-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  PDF
                </button>
                 <button
                  onClick={handleGenerateTeams}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-all"
                >
                  Reshuffle
                </button>
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all"
                >
                  New Game
                </button>
              </div>
            </div>

            <div ref={resultsRef} className="export-container rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.map((team, idx) => (
                  <div key={team.id} className="glass-card rounded-2xl overflow-hidden shadow-xl border-t-4 border-t-blue-500 group">
                    <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900">
                      <h3 className="text-2xl font-black text-blue-400 group-hover:text-blue-300 transition-colors uppercase tracking-tight">
                        {team.name}
                      </h3>
                      <p className="text-slate-400 text-sm italic mt-1 font-medium">
                        "{team.slogan}"
                      </p>
                    </div>
                    <div className="p-6 bg-slate-900/40">
                      <ul className="space-y-3">
                        {team.players.map((player, pIdx) => (
                          <li key={player.id} className="flex items-center justify-between text-slate-200">
                            <span className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold border border-slate-700">
                                {pIdx + 1}
                              </span>
                              {player.name}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-blue-500/50"></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 text-center opacity-30">
                <p className="text-[10px] tracking-widest uppercase text-slate-400">Generated by Nexus Shuffler</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 py-8 border-t border-slate-800 w-full text-center">
        <p className="text-slate-500 text-xs tracking-widest uppercase">
          Powered by Gemini 3 Flash & Cryptographic Shuffling
        </p>
      </footer>
    </div>
  );
};

export default App;
