
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  url: string;
  duration: number;
  format: string;
  genre: string;
  folderName: string;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  cover: string;
  isFavorite?: boolean;
  trackIds: string[]; // Adicionado para gerir as músicas dentro da playlist
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  currentTime: number;
  volume: number;
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
}

export interface AIAnalysis {
  mood: string;
  description: string;
  colorPalette: string[];
}
