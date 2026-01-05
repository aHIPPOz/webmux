/*
kernel/net/loopback.js

Simple loopback network interface for Wasmux kernel.

Purpose:
- Provide a tiny in-memory "network" usable by userland WASM processes (and kernel) for IPC
- Behaves like a simple datagram socket layer (very small subset of UDP-like behavior)
- No real network access; packets are routed to local sockets registered in the loopback namespace

API (exports):
- class LoopbackNetwork()
    - createSocket() -> LoopbackSocket
    - close()
- class LoopbackSocket
    - bind(address)           // address is string like "127.0.0.1:1234" or ":1234" to auto-local
    - send(address, uint8arr) // send datagram to address
    - onmessage = (from, uint8arr) => {}   // callback invoked on incoming datagram
    - close()
- initLoopback(kernel) helper to register /dev/net/loopback device in kernel.devices (if available)

Notes:
- This is intentionally minimal and synchronous where simple; methods return Promises to keep async-compatible.
- Addressing is textual: use "localhost:port" or simply ":port". If socket not bound to an address, send() can still be used as a client.
- Broadcast: send to "*:<port>" will deliver to all sockets bound on that port.

Usage example (kernel side):

  import { LoopbackNetwork, initLoopback } from './net/loopback.js';
  const net = new LoopbackNetwork();
  const s1 = net.createSocket();
  s1.bind(':4000');
  s1.onmessage = (from, buf) => console.log('s1 got', from, new TextDecoder().decode(buf));

  const s2 = net.createSocket();
  s2.bind(':4001');
  s2.send(':4000', new TextEncoder().encode('hello from 4001'));


This file should be placed in kernel/net/loopback.js and imported from the kernel initialization.
*/

export class LoopbackNetwork {
    constructor() {
      // map address -> Set<socket>
      this.socketsByAddr = new Map();
      // keep weak list for cleanup
      this.sockets = new Set();
      this.nextAutoPort = 10000;
    }
  
    _normalizeAddr(addr) {
      // addr forms supported: 'host:port', ':port', 'port' (treated as :port)
      if (!addr) return null;
      if (typeof addr !== 'string') addr = String(addr);
      if (/^\d+$/.test(addr)) return `:${addr}`;
      if (addr.startsWith('localhost:')) return addr.replace('localhost:', ':');
      if (addr.indexOf(':') === -1) return `:${addr}`;
      return addr;
    }
  
    createSocket() {
      try {
        const sock = new LoopbackSocket(this);
        this.sockets.add(sock);
        console.log('[LoopbackNetwork] Socket créé');
        return sock;
      } catch (e) {
        console.error('[LoopbackNetwork] Erreur createSocket:', e);
        throw e;
      }
    }
  
    _registerSocket(addr, sock) {
      addr = this._normalizeAddr(addr);
      if (!addr) throw new Error('invalid addr');
      if (!this.socketsByAddr.has(addr)) this.socketsByAddr.set(addr, new Set());
      this.socketsByAddr.get(addr).add(sock);
    }
  
    _unregisterSocket(addr, sock) {
      addr = this._normalizeAddr(addr);
      const set = this.socketsByAddr.get(addr);
      if (!set) return;
      set.delete(sock);
      if (set.size === 0) this.socketsByAddr.delete(addr);
    }
  
    _resolve(addr) {
      // normalize
      addr = this._normalizeAddr(addr);
      if (!addr) return new Set();
      if (addr.startsWith('*:')) {
        // broadcast to all sockets with that port
        const port = addr.slice(1);
        const out = new Set();
        for (const [a, set] of this.socketsByAddr.entries()) {
          if (a.endsWith(port)) {
            for (const s of set) out.add(s);
          }
        }
        return out;
      }
      return this.socketsByAddr.get(addr) || new Set();
    }
  
    async send(fromAddr, toAddr, uint8arr) {
      // deliver to all matching sockets
      const destSet = this._resolve(toAddr);
      for (const sock of destSet) {
        try {
          // copy payload to prevent accidental mutation
          const payload = (uint8arr instanceof Uint8Array) ? uint8arr.slice() : new Uint8Array(uint8arr);
          // deliver asynchronously to avoid blocking
          setTimeout(() => sock._onInbound(fromAddr, payload), 0);
        } catch (e) {
          // swallow
        }
      }
      return destSet.size;
    }
  
    close() {
      try {
        for (const s of Array.from(this.sockets)) s.close();
        this.sockets.clear();
        this.socketsByAddr.clear();
        console.log('[LoopbackNetwork] Fermé');
      } catch (e) {
        console.error('[LoopbackNetwork] Erreur close:', e);
      }
    }
  }
  
  export class LoopbackSocket {
    constructor(net) {
      this.net = net;
      this.localAddr = null;
      this.onmessage = null; // (from, Uint8Array) => void
      this.closed = false;
    }
  
    async bind(addr) {
      try {
        if (this.closed) throw new Error('socket closed');
        if (!addr) {
          addr = `:${this.net.nextAutoPort++}`;
        }
        addr = this.net._normalizeAddr(addr);
        this.localAddr = addr;
        this.net._registerSocket(addr, this);
        console.log('[LoopbackSocket] Bind:', addr);
        return addr;
      } catch (e) {
        console.error('[LoopbackSocket] Erreur bind:', e);
        throw e;
      }
    }
  
    async send(toAddr, uint8arr) {
      try {
        if (this.closed) throw new Error('socket closed');
        const from = this.localAddr || `:auto-${Math.floor(Math.random()*1e6)}`;
        const res = await this.net.send(from, toAddr, uint8arr);
        console.log('[LoopbackSocket] Send:', from, '->', toAddr, 'octets:', uint8arr.length);
        return res;
      } catch (e) {
        console.error('[LoopbackSocket] Erreur send:', e);
        throw e;
      }
    }
  
    _onInbound(fromAddr, uint8arr) {
      if (this.closed) return;
      if (this.onmessage) {
        try { this.onmessage(fromAddr, uint8arr); } catch (e) { console.error('loopback onmessage handler error', e); }
      }
    }
  
    async close() {
      try {
        if (this.closed) return;
        if (this.localAddr) this.net._unregisterSocket(this.localAddr, this);
        this.closed = true;
        this.net.sockets.delete(this);
        console.log('[LoopbackSocket] Fermé');
      } catch (e) {
        console.error('[LoopbackSocket] Erreur close:', e);
      }
    }
  }
  
  export function initLoopback(kernel) {
    if (!kernel) throw new Error('kernel required');
    const net = new LoopbackNetwork();
    // register a simple device object usable by kernel.syscalls networking
    const dev = {
      name: 'loopback',
      path: '/dev/net/loopback',
      network: net
    };
    if (kernel.devices && typeof kernel.devices.register === 'function') {
      kernel.devices.register(dev);
    } else {
      // fallback attach
      kernel.loopback = dev;
    }
    // expose on kernel for convenience
    kernel.loopbackNet = net;
    return net;
  }
  