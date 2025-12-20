# 🥾 BOOT FLOW FINAL — WASMUX

> Objectif : reproduire un **boot Linux réel**, mais **entièrement en JS + WASM**, dans le navigateur.

---

## 0️⃣ Chargement navigateur (firmware)

### `index.html`

Rôle équivalent à :

> BIOS / UEFI

Responsabilités :

* Créer le canvas (GPU virtuel)
* Charger `boot.js`
* Aucune logique OS

```txt
index.html
└─ crée le canvas
└─ charge boot.js
```

---

## 1️⃣ Bootloader JS

### `boot.js`

Rôle équivalent à :

> GRUB / systemd-boot

Responsabilités :

* Initialiser l’environnement **matériel JS**
* Accéder à OPFS
* Charger le kernel
* Passer les paramètres de boot

### Actions concrètes :

1. Crée le canvas
2. Initialise :

   * clock
   * random
   * input
3. Vérifie OPFS
4. Appelle le kernel

```txt
boot.js
└─ init canvas
└─ init OPFS
└─ load kernel
└─ kernelMain(bootInfo)
```

---

## 2️⃣ Entrée kernel

### `kernel/main.js`

Rôle équivalent à :

> `start_kernel()`

Responsabilités :

* Créer l’instance Kernel
* Initialiser les subsystèmes
* Monter le rootfs
* Lancer PID 1

---

## 3️⃣ Détection / installation rootfs

Dans le kernel :

1. Vérifie si `/` existe dans OPFS
2. Si OUI :

   * mount OPFS → `/`
3. Si NON :

   * télécharge un rootfs wasm depuis GitHub
   * l’extrait dans OPFS
   * monte `/`

➡️ **Le kernel est autonome**
➡️ Le rootfs est **extérieur au repo**

---

## 4️⃣ Initialisation devices

Le kernel crée des devices internes :

| Device         | Rôle               |
| -------------- | ------------------ |
| `/dev/console` | stdout / stdin     |
| `/dev/fb0`     | framebuffer canvas |
| `/dev/input`   | clavier / souris   |
| `/dev/random`  | entropy            |

➡️ Exposés via syscalls POSIX

---

## 5️⃣ Runtime WASM

Le kernel initialise son runtime :

* Loader WASM
* Mémoire
* Tables
* WASI custom
* Mapping POSIX → WebAPI

➡️ **Pas WASI standard**, mais compatible.

---

## 6️⃣ PID 1

Le kernel lance :

```txt
/init.wasm
```

PID 1 :

* Configure le système
* Lance le compositor Wayland (WASM)
* Lance les services
* Lance un shell

---

## 7️⃣ Userland

À partir de là :

* Tout est **WASM**
* Tout est **userland**
* Kernel ne fait que :

  * scheduler
  * syscalls
  * devices

---

# 📁 NOUVELLE ARBORESCENCE — KERNEL EXACTE

> Tout ce qui suit est **dans `/kernel`**

```txt
kernel/
├── main.js                 # start_kernel()
├── kernel.js               # Kernel core (process, scheduler, syscalls)
│
├── boot/                   # Phase boot interne
│   ├── rootfs.js           # détection / download / mount rootfs
│   └── params.js           # cmdline, arch, env
│
├── devices/                # Devices kernel
│   ├── console.js
│   ├── framebuffer.js      # canvas → /dev/fb0
│   ├── input.js
│   ├── clock.js
│   └── random.js
│
├── fs/                     # VFS
│   ├── vfs.js              # chemins POSIX
│   ├── opfs.js             # backend OPFS
│   └── procfs.js           # /proc
│
├── wasm/                   # Runtime WASM
│   ├── loader.js           # charge .wasm
│   ├── instance.js         # instanciation
│   ├── memory.js           # gestion mémoire
│   └── wasi.js             # WASI custom
│
├── syscalls/               # POSIX / Linux syscalls
│   ├── fs.js               # open/read/write
│   ├── process.js          # fork/exec/exit
│   ├── time.js
│   ├── signal.js
│   └── poll.js
│
├── scheduler/
│   ├── scheduler.js        # coop → préemptif plus tard
│   └── process.js          # PCB
│
└── net/                    # (optionnel futur)
    └── loopback.js
```

---

## 🔑 Points clés (très importants)

* ❌ Aucun package userland dans le kernel
* ❌ Pas de Wayland dans le kernel
* ✔️ Le kernel ne fait que :

  * devices
  * syscalls
  * WASM runtime
* ✔️ Rootfs est **extérieur** et téléchargeable
* ✔️ wpm est **un binaire WASM normal**
* ✔️ UI = device framebuffer, rien de plus

---
