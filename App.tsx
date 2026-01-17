
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MOCK_TRACKS } from './constants';
import { Track, Playlist, AIAnalysis } from './types';
import { analyzeTrack } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'biblioteca' | 'definicoes'>('biblioteca');
  const [librarySubTab, setLibrarySubTab] = useState<'playlists' | 'musicas' | 'pastas'>('musicas');
  const [viewingFolderName, setViewingFolderName] = useState<string | null>(null);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isScanningMemory, setIsScanningMemory] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [themeConfig, setThemeConfig] = useState({
    backgroundImage: null as string | null,
    brightness: 0.5,
    blur: 0,
  });

  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isSongMenuOpen, setIsSongMenuOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicImportRef = useRef<HTMLInputElement | null>(null);
  const themeImageRef = useRef<HTMLInputElement | null>(null);

  const ALL_FORMATS = ".mp3,.aac,.wav,.flac,.ogg,.m4a,.opus,.amr,.pcm,audio/*";

  const currentTrack = tracks.length > 0 ? tracks[currentIndex] : null;

  const folders = useMemo(() => {
    const folderMap: Record<string, number> = {};
    tracks.forEach(track => {
      folderMap[track.folderName] = (folderMap[track.folderName] || 0) + 1;
    });
    return Object.entries(folderMap).map(([name, count]) => ({ name, count }));
  }, [tracks]);

  useEffect(() => {
    if (currentTrack) {
      analyzeTrack(currentTrack).then(setAiAnalysis).catch(() => setAiAnalysis(null));
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => handleNext();
    const onError = () => {
      setPlaybackError("Erro: Formato não suportado pelo sistema Android.");
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [currentIndex, isPlaying]);

  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = Array.from(files).map((file: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Desconhecido',
      album: 'Local',
      cover: `https://picsum.photos/seed/${file.name}/400/400`,
      url: URL.createObjectURL(file),
      duration: 0,
      format: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
      genre: 'Local',
      folderName: 'Importado',
      isFavorite: false
    }));

    setTracks(prev => [...prev, ...newTracks]);
  };

  const closeModals = () => {
    setIsScanModalOpen(false);
    setIsThemeModalOpen(false);
    setIsSongMenuOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col relative text-white bg-[#0c0c0e]">
      <div className="fixed inset-0 z-0 overflow-hidden">
        {themeConfig.backgroundImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{ 
              backgroundImage: `url(${themeConfig.backgroundImage})`,
              filter: `brightness(${themeConfig.brightness}) blur(${themeConfig.blur}px)`,
              transform: 'scale(1.1)' 
            }}
          />
        )}
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <input type="file" ref={musicImportRef} onChange={handleImport} accept={ALL_FORMATS} multiple className="hidden" />
        
        {currentTrack && <audio ref={audioRef} src={currentTrack.url} />}

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-44 pt-12">
          {activeTab === 'biblioteca' ? (
            <div className="flex flex-col gap-6">
              <h1 className="text-3xl font-black">Biblioteca</h1>
              <div className="flex gap-4 border-b border-white/5 pb-2">
                <button onClick={() => setLibrarySubTab('musicas')} className={`text-sm font-bold ${librarySubTab === 'musicas' ? 'text-white border-b-2 border-white' : 'text-white/30'}`}>Músicas</button>
                <button onClick={() => setLibrarySubTab('pastas')} className={`text-sm font-bold ${librarySubTab === 'pastas' ? 'text-white border-b-2 border-white' : 'text-white/30'}`}>Pastas</button>
              </div>

              {librarySubTab === 'musicas' && (
                <div className="flex flex-col gap-3">
                  {tracks.length > 0 ? tracks.map((track, idx) => (
                    <div key={track.id} onClick={() => { setCurrentIndex(idx); setIsPlaying(true); }} className={`flex items-center gap-4 p-3 glass rounded-3xl border ${currentIndex === idx ? 'border-[#ff2d55]' : 'border-white/5'}`}>
                      <img src={track.cover} className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 truncate">
                        <h4 className="font-bold text-sm truncate">{track.title}</h4>
                        <p className="text-[10px] text-white/40 uppercase">{track.artist}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center py-20 opacity-20">
                      <p className="font-bold text-xs uppercase">Sem músicas</p>
                      <button onClick={() => musicImportRef.current?.click()} className="mt-4 px-6 py-3 bg-white text-black rounded-xl font-bold">Importar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <h1 className="text-3xl font-black">Definições</h1>
              <button onClick={() => setIsThemeModalOpen(true)} className="glass p-5 rounded-3xl flex justify-between">
                <span className="font-bold">Tema</span>
                <span className="opacity-30">→</span>
              </button>
            </div>
          )}
        </div>

        {currentTrack && !isPlayerExpanded && (
          <div onClick={() => setIsPlayerExpanded(true)} className="fixed bottom-24 left-4 right-4 h-16 glass rounded-2xl flex items-center px-4 z-50">
            <img src={currentTrack.cover} className="w-10 h-10 rounded-lg mr-3" />
            <div className="flex-1 truncate">
              <h4 className="text-xs font-bold truncate">{currentTrack.title}</h4>
            </div>
            <button onClick={handlePlayPause} className="p-2">
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 w-full h-20 nav-gradient flex items-center justify-around z-50 border-t border-white/5">
          <button onClick={() => setActiveTab('biblioteca')} className={`flex flex-col items-center ${activeTab === 'biblioteca' ? 'text-[#ff2d55]' : 'text-white/30'}`}>
            <span className="text-xs font-bold uppercase">Biblioteca</span>
          </button>
          <button onClick={() => setActiveTab('definicoes')} className={`flex flex-col items-center ${activeTab === 'definicoes' ? 'text-[#ff2d55]' : 'text-white/30'}`}>
            <span className="text-xs font-bold uppercase">Definições</span>
          </button>
        </nav>
      </div>

      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black p-8 flex flex-col">
          <button onClick={closeModals} className="mb-8 font-bold">Voltar</button>
          <h2 className="text-2xl font-black mb-8">Tema</h2>
          <button onClick={() => themeImageRef.current?.click()} className="glass p-10 rounded-3xl border-2 border-dashed border-white/10 text-center">
            Selecionar Imagem
          </button>
          <input type="file" ref={themeImageRef} onChange={(e) => {
            const f = e.target.files?.[0];
            if(f) setThemeConfig(prev => ({...prev, backgroundImage: URL.createObjectURL(f)}));
          }} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default App;
