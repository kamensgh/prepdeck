/** Asks for the microphone once (during setup) and releases it straight away. */
export async function requestMic(): Promise<'ok' | 'mic-denied' | 'no-device'> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'ok';
  } catch (e) {
    return e instanceof DOMException && e.name === 'NotFoundError' ? 'no-device' : 'mic-denied';
  }
}

/** Browser-specific steps to re-enable a denied microphone. */
export function micHelp(): string {
  const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  return safari
    ? 'Open Safari Settings → Websites → Microphone, set this site to Allow, then try again.'
    : 'Click the icon to the left of the address bar, set Microphone to Allow, then try again.';
}
