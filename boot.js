import { kernelMain } from "./kernel/main.js";
import { initCanvas } from "./ui/canvas.js";

async function boot() {
  const screen = initCanvas(document.getElementById("screen"));

  const bootInfo = {
    screen,
    arch: "wasm-wasi",
    rootfs: "opfs:/",
    cmdline: "init=/sbin/init"
  };

  await kernelMain(bootInfo);
}

boot();
