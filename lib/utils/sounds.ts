/**
 * Sound effects utilities
 */

let moveSound: HTMLAudioElement | null = null;
let captureSound: HTMLAudioElement | null = null;

// Initialize sounds (call this once on client-side)
export function initSounds() {
  if (typeof window !== 'undefined') {
    moveSound = new Audio('/move.wav');
    captureSound = new Audio('/capture.wav');
    
    // Preload sounds
    moveSound.load();
    captureSound.load();
  }
}

export function playMoveSound() {
  if (moveSound) {
    moveSound.currentTime = 0;
    moveSound.play().catch(() => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
    });
  }
}

export function playCaptureSound() {
  if (captureSound) {
    captureSound.currentTime = 0;
    captureSound.play().catch(() => {
      // Ignore errors
    });
  }
}
