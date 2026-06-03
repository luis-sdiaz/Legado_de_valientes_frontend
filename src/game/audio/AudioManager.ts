type Volumes = { master: number; music: number; sfx: number }

class AudioManager {
  private music: HTMLAudioElement | null = null
  private sfx: Record<string, HTMLAudioElement> = {}
  private volumes: Volumes = { master: 1, music: 0.6, sfx: 1 }

  init(manifest: { key: string; path: string }[]) {
    // load SFX and music as HTMLAudioElements lazily
    manifest.forEach((m) => {
      const a = new Audio(m.path)
      a.preload = 'auto'
      a.addEventListener('error', () => {
        console.warn(`Audio missing or failed to load: ${m.path} (key=${m.key})`)
      })
      a.load()
      this.sfx[m.key] = a
    })
    const saved = localStorage.getItem('audio_volumes')
    if (saved) {
      try {
        this.volumes = JSON.parse(saved) as Volumes
      } catch (error) {
        console.warn('Failed to parse saved audio volumes; using defaults.', error)
      }
    }
  }

  playMusic(key: string, loop = true) {
    const a = this.sfx[key]
    if (!a) return
    if (this.music) this.music.pause()
    this.music = a.cloneNode(true) as HTMLAudioElement
    this.music.loop = loop
    this.applyVolumes()
    this.music.play().catch(() => {})
  }

  stopMusic() {
    if (this.music) {
      this.music.pause()
      this.music = null
    }
  }

  playSfx(key: string) {
    const a = this.sfx[key]
    if (!a) return
    const inst = a.cloneNode(true) as HTMLAudioElement
    inst.volume = this.volumes.master * this.volumes.sfx
    inst.play().catch(() => {})
  }

  setMasterVolume(v: number) {
    this.volumes.master = v
    this.save()
    this.applyVolumes()
  }
  setMusicVolume(v: number) {
    this.volumes.music = v
    this.save()
    this.applyVolumes()
  }
  setSfxVolume(v: number) {
    this.volumes.sfx = v
    this.save()
    this.applyVolumes()
  }

  private applyVolumes() {
    if (this.music) this.music.volume = this.volumes.master * this.volumes.music
  }

  private save() {
    localStorage.setItem('audio_volumes', JSON.stringify(this.volumes))
  }
}

const audioManager = new AudioManager()
export default audioManager
