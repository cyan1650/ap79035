(function() {
  'use strict';

  class HeartRateSensor {
    constructor() {
      this.device = null;
      this.server = null;
      this._characteristics = new Map();
    }
    connect() {
      return navigator.bluetooth.requestDevice({filters:[{services:[ 'health_thermometer' ]}]})
      .then(device => {
        this.device = device;
        this.device.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect();
      })
      .then(server => {
        this.server = server;
        return server.getPrimaryService('health_thermometer');
      })
      .then(service => {
        return this._cacheCharacteristic(service, 'temperature_measurement');
      })
    }
    //disconnect() {
    //  .then(device => {
    //    this.device = device;
    //    return device.gatt.disconnect();
    //  })
    //}

    /* Heart Rate Service */

    startNotificationsHeartRateMeasurement() {
      return this._startNotifications('temperature_measurement');
    }
    stopNotificationsHeartRateMeasurement() {
      return this._stopNotifications('temperature_measurement');
    }
    parseHeartRate(value) {
      // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
      value = value.buffer ? value : new DataView(value);
      let flag = value.getUint8(0);
      
      let result = {};
      let index = 1;
      
      result.heartRate = value.getUint32(index, /*littleEndian=*/true);
      result.heartRate = result.heartRate & 0x00FFFFFF;
      result.heartRate = result.heartRate/10;
      
      let value_units = flag & 0x01; //0 is Celsius
      let timestamp = flag & 0x02; //1:present
      let temperature_type = flag & 0x04; //1:present
      //
      if (timestamp){
        result.time = value.getUint16(index, true);
        index += 2;
        result.month = value.getUint8(index, true);
        index += 1;
        result.day = value.getUint8(index, true);
        index += 1;
        result.hour = value.getUint8(index, true);
        index += 1;
        result.min = value.getUint8(index, true);
        index += 1;
        result.sec = value.getUint8(index, true);
        index += 1;
      }
      
      if (temperature_type){
      result.type = value.getUint8(index, true);
      index += 1;
      }
      
      return result;
    }

    /* Utils */

    _cacheCharacteristic(service, characteristicUuid) {
      return service.getCharacteristic(characteristicUuid)
      .then(characteristic => {
        this._characteristics.set(characteristicUuid, characteristic);
      });
    }
    _readCharacteristicValue(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.readValue()
      .then(value => {
        // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
        value = value.buffer ? value : new DataView(value);
        return value;
      });
    }
    _writeCharacteristicValue(characteristicUuid, value) {
      let characteristic = this._characteristics.get(characteristicUuid);
      return characteristic.writeValue(value);
    }
    _startNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to set up characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.startNotifications()
      .then(() => characteristic);
    }
    _stopNotifications(characteristicUuid) {
      let characteristic = this._characteristics.get(characteristicUuid);
      // Returns characteristic to remove characteristicvaluechanged event
      // handlers in the resolved promise.
      return characteristic.stopNotifications()
      .then(() => characteristic);
    }
  }

  window.heartRateSensor = new HeartRateSensor();
  function onDisconnected(event) {
  // Object event.target is Bluetooth Device getting disconnected.
    statusText.innerHTML = "Disconnected!";
}

})();

