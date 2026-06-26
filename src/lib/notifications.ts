/**
 * Web Notification Helper
 * Handles browser push notifications if granted, else gracefully falls back to in-app alerts.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

export function triggerNotification(title: string, body: string, icon?: string) {
  // Try native notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: icon,
        silent: false,
      });
      return true;
    } catch (e) {
      console.error("Native notification failed, falling back", e);
    }
  }

  // Fallback to in-app notification audio (optional)
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    oscillator.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.35);
  } catch (e) {
    // Audio Context blocked or unsupported, fail silently
  }

  return false;
}
