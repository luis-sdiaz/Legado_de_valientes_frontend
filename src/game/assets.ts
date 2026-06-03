export type ImageAsset = { key: string; path: string; width?: number; height?: number }
export type AudioAsset = { key: string; path: string }

export const imageAssets: ImageAsset[] = [
  // Real creature PNGs placed by the user in public/assets/
  { key: 'DRAGÓN',  path: '/assets/dragon.png',  width: 320, height: 320 },
  { key: 'GORILA',  path: '/assets/gorila.png',  width: 320, height: 320 },
  { key: 'ÁGUILA',  path: '/assets/aguila.png',  width: 320, height: 320 },
  { key: 'LEÓN',    path: '/assets/leon.png',    width: 320, height: 320 },
  { key: 'ENEMIGO', path: '/assets/enemigo.png', width: 320, height: 320 },
]

// Audio assets – leave empty until actual audio files are provided
export const audioAssets: AudioAsset[] = []

export default { imageAssets, audioAssets }
