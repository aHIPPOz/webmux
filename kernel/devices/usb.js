// kernel/devices/usb.js


export async function initUSB(registry) {
    navigator.usb.addEventListener('connect', e => {
    registry.register({ name: 'usb', path: `/dev/usb-${e.device.productId}`, device: e.device });
    });
    }