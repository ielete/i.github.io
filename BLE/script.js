// WebBLE 功能实现

// 全局变量
let device = null;
let characteristic = null;

// 连接蓝牙设备
async function connectToDevice() {
    try {
        if (!navigator.bluetooth) {
            throw new Error('浏览器不支持 Web Bluetooth API');
        }/**/

        console.log('正在扫描设备...');
        device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['generic_access']
        });//0000fee0-0000-1000-8000-00805f9b34fb

        console.log('找到设备:', device.name);
        console.log('正在连接...');
        const server = await device.gatt.connect();
        console.log('已连接设备:', device.name);

        // 监听断开事件
        device.addEventListener('gattserverdisconnected', onDisconnected);

        // 获取服务
        const service = await server.getPrimaryService('generic_access');
        console.log('找到服务:', service.uuid);

        // 获取特征值
        characteristic = await service.getCharacteristic('device_name');
        console.log('找到特征值:', characteristic.uuid);

        // 监听数据接收
        characteristic.addEventListener('characteristicvaluechanged', onDataReceived);
        await characteristic.startNotifications();
        console.log('开始监听数据');

    } catch (error) {
        console.error('蓝牙操作失败:', error);
        alert(`蓝牙操作失败: ${error.message}`);
    }
}

// 断开连接回调
function onDisconnected() {
    console.log('设备已断开:', device.name);
    device = null;
    characteristic = null;
}

// 数据接收回调
function onDataReceived(event) {
    const value = event.target.value;
    const data = new TextDecoder().decode(value);
    console.log('收到数据:', data);
}

// 发送数据
async function sendData(data) {
    if (!characteristic) {
        console.error('未连接到设备');
        return;
    }

    try {
        const encoder = new TextEncoder();
        const value = encoder.encode(data);
        await characteristic.writeValue(value);
        console.log('发送数据:', data);
    } catch (error) {
        console.error('发送失败:', error);
    }
}

// 导出功能
window.connectToDevice = connectToDevice;
window.sendData = sendData;