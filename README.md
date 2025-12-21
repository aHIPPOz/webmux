# **Wasmux v2 — WebAssembly Operating System Runtime**

Wasmux est un noyau POSIX en JavaScript qui exécute un userland Linux-like en WebAssembly, directement dans le navigateur.

Plus concrètement Wasmux est un **environnement d’exécution de type système d’exploitation**, écrit principalement en **JavaScript**, destiné à exécuter des applications **WebAssembly (Wasm)** compilées pour une **ABI POSIX-like custom basée sur WASI**, directement **dans le navigateur** ou dans des runtimes compatibles WebAssembly.

Wasmux **n’est pas Linux**, mais implémente une **couche de compatibilité POSIX/Linux userland** réaliste, portable et sécurisée, au-dessus des Web APIs modernes.

---

## 🎯 Objectifs du projet

* Fournir un **kernel Wasm userland** portable
* Implémenter un **runtime WASI custom** avec syscalls POSIX-like
* Offrir un **root filesystem Linux-like persistant** (OPFS)
* Exécuter des **applications Wasm comme des processus**
* Proposer un **display server graphique** rendu dans un canvas
* Fournir un **gestionnaire de paquets Wasm (`wpm`)**
* Être **100 % sandboxé**, sans dépendre d’un OS hôte spécifique

---

## 🧠 Philosophie

> Le navigateur (ou le runtime Wasm) est le *micro-kernel*.
> Wasmux est un *kernel userland*.

Wasmux ne tente **pas** de recompiler Linux ou Wayland tels quels.
Il implémente **les comportements observables nécessaires** pour faire fonctionner des applications POSIX modernes dans un environnement Wasm.

---

## 🧩 Architecture globale

```
┌──────────────────────────────────────────┐
│ UI Host                                  │
│  - HTML / Canvas / WebGPU                │
│  - Input (keyboard, mouse)               │
└───────────────▲──────────────────────────┘
                │ display protocol
┌───────────────┴──────────────────────────┐
│ Wasmux Display Server (WDS)               │
│  - Window management                     │
│  - Compositing                           │
│  - Event routing                         │
└───────────────▲──────────────────────────┘
                │ IPC
┌───────────────┴──────────────────────────┐
│ Wasmux Kernel (JavaScript / TypeScript)  │
│  - Process manager                       │
│  - POSIX-like syscalls                   │
│  - Virtual FS (OPFS)                     │
│  - Permissions                           │
│  - Scheduler (coopératif)                │
└───────────────▲──────────────────────────┘
                │ WASI imports
┌───────────────┴──────────────────────────┐
│ Wasmux WASI Runtime (custom)              │
│  - wasi_snapshot_preview1                │
│  - Extensions Wasmux                     │
└───────────────▲──────────────────────────┘
                │
┌───────────────┴──────────────────────────┐
│ Applications Wasm                         │
│  - Rust / C / Zig / TinyGo                │
│  - JS via QuickJS (optionnel)             │
└──────────────────────────────────────────┘
```

---

## 🧠 Kernel Wasmux

Le kernel Wasmux est **entièrement écrit en JavaScript** et joue le rôle de :

* gestionnaire de processus
* implémentation POSIX userland
* runtime WASI custom
* médiateur entre Wasm et Web APIs

### Fonctionnalités principales

* `spawn`, `exec`, `exit`
* table de fichiers (`fd`)
* permissions par application
* signaux simulés
* IPC par message passing
* gestion du temps et des horloges

⚠️ Pas de MMU, pas de fork réel, pas de threads noyau.

---

## 📞 Syscalls POSIX-like supportés

Wasmux implémente un **sous-ensemble cohérent et extensible** de POSIX :

| Catégorie   | Support                                  |
| ----------- | ---------------------------------------- |
| fichiers    | `open`, `read`, `write`, `close`, `stat` |
| répertoires | `mkdir`, `readdir`, `unlink`             |
| temps       | `clock_gettime`, `sleep`                 |
| mémoire     | `mmap` (via ArrayBuffer)                 |
| processus   | `exec`, `exit`, `wait`                   |
| signaux     | simulés                                  |
| réseau      | `fetch`, WebSocket                       |

Les syscalls sont mappés vers :

* **OPFS**
* **Fetch API**
* **Web Workers**
* **Timers JS**

---

## 🗂️ Système de fichiers (OPFS)

Wasmux utilise **Origin Private File System (OPFS)** comme disque dur persistant.

### RootFS Linux-like

```
/
├── bin/
├── etc/
├── home/
├── lib/
├── tmp/
├── usr/
│   ├── bin/
│   └── lib/
├── var/
│   └── lib/wpm/
```

* chemins POSIX classiques
* permissions simulées
* métadonnées stockées en JSON
* persistance automatique

---

## 🧬 ABI & Toolchain

### ABI Wasmux

```
ARCH: wasm32
ABI: wasmux-wasi
LIBC: musl-like (custom)
```

### Langages supportés

| Langage              | Statut       |
| -------------------- | ------------ |
| Rust                 | ✅ recommandé |
| C / C++              | ✅            |
| Zig                  | ✅            |
| TinyGo               | ✅            |
| JavaScript (QuickJS) | ⚠️ partiel   |

❌ Node.js natif non supporté
✔ API Node polyfillée partiellement (fs, env, fetch)

---

## 🪟 Wasmux Display Server (WDS)

Wasmux n’utilise **ni X11 ni Wayland**.

Il implémente son propre **display server Wasm-first**, inspiré de Wayland.

### Principe

```
App Wasm
  ↓ libwds
Protocol messages
  ↓
WDS (JS)
  ↓
Canvas / WebGL / WebGPU
```

### Fonctionnalités

* fenêtres
* surfaces
* événements clavier/souris
* compositing
* rendu GPU via Web APIs

---

## 📦 wpm — Wasmux Package Manager

Gestionnaire de paquets Wasm natif.

### Format de paquet

```
package.wpm
 ├── rootfs.tar
 └── manifest.json
```

### Manifest

```json
{
  "name": "coreutils",
  "version": "1.0.0",
  "arch": "wasmux-wasi",
  "entry": "/bin/ls",
  "permissions": ["fs", "time"]
}
```

### Installation

```
wpm install coreutils.wpm
```

* extraction dans OPFS
* indexation dans `/var/lib/wpm`

---

## 🚀 Boot sequence

```
index.html
  ↓
boot.js
  ↓
/sbin/init.wasm
  ↓
services
  ↓
shell.wasm
```

Wasmux peut fonctionner :

* en mode terminal
* en mode graphique
* en mode headless (serveur)

---

## 🔐 Sécurité

* sandbox WebAssembly
* permissions déclaratives
* pas d’accès natif au système hôte
* isolation par processus Wasm

---

## ❌ Non-objectifs (clairs)

* Linux kernel réel
* fork/exec kernel-level
* Wayland ou X11 natif
* Electron / Playwright
* modules Node natifs

---

## 🧭 Roadmap

### Phase 1

* kernel minimal
* FS OPFS
* runtime WASI
* shell

### Phase 2

* wpm
* permissions
* apps de base

### Phase 3

* display server
* fenêtres
* multitâche

### Phase 4

* runtime serveur (WasmEdge / Wasmtime)
* mode VM/headless

---

## 🤝 Contributions

* design kernel
* implémentation syscalls
* libc Wasmux
* apps Wasm
* tooling

---

## 📜 Licence

Licence personnalisée — voir `LICENSE`.

---

## 📬 Contact

GitHub : [https://github.com/aHIPPOz](https://github.com/aHIPPOz)
Issues & PR bienvenues.

---

## Petites précisions importentes :

### 1️⃣ Arborescence **réelle** du projet (à la racine)

À la racine, **très peu de choses** :

```txt
/
├── index.html
├── boot.js
└── kernel/
```

➡️ **PAS de** `ui/`, `rootfs/`, `packages/` à la racine.

---

### 2️⃣ Le dossier `kernel/` = tout le noyau + drivers JS

Le dossier `kernel/` contient **uniquement ce qui est du ressort du noyau**, en JavaScript.

Dans le kernel :

* ✔️ Boot logique du système
* ✔️ Runtime WASM / WASI **propriétaire**
* ✔️ Implémentation POSIX / Linux syscalls
* ✔️ Gestion OPFS
* ✔️ Scheduler / process model
* ✔️ Runner WASM
* ✔️ Frontend graphique **minimal** pour :

  * se connecter au `canvas`
  * exposer framebuffer / input
* ❌ **Aucune UI avancée**
* ❌ **Pas de Wayland dans le kernel**

➡️ Le kernel **expose juste des devices** (GPU, input, console), pas de compositor.

---

### 3️⃣ Wayland = **package WASM système**, pas kernel

* Le backend compatible Wayland
* Le compositor
* Le protocole graphique

➡️ Tout ça sera :

* **un package WASM système**
* installé dans le rootfs
* lancé comme un **process userland**
* communique avec le kernel via syscalls

Exactement comme sur Linux :

> kernel DRM / input → Wayland userland

---

### 4️⃣ RootFS : géré dynamiquement par le kernel

* Le kernel **regarde dans OPFS** :

  * si un rootfs existe déjà → il boote dessus
  * sinon → il le télécharge depuis un **repo GitHub externe**
* Le rootfs est :

  * Linux-like
  * arch = wasm / wasi custom
  * persistant via OPFS

➡️ Le kernel **ne contient pas le rootfs**, il le **monte**.

---

### 5️⃣ `wpm` = package WASM userland

* Le kernel contient :

  * le loader WASM
  * l’executor
  * le linker runtime
* `wpm` :

  * est un binaire WASM normal
  * stocké dans le rootfs OPFS
  * géré comme n’importe quel package

➡️ Exactement comme `apt` sur Linux.

---

### 6️⃣ Frontend graphique : minimal, côté kernel

Dans le kernel :

* Création du canvas
* Exposition d’un device type `/dev/fb0`
* Gestion clavier / souris
* Aucun layout, aucune fenêtre

➡️ Tout ce qui est UI **avancée** est userland.

---

## 🧠 Résumé ultra-court

* Kernel JS = **Linux kernel-like**
* Wayland = **process WASM userland**
* Rootfs = **OPFS monté dynamiquement**
* wpm = **package WASM**
* Canvas = **device**
* Kernel = **aucune UI riche**

---
