// kernel/devices/clipboard.js — Clipboard Device AMÉLIORÉ

export class ClipboardDevice {
  constructor() {
    console.log('[ClipboardDevice] Initializing...');
    this.name = 'clipboard';
    this.path = '/dev/clipboard';
    this.supported = typeof navigator !== 'undefined' && !!navigator.clipboard;
    this.lastText = '';
    this.readCount = 0;
    this.writeCount = 0;

    if (this.supported) {
      console.log('[ClipboardDevice] Clipboard API available ✓');
    } else {
      console.warn('[ClipboardDevice] Clipboard API not available');
    }
  }

  async read() {
    try {
      if (!this.supported) {
        console.warn('[ClipboardDevice] Clipboard API not available');
        return null;
      }

      console.log('[ClipboardDevice] Reading from clipboard...');
      const text = await navigator.clipboard.readText();
      this.lastText = text;
      this.readCount++;
      console.log(`[ClipboardDevice] Read ${text.length} characters ✓`);
      return text;

    } catch (e) {
      console.error('[ClipboardDevice] Read error:', e.message);
      return null;
    }
  }

  async write(data) {
    try {
      if (!this.supported) {
        console.warn('[ClipboardDevice] Clipboard API not available');
        return false;
      }

      const text = typeof data === 'string' ? data : String(data);
      console.log(`[ClipboardDevice] Writing ${text.length} characters to clipboard...`);

      await navigator.clipboard.writeText(text);
      this.lastText = text;
      this.writeCount++;
      console.log('[ClipboardDevice] Write successful ✓');
      return true;

    } catch (e) {
      console.error('[ClipboardDevice] Write error:', e.message);
      return false;
    }
  }

  getLastText() {
    return this.lastText;
  }

  getStats() {
    return {
      supported: this.supported,
      readCount: this.readCount,
      writeCount: this.writeCount,
      lastTextLength: this.lastText.length
    };
  }
}
