// Get references to UI elements
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let deviceCache = null;
let characteristicCache = null;
let readBuffer = '';
const characteristic = null;

// Connect to the device on Connect button click
connectButton.addEventListener('click', function() {
    connect();
});

// Disconnect from the device on Disconnect button click
disconnectButton.addEventListener('click', function() {
    disconnect();
});

// Handle form submit event
sendForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent form sending
    send(inputField.value); // Send text field contents
    inputField.value = '';  // Zero text field
    inputField.focus();     // Focus on text field
});

// Launch Bluetooth device chooser and connect to the selected
function connect() {
    return (deviceCache? Promise.resolve(deviceCache): requestBluetoothDevice()).
    then(device => connectDeviceAndCacheCharacteristic(device)).
    then(characteristic => startNotifications(characteristic)).catch(error => log(error));
}

function requestBluetoothDevice(){
    log('Requesting bluetooth device...');

    return navigator.bluetooth.requestDevice({
        filters: [{services: [0xFFE0]}],
    }).then(device => {
        log('"' + device.name + '"bluetooth device selected');
        deviceCache = device;

        deviceCache.addEventListener('gattserverdisconnected', handleDisconnection);

        return deviceCache;
    });
}

function handleDisconnection(event){
    let device = event.target;

    log('"' + device.name + '"bluetooth device disconnected, trying to reconnect...');

    connectDeviceAndCacheCharacteristic(device).
    then(characteristic => startNotifications(characteristic)).catch(error => log(error));
}

// Connect to the device specifed, get service and characteristic
function connectDeviceAndCacheCharacteristic(device){
    if(device.gatt.connected && characteristicCache){
        return Promise.resolve(characteristicCache);
    }
    log('Connecting to GATT server...');

    return device.gatt.connect().
    then(server =>{log('GATT server connected, getting service...');
        return server.getPrimaryService(0xFFE0);
    }).
    then(service =>{log('Service found, getting characteristic...')
        return service.getCharacteristic(0xFFE1);
    }).
    then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
    });
}

// Enable the characteristic changes notification
function startNotifications(characterstic){
    log('Starting notifications...');

    return characteristic.startNotifications().
    then(() => {
        log('Notifications started');
        characterstic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    });
}

function log(data, type=''){
    terminalContainer.insertAdjacentHTML('beforeend',
        '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Disconnect from the connected device
function disconnect() {
    if(deviceCahce){
        log('Disconnecting from"' + deviceCache.name + '" bluetooth device...');
        deviceCache.removeEventListener('gattserverdisconnected', handleDisconnection);

        if(deviceCahce.gatt.connected){
            deviceCache.gatt.disconnect();
            log('"'+ deviceCache.name + '" bluetooth dvice disconnected');
        }
        else{
            log('"'+deviceCache.name+'" bluetooth device is already disconnected');
        }
    }
    if(characteristicCache){

        characteristicCache.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        characteristicCache=null;
    }

    deviceCache=null;
}

// Data receiving
function handleCharacteristicValueChanged(event) {
    let value = new TextDecoder().decode(event.target.value);

    for (let c of value) {
        if (c === '\n') {
            let data = readBuffer.trim();
            readBuffer = '';

            if (data) {
                receive(data);
            }
        }
        else {
            readBuffer += c;
        }
    }
}

function receive(data){
    log(data, 'in');
}

function writeToCharacteristic(characteristic, data) {
    characteristic.writeValue(new TextEncoder().encode(data));
}

// Send data to the connected device
function send(data) {
    data = String(data);

    if (!data || !characteristicCache) {
        return;
    }

    data += '\n';

    if (data.length > 60) {
        let chunks = data.match(/(.|[\r\n]){1,60}/g);

        writeToCharacteristic(characteristicCache, chunks[0]);

        for (let i = 1; i < chunks.length; i++) {
            setTimeout(() => {
                writeToCharacteristic(characteristicCache, chunks[i]);
            }, i * 100);
        }
    }
    else {
        writeToCharacteristic(characteristicCache, data);
    }

    log(data, 'out');
}
