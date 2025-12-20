import { Kernel } from "./kernel.js";
import { mountRootFS } from "./fs/vfs.js";

export async function kernelMain(bootInfo) {
  const kernel = new Kernel(bootInfo);

  await mountRootFS(kernel, bootInfo.rootfs);

  // PID 1
  kernel.spawn("/init.wasm", ["init"]);

  kernel.run();
}
