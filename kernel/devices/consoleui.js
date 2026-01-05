// kernel/devices/consoleui.js
export class ConsoleUIDevice {
    constructor() {
        this.name = 'consoleui';
        this.path = '/dev/consoleui';
        this.elem = null;
        this.buffer = [];
    }
    init() {
        this.elem = document.createElement('div');
        this.elem.id = 'console-ui';
        this.elem.style.cssText = 'position:fixed;bottom:0;left:0;width:100vw;height:30vh;background:#111;color:#0f0;font-family:monospace;overflow:auto;z-index:1000;padding:8px;';
        document.body.appendChild(this.elem);
        this.write('Console graphique initialisée.');
    }
    write(str) {
        this.buffer.push(str);
        if (this.elem) {
            this.elem.textContent = this.buffer.slice(-100).join('\n');
        }
    }
    clear() {
        this.buffer = [];
        if (this.elem) this.elem.textContent = '';
    }
    read() {
        // Non interactif ici, mais peut être étendu pour input utilisateur
        return null;
    }
}