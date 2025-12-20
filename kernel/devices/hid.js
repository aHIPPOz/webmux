// kernel/devices/hid.js


export async function initHID(registry) {
    const devices = await navigator.hid.getDevices();
    for (const d of devices) {
    registry.register({ name: 'hid', path: `/dev/hid-${d.productId}`, device: d });
    }
    }