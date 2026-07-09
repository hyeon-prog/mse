const MUTE_KEY = 'mse-sound-muted'

let audioCtx = null

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioCtx) audioCtx = new AudioContextClass()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

export function isMuted() {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(value) {
  localStorage.setItem(MUTE_KEY, value ? '1' : '0')
}

export function toggleMuted() {
  const next = !isMuted()
  setMuted(next)
  return next
}

function tone(ctx, { freq, type = 'square', start = 0, duration = 0.1, gain = 0.15, endFreq }) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = type
  const t0 = ctx.currentTime + start
  osc.frequency.setValueAtTime(freq, t0)
  if (endFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration)
  }
  gainNode.gain.setValueAtTime(gain, t0)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function noiseBurst(ctx, { duration = 0.2, gain = 0.2, start = 0 }) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const gainNode = ctx.createGain()
  const t0 = ctx.currentTime + start
  gainNode.gain.setValueAtTime(gain, t0)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  noise.connect(gainNode)
  gainNode.connect(ctx.destination)
  noise.start(t0)
}

function play(fn) {
  if (isMuted()) return
  const ctx = getContext()
  if (!ctx) return
  try {
    fn(ctx)
  } catch {
    // 자동재생 정책 등으로 재생이 막혀도 게임 진행에는 영향 없음
  }
}

function arpeggio(freqs, opts) {
  play((ctx) => {
    freqs.forEach((freq, i) => tone(ctx, { ...opts, freq, start: (opts?.start ?? 0) + i * (opts?.step ?? 0.08) }))
  })
}

export const sfx = {
  click: () => play((ctx) => tone(ctx, { freq: 440, type: 'square', duration: 0.05, gain: 0.1 })),
  select: () => play((ctx) => tone(ctx, { freq: 660, type: 'square', duration: 0.05, gain: 0.1 })),
  invalid: () => play((ctx) => tone(ctx, { freq: 160, type: 'sawtooth', duration: 0.15, gain: 0.12 })),
  pop: () => play((ctx) => tone(ctx, { freq: 880, endFreq: 1400, type: 'square', duration: 0.08, gain: 0.12 })),
  merge: () => play((ctx) => tone(ctx, { freq: 520, endFreq: 900, type: 'triangle', duration: 0.12, gain: 0.15 })),
  drop: () => play((ctx) => tone(ctx, { freq: 220, endFreq: 90, type: 'square', duration: 0.1, gain: 0.15 })),
  lineClear: () => arpeggio([660, 880, 1100, 1320], { type: 'square', duration: 0.09, gain: 0.14, step: 0.06 }),
  hit: () => play((ctx) => noiseBurst(ctx, { duration: 0.12, gain: 0.2 })),
  explosion: () =>
    play((ctx) => {
      noiseBurst(ctx, { duration: 0.3, gain: 0.25 })
      tone(ctx, { freq: 140, endFreq: 40, type: 'sawtooth', duration: 0.3, gain: 0.2 })
    }),
  flag: () => play((ctx) => tone(ctx, { freq: 700, endFreq: 1000, type: 'triangle', duration: 0.08, gain: 0.12 })),
  win: () => arpeggio([523, 659, 784, 1047], { type: 'square', duration: 0.16, gain: 0.15, step: 0.1 }),
  lose: () => arpeggio([400, 340, 260, 180], { type: 'sawtooth', duration: 0.18, gain: 0.15, step: 0.12 }),
  combo: (level = 1) => play((ctx) => tone(ctx, { freq: 500 + level * 80, type: 'square', duration: 0.1, gain: 0.13 })),
  punch: () => play((ctx) => noiseBurst(ctx, { duration: 0.07, gain: 0.18 })),
  kick: () => play((ctx) => noiseBurst(ctx, { duration: 0.12, gain: 0.22 })),
  block: () => play((ctx) => tone(ctx, { freq: 300, type: 'square', duration: 0.05, gain: 0.1 })),
  jump: () => play((ctx) => tone(ctx, { freq: 300, endFreq: 600, type: 'sine', duration: 0.12, gain: 0.1 })),
  launch: () => play((ctx) => tone(ctx, { freq: 200, endFreq: 700, type: 'sawtooth', duration: 0.15, gain: 0.15 })),
}
