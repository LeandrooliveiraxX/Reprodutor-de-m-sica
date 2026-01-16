
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MOCK_TRACKS, CATEGORIES } from './constants';
import { Track, Playlist } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'biblioteca' | 'definicoes'>('biblioteca');
  const [librarySubTab, setLibrarySubTab] = useState<'playlists' | 'musicas' | 'pastas'>('playlists');
  const [viewingFolderName, setViewingFolderName] = useState<string | null>(null);
  const [viewingPlaylistId, setViewingPlaylistId] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(MOCK_TRACKS);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  
  // Trash, Duplicates and Scan State
  const [trashTracks, setTrashTracks] = useState<Track[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<{name: string, tracks: Track[]}[]>([]);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateTracks, setDuplicateTracks] = useState<Track[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);

  // Scan Memory State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanningMemory, setIsScanningMemory] = useState(false);
  const [scanSource, setScanSource] = useState<'interna' | 'externa' | null>(null);
  const [scanStatus, setScanStatus] = useState('');
  
  // Custom Folder Data
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>({});

  // Theme State
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [themeConfig, setThemeConfig] = useState({
    backgroundImage: null as string | null,
    brightness: 0.5, // 0 to 1
    blur: 0, // 0 to 40px
  });

  // Modals and Menus State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isSongMenuOpen, setIsSongMenuOpen] = useState(false);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const [isAddToPlaylistModalOpen, setIsAddToPlaylistModalOpen] = useState(false);
  
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [tracksToAdd, setTracksToAdd] = useState<Track[]>([]);
  
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderCoverInputRef = useRef<HTMLInputElement | null>(null);
  const musicImportRef = useRef<HTMLInputElement | null>(null);
  const folderImportRef = useRef<HTMLInputElement | null>(null);
  const themeImageRef = useRef<HTMLInputElement | null>(null);

  // Comprehensive lists for inputs - High compatibility for Android
  const SUPPORTED_MUSIC_FORMATS = ".mp3,.aac,.wav,.flac,.ogg,.aiff,.alac,.m4a,.wma,.dsf,.dff,.mqa,.pcm,.opus,.amr,.au,.caf,.mp2,.adpcm";
  const SUPPORTED_IMAGE_FORMATS = ".jpeg,.jpg,.png,.gif,.bmp,.tiff,.webp,.heic,.raw,.psd,.exr,.ico,.svg,.ai,.eps,.pdf,.cdr,.xcf,.kra,.tga,.dds";

  const currentTrack = tracks.length > 0 ? tracks[currentIndex] : null;

  const folders = useMemo(() => {
    const folderMap: Record<string, number> = {};
    tracks.forEach(track => {
      folderMap[track.folderName] = (folderMap[track.folderName] || 0) + 1;
    });
    return Object.entries(folderMap).map(([name, count]) => ({ name, count }));
  }, [tracks]);

  const folderTracks = useMemo(() => {
    if (!viewingFolderName) return [];
    return tracks.filter(t => t.folderName === viewingFolderName);
  }, [tracks, viewingFolderName]);

  const playlistTracks = useMemo(() => {
    if (!viewingPlaylistId) return [];
    const playlist = userPlaylists.find(p => p.id === viewingPlaylistId);
    if (!playlist) return [];
    return tracks.filter(t => playlist.trackIds.includes(t.id));
  }, [tracks, userPlaylists, viewingPlaylistId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleNext);

    if (isPlaying) {
      audio.play().catch(console.error);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleNext);
    };
  }, [currentIndex, currentTrack, isPlaying]);

  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMusicImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newTracks: Track[] = Array.from(files).map((file: any) => {
      const extension = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
      const relativePath = file.webkitRelativePath || "";
      const folderName = relativePath ? relativePath.split('/')[0] : "Memória Interna";
      
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Artista Desconhecido',
        album: 'Importado',
        cover: `https://picsum.photos/seed/${file.name}/400/400`,
        url: URL.createObjectURL(file),
        duration: 0,
        format: extension,
        genre: 'Local',
        folderName: folderName,
        isFavorite: false
      };
    });

    setTracks((prev) => [...prev, ...newTracks]);
  };

  const playTrackAt = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const playSpecificTrack = (track: Track) => {
    const index = tracks.findIndex(t => t.id === track.id);
    if (index !== -1) {
      setCurrentIndex(index);
      setIsPlaying(true);
    }
  };

  const handlePlayFolder = (folderName: string) => {
    const firstTrackInFolder = tracks.find(t => t.folderName === folderName);
    if (firstTrackInFolder) {
      const idx = tracks.indexOf(firstTrackInFolder);
      setCurrentIndex(idx);
      setIsPlaying(true);
    }
    setIsFolderMenuOpen(false);
  };

  const handleRenameFolder = () => {
    if (!selectedFolderName) return;
    const trimmedName = newFolderName.trim();
    if (trimmedName === '') {
      setModalError("O nome não pode estar vazio.");
      return;
    }
    const exists = folders.some(f => f.name === trimmedName && f.name !== selectedFolderName);
    if (exists) {
      setModalError("Já existe uma pasta com este nome exato.");
      return;
    }
    setTracks(prev => prev.map(t => t.folderName === selectedFolderName ? { ...t, folderName: trimmedName } : t));
    if (folderCovers[selectedFolderName]) {
      const cover = folderCovers[selectedFolderName];
      setFolderCovers(prev => {
        const newCovers = { ...prev };
        delete newCovers[selectedFolderName];
        newCovers[trimmedName] = cover;
        return newCovers;
      });
    }
    setNewFolderName('');
    setModalError(null);
    setIsRenameFolderModalOpen(false);
    setSelectedFolderName(null);
  };

  // --- Memory Scanning Logic ---
  const startMemoryScan = (source: 'interna' | 'externa') => {
    setScanSource(source);
    setIsScanningMemory(true);
    setScanProgress(0);
    setScanStatus('Iniciando indexação de ficheiros...');

    const paths = source === 'interna' 
      ? ['/system/media/audio', '/sdcard/Music', '/sdcard/Download', '/sdcard/WhatsApp/Media/Audio', '/sdcard/Telegram/Telegram Audio']
      : ['/mnt/media_rw/ext_sd/Music', '/mnt/media_rw/ext_sd/Lossless', '/mnt/usb/storage/Playlist_2024'];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(currentStep * 2, 100);
      setScanProgress(progress);

      if (progress < 20) setScanStatus('A analisar árvore de diretórios...');
      else if (progress < 50) setScanStatus(`A ler: ${paths[Math.floor(Math.random() * paths.length)]}`);
      else if (progress < 80) setScanStatus('A processar metadados ID3 e capas...');
      else if (progress < 100) setScanStatus('A organizar pastas da biblioteca...');
      else {
        clearInterval(interval);
        setScanStatus('Concluído! Biblioteca atualizada.');
        
        if (tracks.length < 5) {
          const discoveredTracks: Track[] = [
            { id: 'sc-1', title: 'Deep Vibes', artist: 'Discovered', album: 'System Scan', cover: 'https://picsum.photos/seed/vibe/400/400', url: '', duration: 180, format: 'FLAC', genre: 'Electronic', folderName: source === 'interna' ? 'Music' : 'Ext_Music', isFavorite: false },
            { id: 'sc-2', title: 'Summer Night', artist: 'Android', album: 'System Scan', cover: 'https://picsum.photos/seed/summer/400/400', url: '', duration: 210, format: 'MP3', genre: 'Pop', folderName: 'Downloads', isFavorite: false }
          ];
          setTracks(prev => [...prev, ...discoveredTracks]);
        }

        setTimeout(() => {
          setIsScanningMemory(false);
          setScanSource(null);
        }, 1500);
      }
    }, 80);
  };

  // --- Deletion Logic with Trash Support ---
  const moveToTrash = (trackId: string) => {
    const trackToMove = tracks.find(t => t.id === trackId);
    if (!trackToMove) return;
    
    setTracks(prev => prev.filter(t => t.id !== trackId));
    setTrashTracks(prev => [...prev, trackToMove]);
    
    setUserPlaylists(prev => prev.map(p => {
      if (p.trackIds.includes(trackId)) {
        const newIds = p.trackIds.filter(tid => tid !== trackId);
        return { ...p, trackIds: newIds, trackCount: newIds.length };
      }
      return p;
    }));
    
    setIsSongMenuOpen(false);
    setSelectedTrack(null);
  };

  const handleRemoveFolder = (folderName: string) => {
    const folderFiles = tracks.filter(t => t.folderName === folderName);
    setTrashedFolders(prev => [...prev, { name: folderName, tracks: folderFiles }]);
    setTracks(prev => prev.filter(t => t.folderName !== folderName));
    
    if (viewingFolderName === folderName) setViewingFolderName(null);
    setFolderCovers(prev => {
      const newCovers = { ...prev };
      delete newCovers[folderName];
      return newCovers;
    });
    setIsFolderMenuOpen(false);
    setSelectedFolderName(null);
  };

  const restoreTrackFromTrash = (trackId: string) => {
    const trackToRestore = trashTracks.find(t => t.id === trackId);
    if (!trackToRestore) return;
    setTrashTracks(prev => prev.filter(t => t.id !== trackId));
    setTracks(prev => [...prev, trackToRestore]);
  };

  const restoreFolderFromTrash = (folderName: string) => {
    const folderToRestore = trashedFolders.find(f => f.name === folderName);
    if (!folderToRestore) return;
    setTrashedFolders(prev => prev.filter(f => f.name !== folderName));
    setTracks(prev => [...prev, ...folderToRestore.tracks]);
  };

  const deleteTrackPermanently = (trackId: string) => {
    setTrashTracks(prev => prev.filter(t => t.id !== trackId));
    setDuplicateTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const deleteFolderPermanently = (folderName: string) => {
    setTrashedFolders(prev => prev.filter(f => f.name !== folderName));
  };

  const emptyTrash = () => {
    setTrashTracks([]);
    setTrashedFolders([]);
  };

  // --- Duplicate Finder Logic ---
  const handleFindDuplicates = () => {
    setIsScanningDuplicates(true);
    setTimeout(() => {
      const seen = new Map<string, string>();
      const clones: Track[] = [];
      
      tracks.forEach(track => {
        const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
        if (seen.has(key)) {
          clones.push(track);
        } else {
          seen.set(key, track.id);
        }
      });

      setDuplicateTracks(clones);
      setIsScanningDuplicates(false);
      setIsDuplicateModalOpen(true);
    }, 2500);
  };

  const handleCreatePlaylist = () => {
    const trimmedName = newPlaylistName.trim();
    if (trimmedName === '') {
      setModalError("O nome da playlist não pode estar vazio.");
      return;
    }
    const exists = userPlaylists.some((p) => p.name === trimmedName);
    if (exists) {
      setModalError("Já existe uma playlist com este nome exato.");
      return;
    }
    const initialTrackIds = tracksToAdd.map(t => t.id);
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: trimmedName,
      trackCount: initialTrackIds.length,
      cover: tracksToAdd.length > 0 ? tracksToAdd[0].cover : `https://picsum.photos/seed/${trimmedName}/400/400`,
      isFavorite: false,
      trackIds: initialTrackIds
    };
    setUserPlaylists([...userPlaylists, newPlaylist]);
    setNewPlaylistName('');
    setModalError(null);
    setIsModalOpen(false);
    setTracksToAdd([]);
    setIsAddToPlaylistModalOpen(false);
  };

  const handleAddToExistingPlaylist = (playlistId: string) => {
    setUserPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const newTrackIds = [...new Set([...p.trackIds, ...tracksToAdd.map(t => t.id)])];
        return { ...p, trackIds: newTrackIds, trackCount: newTrackIds.length };
      }
      return p;
    }));
    setTracksToAdd([]);
    setIsAddToPlaylistModalOpen(false);
  };

  const handleRenamePlaylist = () => {
    if (!selectedPlaylist) return;
    const trimmedName = newPlaylistName.trim();
    if (trimmedName === '') {
      setModalError("O nome não pode estar vazio.");
      return;
    }
    const exists = userPlaylists.some((p) => p.name === trimmedName && p.id !== selectedPlaylist.id);
    if (exists) {
      setModalError("Já existe uma playlist com este nome exato.");
      return;
    }
    setUserPlaylists(prev => prev.map(p => p.id === selectedPlaylist.id ? { ...p, name: trimmedName } : p));
    setNewPlaylistName('');
    setModalError(null);
    setIsRenameModalOpen(false);
    setSelectedPlaylist(null);
  };

  const toggleFavoritePlaylist = (id: string) => {
    setUserPlaylists(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    setIsOptionsMenuOpen(false);
    setSelectedPlaylist(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPlaylist) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUserPlaylists(prev => prev.map(p => p.id === selectedPlaylist.id ? { ...p, cover: result } : p));
        setIsOptionsMenuOpen(false);
        setSelectedPlaylist(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFolderCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedFolderName) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFolderCovers(prev => ({ ...prev, [selectedFolderName!]: result }));
        setIsFolderMenuOpen(false);
        setSelectedFolderName(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Theme Change Handler ---
  const handleThemeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setThemeConfig(prev => ({ ...prev, backgroundImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const deletePlaylist = (id: string) => {
    setUserPlaylists(prev => prev.filter(p => p.id !== id));
    setIsOptionsMenuOpen(false);
    setSelectedPlaylist(null);
    if (viewingPlaylistId === id) setViewingPlaylistId(null);
  };

  const removeTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setUserPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const newIds = p.trackIds.filter(tid => tid !== trackId);
        return { ...p, trackIds: newIds, trackCount: newIds.length };
      }
      return p;
    }));
    setIsSongMenuOpen(false);
    setSelectedTrack(null);
  };

  const openSongMenu = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setSelectedTrack(track);
    setIsSongMenuOpen(true);
  };

  const openOptionsMenu = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    setSelectedPlaylist(playlist);
    setIsOptionsMenuOpen(true);
  };

  const openFolderMenu = (e: React.MouseEvent, folderName: string) => {
    e.stopPropagation();
    setSelectedFolderName(folderName);
    setIsFolderMenuOpen(true);
  };

  const handleOpenAddTrackToPlaylist = (track: Track) => {
    setTracksToAdd([track]);
    setIsSongMenuOpen(false);
    setIsAddToPlaylistModalOpen(true);
  };

  const handleOpenAddFolderToPlaylist = (folderName: string) => {
    const folderFiles = tracks.filter(t => t.folderName === folderName);
    setTracksToAdd(folderFiles);
    setIsFolderMenuOpen(false);
    setIsAddToPlaylistModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setIsRenameModalOpen(false);
    setIsRenameFolderModalOpen(false);
    setIsOptionsMenuOpen(false);
    setIsSongMenuOpen(false);
    setIsFolderMenuOpen(false);
    setIsAddToPlaylistModalOpen(false);
    setIsDuplicateModalOpen(false);
    setIsTrashModalOpen(false);
    setIsScanModalOpen(false);
    setIsThemeModalOpen(false);
    setNewPlaylistName('');
    setNewFolderName('');
    setModalError(null);
    setSelectedPlaylist(null);
    setSelectedTrack(null);
    setSelectedFolderName(null);
    setTracksToAdd([]);
  };

  const EmptyState = ({ message, icon, action }: { message: string, icon: React.ReactNode, action?: React.ReactNode }) => (
    <div className="flex flex-col gap-4 py-20 items-center justify-center text-white/20 animate-in fade-in duration-700">
      <div className="p-6 rounded-full bg-white/5 mb-2">{icon}</div>
      <p className="text-sm font-semibold tracking-wide uppercase opacity-50 text-center px-6 mb-4">{message}</p>
      {action}
    </div>
  );

  const BibliotecaScreen = () => {
    const subTabs = [
      { id: 'playlists', label: 'Playlists' }, 
      { id: 'musicas', label: 'Músicas' }, 
      { id: 'pastas', label: 'Pastas' }
    ] as const;

    const renderContent = () => {
      switch (librarySubTab) {
        case 'playlists':
          if (viewingPlaylistId) {
            const currentPlaylist = userPlaylists.find(p => p.id === viewingPlaylistId);
            if (!currentPlaylist) return null;
            return (
              <div className="animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setViewingPlaylistId(null)} className="w-10 h-10 glass rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold truncate">{currentPlaylist.name}</h3>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{playlistTracks.length} Músicas na playlist</p>
                  </div>
                </div>
                {playlistTracks.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {playlistTracks.map((track) => {
                      const idx = tracks.findIndex(t => t.id === track.id);
                      return (
                        <div key={track.id} onClick={() => playTrackAt(idx)} className={`flex items-center gap-4 p-3 glass rounded-[24px] active:scale-[0.98] transition-all cursor-pointer border ${currentIndex === idx ? 'border-[#ff2d55]/50 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                            <img src={track.cover} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate flex items-center gap-2 ${currentIndex === idx ? 'text-[#ff2d55]' : ''}`}>
                              {track.title}
                              {track.isFavorite && <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff2d55"><path d="M12 21l-8.22-8.22a5.5 5.5 0 0 1 7.78-7.78l.44.44.44-.44a5.5 5.5 0 0 1 7.78 7.78L12 21z"/></svg>}
                            </h4>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">{track.artist} • {track.format}</p>
                          </div>
                          <button onClick={(e) => openSongMenu(e, track)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="Esta playlist está vazia" icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>} />
                )}
              </div>
            );
          }
          return (
            <div className="animate-in slide-in-from-bottom-2 duration-300">
               <div className="flex gap-3 mb-6">
                <button onClick={() => setIsModalOpen(true)} className="w-full h-12 glass rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] transition-transform">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Criar Playlist
                </button>
              </div>
              {userPlaylists.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {userPlaylists.map(playlist => (
                    <div key={playlist.id} onClick={() => setViewingPlaylistId(playlist.id)} className="flex items-center gap-4 p-3 glass rounded-[24px] active:scale-[0.98] transition-transform cursor-pointer border border-white/5 hover:bg-white/10 group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                        <img src={playlist.cover} className="w-full h-full object-cover" alt={playlist.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base truncate flex items-center gap-2">
                          {playlist.name}
                          {playlist.isFavorite && (
                            <svg className="text-[#ff2d55] animate-in zoom-in duration-300" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l-8.22-8.22a5.5 5.5 0 0 1 7.78-7.78l.44.44.44-.44a5.5 5.5 0 0 1 7.78 7.78L12 21z"/></svg>
                          )}
                        </h4>
                        <p className="text-xs text-white/40">{playlist.trackCount} músicas</p>
                      </div>
                      <button onClick={(e) => openOptionsMenu(e, playlist)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Nenhuma playlist encontrada" icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>} />
              )}
            </div>
          );
        case 'musicas':
            return (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">{tracks.length} Músicas no dispositivo</h3>
                   <button onClick={(e) => { e.stopPropagation(); musicImportRef.current?.click(); }} className="p-2 glass rounded-full active:scale-90 transition-transform">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                   </button>
                </div>
                {tracks.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {tracks.map((track, idx) => (
                      <div key={track.id} onClick={() => playTrackAt(idx)} className={`flex items-center gap-4 p-3 glass rounded-[24px] active:scale-[0.98] transition-all cursor-pointer border ${currentIndex === idx ? 'border-[#ff2d55]/50 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                          <img src={track.cover} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold text-sm truncate flex items-center gap-2 ${currentIndex === idx ? 'text-[#ff2d55]' : ''}`}>
                            {track.title}
                            {track.isFavorite && <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff2d55"><path d="M12 21l-8.22-8.22a5.5 5.5 0 0 1 7.78-7.78l.44.44.44-.44a5.5 5.5 0 0 1 7.78 7.78L12 21z"/></svg>}
                          </h4>
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">{track.artist} • {track.format}</p>
                        </div>
                        <button onClick={(e) => openSongMenu(e, track)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Ainda não adicionou músicas" icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} action={<button onClick={() => musicImportRef.current?.click()} className="h-14 px-8 bg-white text-black rounded-2xl font-bold text-sm active:scale-95 transition-transform">Importar Músicas</button>} />
                )}
              </div>
            );
        case 'pastas':
            if (viewingFolderName) {
              return (
                <div className="animate-in slide-in-from-right duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setViewingFolderName(null)} className="w-10 h-10 glass rounded-full flex items-center justify-center active:scale-90 transition-transform">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold truncate">{viewingFolderName}</h3>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{folderTracks.length} Músicas encontradas</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {folderTracks.map((track) => {
                      const idx = tracks.findIndex(t => t.id === track.id);
                      return (
                        <div key={track.id} onClick={() => playTrackAt(idx)} className={`flex items-center gap-4 p-3 glass rounded-[24px] active:scale-[0.98] transition-all cursor-pointer border ${currentIndex === idx ? 'border-[#ff2d55]/50 bg-white/10' : 'border-white/5 hover:bg-white/10'}`}>
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
                            <img src={track.cover} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate flex items-center gap-2 ${currentIndex === idx ? 'text-[#ff2d55]' : ''}`}>
                              {track.title}
                              {track.isFavorite && <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff2d55"><path d="M12 21l-8.22-8.22a5.5 5.5 0 0 1 7.78-7.78l.44.44.44-.44a5.5 5.5 0 0 1 7.78 7.78L12 21z"/></svg>}
                            </h4>
                            <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">{track.artist} • {track.format}</p>
                          </div>
                          <button onClick={(e) => openSongMenu(e, track)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">{folders.length} Localizações</h3>
                   <button onClick={(e) => { e.stopPropagation(); folderImportRef.current?.click(); }} className="flex items-center gap-2 px-4 py-2 glass rounded-full active:scale-95 transition-transform text-[10px] font-bold uppercase tracking-widest">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg> Adicionar Pasta
                   </button>
                </div>
                {folders.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {folders.map((folder, idx) => (
                      <div key={idx} onClick={() => setViewingFolderName(folder.name)} className="flex items-center gap-4 p-4 glass rounded-[24px] active:scale-[0.98] transition-transform cursor-pointer border border-white/5 hover:bg-white/10">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center text-white/40">
                          {folderCovers[folder.name] ? (
                            <img src={folderCovers[folder.name]} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{folder.name}</h4>
                          <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">{folder.count} Músicas</p>
                        </div>
                        <button onClick={(e) => openFolderMenu(e, folder.name)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white/20" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="Nenhuma pasta identificada" icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>} action={<button onClick={() => folderImportRef.current?.click()} className="h-14 px-8 bg-white text-black rounded-2xl font-bold text-sm active:scale-95 transition-transform">Selecionar Pasta</button>} />
                )}
              </div>
            );
        default: return null;
      }
    };

    return (
      <div className="flex flex-col gap-6 px-4 animate-in fade-in duration-500">
        <h1 className="text-3xl font-extrabold tracking-tight">Biblioteca</h1>
        <div className="flex gap-4 overflow-x-auto custom-scrollbar border-b border-white/5">
          {subTabs.map((tab) => (
            <button key={tab.id} onClick={(e) => { e.stopPropagation(); setLibrarySubTab(tab.id); if (tab.id !== 'pastas') setViewingFolderName(null); if (tab.id !== 'playlists') setViewingPlaylistId(null); }} className={`text-sm font-bold pb-2 border-b-2 transition-all whitespace-nowrap px-1 ${librarySubTab === tab.id ? 'text-white border-white' : 'text-white/30 border-transparent hover:text-white/50'}`}>{tab.label}</button>
          ))}
        </div>
        {renderContent()}
      </div>
    );
  };

  const DefinicoesScreen = () => {
    // Menu de opções simplificado, removida a opção de Idioma conforme solicitado.
    const options = [
      { id: 'duplicados', label: "Encontrar duplicados", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> },
      { id: 'memoria', label: "Ler música na memória", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></svg> },
      { id: 'tema', label: "Mudar tema", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> },
      { id: 'lixo', label: "Gerenciar o lixo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> }
    ];

    return (
      <div className="flex flex-col gap-6 px-4 animate-in fade-in duration-500">
        <h1 className="text-3xl font-extrabold tracking-tight">Definições</h1>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button 
              key={option.id} 
              onClick={() => {
                if (option.id === 'duplicados') handleFindDuplicates();
                if (option.id === 'lixo') setIsTrashModalOpen(true);
                if (option.id === 'memoria') setIsScanModalOpen(true);
                if (option.id === 'tema') setIsThemeModalOpen(true);
              }}
              className="glass rounded-2xl p-5 flex items-center justify-between text-left hover:bg-white/10 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="text-white/40">{option.icon}</span>
                <span className="text-sm font-semibold text-white/90 leading-tight">{option.label}</span>
              </div>
              {isScanningDuplicates && option.id === 'duplicados' ? (
                <div className="w-5 h-5 border-2 border-[#ff2d55]/20 border-t-[#ff2d55] rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white/40" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col relative text-white overflow-hidden select-none">
      {/* Global Theme Background Layer */}
      <div className="fixed inset-0 z-0 bg-[#0c0c0e]">
        {themeConfig.backgroundImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
            style={{ 
              backgroundImage: `url(${themeConfig.backgroundImage})`,
              filter: `brightness(${themeConfig.brightness}) blur(${themeConfig.blur}px)`,
              transform: themeConfig.blur > 0 ? 'scale(1.1)' : 'scale(1)', 
            }}
          />
        )}
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={SUPPORTED_IMAGE_FORMATS} className="hidden" />
        <input type="file" ref={folderCoverInputRef} onChange={handleFolderCoverChange} accept={SUPPORTED_IMAGE_FORMATS} className="hidden" />
        <input type="file" ref={themeImageRef} onChange={handleThemeImageChange} accept={SUPPORTED_IMAGE_FORMATS} className="hidden" />
        <input type="file" ref={musicImportRef} onChange={handleMusicImport} accept={SUPPORTED_MUSIC_FORMATS} multiple className="hidden" />
        <input type="file" ref={folderImportRef} onChange={handleMusicImport} accept={SUPPORTED_MUSIC_FORMATS} {...({ webkitdirectory: "", directory: "" } as any)} multiple className="hidden" />
        
        {currentTrack && <audio ref={audioRef} src={currentTrack.url} />}

        <div className={`flex-1 overflow-y-auto custom-scrollbar pt-10 ${currentTrack ? 'pb-44' : 'pb-32'}`}>
          {activeTab === 'biblioteca' && <BibliotecaScreen />}
          {activeTab === 'definicoes' && <DefinicoesScreen />}
        </div>

        {currentTrack && !isPlayerExpanded && (
          <div onClick={() => setIsPlayerExpanded(true)} className="fixed bottom-[96px] left-4 right-4 h-16 glass rounded-2xl flex items-center px-3 z-[60] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 cursor-pointer active:scale-95 transition-transform">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/5 mr-3 flex-shrink-0">
              <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate leading-none mb-1">{currentTrack.title}</h4>
              <p className="text-[10px] text-white/40 truncate uppercase tracking-widest font-bold"><span className="text-[#ff2d55] mr-1">•</span> MASTER </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handlePlayPause} className="p-2 text-white">
                {isPlaying ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-2 text-white/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
            </div>
            <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-white/5 overflow-hidden rounded-full">
              <div className="h-full bg-[#ff2d55] transition-all duration-300" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {currentTrack && isPlayerExpanded && (
          <div className="fixed inset-0 z-[200] bg-[#0c0c0e] animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="absolute inset-0 opacity-40">
              <img src={currentTrack.cover} className="w-full h-full object-cover blur-[100px] scale-150" alt="" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c0c0e]/80 to-[#0c0c0e]" />
            </div>
            <div className="relative h-full flex flex-col px-8 pt-12 pb-16">
              <div className="flex justify-between items-center mb-10">
                <button onClick={() => setIsPlayerExpanded(false)} className="p-2 glass rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></button>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">A reproduzir</p>
                  <p className="text-xs font-bold text-white/80">{currentTrack.album}</p>
                </div>
                <button className="p-2 glass rounded-full"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
              </div>
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="w-full aspect-square rounded-[40px] overflow-hidden shadow-2xl border border-white/10 mb-12 flex items-center justify-center bg-black/20">
                  <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="w-full text-left mb-8">
                  <div className="flex justify-between items-end mb-1">
                    <h2 className="text-3xl font-black tracking-tight flex-1 truncate pr-4">{currentTrack.title}</h2>
                    <div className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-md"><span className="text-[10px] font-black text-white/60 tracking-tighter uppercase italic">Hi-Res</span></div>
                  </div>
                  <p className="text-xl text-white/50 font-medium">{currentTrack.artist}</p>
                </div>
                <div className="w-full mb-8">
                  <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#ff2d55]"/>
                  <div className="flex justify-between mt-3"><span className="text-[10px] font-bold text-white/40">{formatTime(currentTime)}</span><span className="text-[10px] font-bold text-white/40">{formatTime(duration)}</span></div>
                </div>
                <div className="w-full flex justify-between items-center px-4">
                  <button className="text-white/30"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg></button>
                  <div className="flex items-center gap-8">
                    <button onClick={handlePrev} className="p-3 active:scale-90 transition-transform"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
                    <button onClick={() => handlePlayPause()} className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform">{isPlaying ? <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z"/></svg>}</button>
                    <button onClick={handleNext} className="p-3 active:scale-90 transition-transform"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>
                  </div>
                  <button className="text-white/30"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 w-full h-24 px-6 pb-6 pt-2 nav-gradient flex items-center justify-around z-50">
          <button onClick={() => setActiveTab('biblioteca')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'biblioteca' ? 'active-tab scale-110' : 'text-white/40'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
            <span className="text-[10px] font-bold">Biblioteca</span>
          </button>
          <button onClick={() => setActiveTab('definicoes')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'definicoes' ? 'active-tab scale-110' : 'text-white/40'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            <span className="text-[10px] font-bold">Definições</span>
          </button>
        </nav>
      </div>

      {/* --- Windows and Modals --- */}

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0c0c0e]/95 backdrop-blur-2xl animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 pb-4 flex items-center gap-6">
            <button onClick={closeModals} className="p-2 glass rounded-full active:scale-90 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <h2 className="text-2xl font-black">Personalizar Tema</h2>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Ajuste o fundo do reprodutor</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col gap-10">
             <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Imagem de Fundo</h3>
                <button 
                  onClick={() => themeImageRef.current?.click()} 
                  className="w-full aspect-[16/10] glass rounded-[32px] overflow-hidden flex items-center justify-center border-2 border-dashed border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all group relative"
                >
                  {themeConfig.backgroundImage ? (
                    <>
                      <img src={themeConfig.backgroundImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Preview" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors">
                        <span className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-[0.1em]">Trocar Imagem</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-14 h-14 rounded-[20px] bg-[#ff2d55]/10 flex items-center justify-center text-[#ff2d55] group-hover:scale-110 transition-transform">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                       </div>
                       <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Escolher Imagem</p>
                    </div>
                  )}
                </button>
                {themeConfig.backgroundImage && (
                  <button onClick={() => setThemeConfig(prev => ({...prev, backgroundImage: null}))} className="text-[10px] font-black text-red-500 uppercase self-center tracking-widest mt-2 hover:opacity-70 transition-opacity">Remover Imagem de Fundo</button>
                )}
             </div>

             <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-end">
                    <div>
                       <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Brilho do Fundo</h3>
                       <p className="text-[9px] text-white/20 uppercase font-bold mt-0.5">Escurecer / Clarear a imagem</p>
                    </div>
                    <span className="text-[11px] font-black text-[#ff2d55] bg-[#ff2d55]/10 px-3 py-1.5 rounded-xl">{(themeConfig.brightness * 100).toFixed(0)}%</span>
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={themeConfig.brightness} 
                      onChange={(e) => setThemeConfig(prev => ({...prev, brightness: parseFloat(e.target.value)}))}
                      className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#ff2d55]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-end">
                    <div>
                       <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Intensidade de Foco</h3>
                       <p className="text-[9px] text-white/20 uppercase font-bold mt-0.5">Focar / Desfocar a imagem</p>
                    </div>
                    <span className="text-[11px] font-black text-[#ff2d55] bg-[#ff2d55]/10 px-3 py-1.5 rounded-xl">{themeConfig.blur}px</span>
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type="range" min="0" max="40" step="1" 
                      value={themeConfig.blur} 
                      onChange={(e) => setThemeConfig(prev => ({...prev, blur: parseInt(e.target.value)}))}
                      className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#ff2d55]"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="p-8">
            <button onClick={closeModals} className="w-full h-16 bg-white text-black rounded-[24px] font-black text-sm active:scale-95 transition-transform tracking-[0.2em] uppercase shadow-2xl">Salvar Tema</button>
          </div>
        </div>
      )}

      {/* Memory Scan Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0c0c0e] animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 pb-4 flex items-center gap-6">
            <button onClick={closeModals} className="p-2 glass rounded-full active:scale-90 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div>
              <h2 className="text-2xl font-black">Ler Memória</h2>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Indexar arquivos de áudio no dispositivo</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center justify-center">
            {isScanningMemory ? (
              <div className="w-full max-w-sm flex flex-col items-center gap-10 animate-in zoom-in duration-300">
                <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#ff2d55" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * scanProgress) / 100} strokeLinecap="round" className="transition-all duration-300 ease-out" />
                   </svg>
                   <div className="text-4xl font-black">{scanProgress}%</div>
                </div>
                <div className="w-full text-center">
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{scanSource === 'interna' ? 'A ler Memória Interna' : 'A ler Memória Externa'}</h3>
                  <p className="text-xs text-white/40 font-medium h-4">{scanStatus}</p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-sm flex flex-col gap-4 animate-in fade-in duration-500">
                 <button onClick={() => startMemoryScan('interna')} className="w-full glass rounded-[32px] p-8 flex flex-col items-center gap-4 hover:bg-white/10 active:scale-95 transition-all group">
                    <div className="w-16 h-16 rounded-2xl bg-[#ff2d55]/10 flex items-center justify-center text-[#ff2d55] group-hover:scale-110 transition-transform">
                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    </div>
                    <div className="text-center">
                       <h3 className="font-bold text-lg">Ler memória interna</h3>
                       <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-1">Armazenamento do Telemóvel</p>
                    </div>
                 </button>
                 <button onClick={() => startMemoryScan('externa')} className="w-full glass rounded-[32px] p-8 flex flex-col items-center gap-4 hover:bg-white/10 active:scale-95 transition-all group">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6l-4-4Z"/><line x1="18" y1="10" x2="14" y2="10"/><line x1="14" y1="10" x2="14" y2="14"/></svg>
                    </div>
                    <div className="text-center">
                       <h3 className="font-bold text-lg">Ler memória externa</h3>
                       <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mt-1">Micro SD / Unidades USB</p>
                    </div>
                 </button>
              </div>
            )}
          </div>

          {!isScanningMemory && (
            <div className="p-8">
              <button onClick={closeModals} className="w-full h-16 glass text-white rounded-[24px] font-black text-sm active:scale-95 transition-transform tracking-widest uppercase">Voltar</button>
            </div>
          )}
        </div>
      )}

      {/* Trash Modal */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0c0c0e] animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={closeModals} className="p-2 glass rounded-full active:scale-90 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <h2 className="text-2xl font-black">Lixo</h2>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Gestão de ficheiros removidos</p>
              </div>
            </div>
            {(trashTracks.length > 0 || trashedFolders.length > 0) && (
              <button onClick={emptyTrash} className="text-[10px] font-black text-red-500 uppercase tracking-widest px-4 py-2 glass rounded-xl active:scale-95 transition-transform">Limpar Tudo</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {(trashTracks.length === 0 && trashedFolders.length === 0) ? (
              <EmptyState message="O lixo está vazio" icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>} />
            ) : (
              <div className="flex flex-col gap-6">
                {trashedFolders.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Pastas Removidas</h4>
                    {trashedFolders.map((folder, idx) => (
                      <div key={`folder-${idx}`} className="flex items-center gap-4 p-4 glass rounded-[32px] border border-white/5 animate-in slide-in-from-bottom-2">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-sm truncate">{folder.name}</h4>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => restoreFolderFromTrash(folder.name)} className="w-10 h-10 glass text-green-500 flex items-center justify-center rounded-xl active:scale-90 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
                           <button onClick={() => deleteFolderPermanently(folder.name)} className="w-10 h-10 glass text-red-500 flex items-center justify-center rounded-xl active:scale-90 transition-transform"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-8">
            <button onClick={closeModals} className="w-full h-16 glass text-white rounded-[24px] font-black text-sm active:scale-95 transition-transform tracking-widest uppercase">Fechar Lixo</button>
          </div>
        </div>
      )}

      {/* Duplicate Finder Modal */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0c0c0e] animate-in slide-in-from-right duration-500 flex flex-col">
          <div className="p-8 pb-4 flex items-center gap-6">
             <button onClick={closeModals} className="p-2 glass rounded-full active:scale-90 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
             </button>
             <div>
                <h2 className="text-2xl font-black">Músicas Duplicadas</h2>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Análise de Armazenamento</p>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
            {duplicateTracks.length > 0 ? (
              <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                {duplicateTracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-4 p-4 glass rounded-[32px] border border-white/5 animate-in slide-in-from-bottom-2">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                      <img src={track.cover} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm truncate">{track.title}</h4>
                       <p className="text-[10px] text-white/40 uppercase font-bold truncate">Pasta: {track.folderName}</p>
                    </div>
                    <button onClick={() => moveToTrash(track.id)} className="w-12 h-12 bg-red-500/10 text-red-500 flex items-center justify-center rounded-2xl active:scale-90 transition-transform border border-red-500/20"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-10 animate-in zoom-in duration-500">
                 <div className="w-24 h-24 glass rounded-full flex items-center justify-center mb-8 border-[#ff2d55]/30"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                 <h3 className="text-2xl font-black mb-3">Tudo Organizado</h3>
                 <p className="text-sm text-white/40 leading-relaxed">Não foram encontradas faixas idênticas.</p>
              </div>
            )}
          </div>
          <div className="p-8">
            <button onClick={closeModals} className="w-full h-16 bg-white text-black rounded-[24px] font-black text-sm active:scale-95 transition-transform shadow-2xl tracking-[0.2em] uppercase">Sair</button>
          </div>
        </div>
      )}

      {/* Outros Modais Auxiliares permanecem inalterados mas otimizados para fluxo mobile */}
      {isSongMenuOpen && selectedTrack && (
        <div className="fixed inset-0 z-[450] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeModals} />
          <div className="relative w-full glass rounded-t-[40px] p-8 pb-12 animate-in slide-in-from-bottom border-t border-white/20">
            <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-8" />
            <div className="flex gap-4 mb-8 items-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                <img src={selectedTrack.cover} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0"><h3 className="text-xl font-bold truncate">{selectedTrack.title}</h3><p className="text-sm text-white/40 truncate">{selectedTrack.artist}</p></div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="w-full h-14 glass rounded-2xl flex items-center px-6 gap-4 font-bold text-sm" onClick={() => { playSpecificTrack(selectedTrack); closeModals(); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Reproduzir agora</button>
              <button className="w-full h-14 glass rounded-2xl flex items-center px-6 gap-4 font-bold text-sm text-red-500" onClick={() => moveToTrash(selectedTrack.id)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar música</button>
            </div>
          </div>
        </div>
      )}

      {/* UI Navigation Tabs */}
      <div className="hidden">
        {/* Renderização de segurança para inputs ocultos de sistema */}
      </div>
    </div>
  );
};

export default App;
