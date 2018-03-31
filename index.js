const tuya = require('homebridge-tuyapi-extended');
const convert = require('color-convert');

var Accessory,
    Service,
    Characteristic,
    UUIDGen;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-tuya-colorlight", "TuyaColorLight", TuyaColorLight);
}

function TuyaColorLight(log, config) {
  // Setup this up.
  this.log = log;
  this.name = config.name;
  this.config = config;
  this.log.prefix = 'Tuya Color Light - ' + this.name;

  const debug = require('debug')('[Tuya Color Light - '  + this.name + ' ]  ');

  this.debugging = config.debug || false;
  this.debugPrefix = config.debugPrefix || '~~~  '

  this.deviceEnabled = (typeof config.deviceEnabled === 'undefined') ? true : config.deviceEnabled;

  this.devId = config.devId;
  this.powerState = true;

  this.colorMode = 'white';
  this.brightness = 100; // percentage value use _convertValToPercentage functions below.

  this.color = {H: 130, S:100, L:50};
  this.color2 = {H: 0, S:100, L:50};

  this.hue = this.color.H;
  this.saturation = this.color.S;
  this.lightness = this.color.L;

  this.colorTemperature = 255;
  this.colorTempMin = 153;
  this.colorTempMax = 500;

  this.dps = {};

  this.powerState = false;
  this.noUpdate = false;
  this.alphaHex = 'ff';
  this.alphaBrightness = 100;
  this.refreshInterval = (config.refreshInterval !== undefined) ? config.refreshInterval : 60;  // Seconds

  // API timeout settings, tweak via config.
  this.apiMinTimeout = (typeof config.apiMinTimeout === undefined) ? 100 : config.apiMinTimeout;
  this.apiMaxTimeout = (typeof config.apiMaxTimeout  === undefined) ? 2000 : config.apiMaxTimeout;
  this.apiRetries = (typeof config.apiRetries === undefined) ? 1 : config.apiRetries;
  this.apiDebug = config.apiDebug || false;

  // this.tuyaDebug(JSON.stringify(config));

  // Setup Tuya Color Light
  if (config.ip != undefined && this.deviceEnabled === true) {
    this.tuyaDebug('Tuya Color Light ' + this.name + ' Ip is defined as ' + config.ip);
    this.tuyaColorLight = new tuya({type: 'color-lightbulb', ip: config.ip, id: config.devId, key: config.localKey, name: this.name, apiRetries: this.apiRetries, apiMinTimeout: this.apiMinTimeout, apiMaxTimeout: this.apiMaxTimeout, apiDebug: this.apiDebug, apiDebugPrefix: this.debugPrefix});
  } else if(this.deviceEnabled === true) {
    this.tuyaDebug('Tuya Color Light ' + this.name + ' IP is undefined, resolving Ids and this usually does not work, so set a static IP for your powerstrip and add it to the config...');
    this.tuyaColorLight = new tuya({type: 'color-lightbulb', id: config.devId, key: config.localKey, name: this.name, apiRetries: this.apiRetries, apiMinTimeout: this.apiMinTimeout, apiMaxTimeout: this.apiMaxTimeout, apiDebug: this.apiDebug, apiDebugPrefix: this.debugPrefix});
    this.tuyaColorLight.resolveIds(); // This method sucks... it hangs, it doesn't resolve properly. Fix it.
  }

  if(this.debugging === true && this.apiDebug === true && this.deviceEnabled === true) {
    this.tuyaDebug('Tuya API Settings - Retries: ' + this.apiRetries + ' Debug: ' + this.apiDebug + ' Min Timeout: ' + this.apiMinTimeout + ' Max Timeout: ' + this.apiMaxTimeout);
  }

  //this.devicePolling();
  setInterval(this.devicePolling.bind(this), this.refreshInterval * 1000);


};

TuyaColorLight.prototype.getLightStatus = function(callback) {
  if(this.deviceEnabled === false) {
    this.log.warn('Device is disabled... Bailing out...');
    return callback('Disabled');
  }

  this.tuyaColorLight.get(this, {schema: true}).then(status => {
    this.tuyaDebug('BEGIN TUYA COLOR LIGHT STATUS ' + this.debugPrefix);
    var powerState = this.powerState;
    var colorMode = this.colorMode;
    var brightness = this.brightness;
    var lightness = this.lightness;
    var colorTemperature = this.colorTemperature;
    var color = this.color;
    var color2 = this.color2;
    var alphaHex = this.alphaHex;
    var hue = this.hue;
    var saturation = this.saturation;
    var converted = [];
    var converted2 = [];
    var hexColor1 = [];
    var hexColor2 = [];

    if(status !== undefined) {
      if(status.dps['1'] !== undefined) {
        powerState = status.dps['1'];
        this.powerState = status.dps['1'];
      }

      if(status.dps['2'] !== undefined) {
        colorMode = status.dps['2']; // colour or white
      }

      if(status.dps['3'] !== undefined) {
        brightness = this._convertValToPercentage(status.dps['3']);
      }

      if(status.dps['4'] !== undefined) {
        colorTemperature = status.dps['4']; // TODO FIX
      }

      if(status.dps['5'] !== undefined) {
        converted = convert.hex.hsl(status.dps['5'].substring(0,6));
        converted2 = convert.hex.hsl(status.dps['5'].substring(6,12));

        color.H = converted[0];
        color.S = converted[1];
        color.L = converted[2];

        // What is this? Some kind of mask? Yes...
        color2.H = converted2[0];
        color2.S = converted2[1];
        color2.L = converted2[2];

        alphaHex = status.dps['5'].substring(12,14);

         // I believe this equates to brightness, or alpha in 2 hex chars: ff = 100%, 00 = 0%;

        hue = color.H;
        saturation = color.S;

        if(colorMode === 'colour') {
           // How do we set brightness though if it's in colour mode?
          brightness = color.L * 2; // maybe * 2
          if(brightness > 100) {
            brightness = 100;
          }
        }

        lightness = Math.round(brightness / 2);

        hexColor1 = convert.hsl.hex(color.H, color.S, color.L)
        hexColor2 = convert.hsl.hex(color2.H, color2.S, color2.L);

      }

      if(!this.debugging) {
        this.log.info('Received update for Tuya Color LED Light');
      } else {
        this.tuyaDebug("dps[1]: " + status.dps['1']);
        this.tuyaDebug("dps[2]: " + status.dps['2']);
        this.tuyaDebug("dps[3]: " + status.dps['3']);
        this.tuyaDebug("dps[4]: " + status.dps['4']);
        this.tuyaDebug("dps[5]: " + status.dps['5']);
        this.tuyaDebug("dps[6]: " + status.dps['6']);
        this.tuyaDebug("dps[7]: " + status.dps['7']);
        this.tuyaDebug("dps[8]: " + status.dps['8']);
        this.tuyaDebug("dps[9]: " + status.dps['9']);
        this.tuyaDebug("dps[10]: " + status.dps['10']);

        this.tuyaDebug('Factored Results ' + this.name + ' device properties...');
        this.tuyaDebug('TUYA Light [1] Power: ' + powerState);
        this.tuyaDebug('TUYA Light [2] Color Mode: ' + colorMode);
        this.tuyaDebug('TUYA Light [3] BRIGHTNESS: ' + brightness + '%');
        this.tuyaDebug('TUYA Light [4] TEMPERATURE: ' + colorTemperature);
        this.tuyaDebug('TUYA Light [5] (H)UE: ' + hue);
        this.tuyaDebug('TUYA Light [5] (S)ATURATION: ' + saturation + '%');
        this.tuyaDebug('TUYA Light [5] (L)ightness: ' + lightness + '%');
        this.tuyaDebug('TUYA Light DEVICE COLOR 1: ' + status.dps['5'].substring(0,6));
        this.tuyaDebug('TUYA Light Color 1 Hex to HSL: ' + converted);
        this.tuyaDebug('TUYA Light Color 1 HSL to HEX: ' + hexColor1);
        this.tuyaDebug('TUYA Light DEVICE COLOR 2: ' + status.dps['5'].substring(6,12));
        this.tuyaDebug('TUYA Light Color 2 Hex to HSL: ' + converted2);
        this.tuyaDebug('TUYA Light Color 2 HSL to HEX: ' + hexColor2);
        this.tuyaDebug('TUYA Light Color Alpha Hex Val: ' + status.dps['5'].substring(12,14));
        this.tuyaDebug('TUYA Light Color ALPHAHEX: ' + alphaHex);
      }
      // this.brightness = status.dps['3'] / 255 * 100;
    }

    this.tuyaDebug('END TUYA COLOR LIGHT STATUS ' + this.debugPrefix);

    this.colorMode = colorMode;
    this.color = color;
    this.color2 = color2;
    this.brightness = brightness;
    this.lightness = lightness;
    this.hue = hue;
    this.alphaHex = alphaHex;
    this.powerState = powerState;
    this.saturation = saturation;
    // this.colorTemperature = ColorTemperature;
    callback();

  }).catch(error => {
    if(error) {
      this.tuyaDebug('BEGIN TUYA GET COLOR LIGHT STATUS ERROR ' + this.debugPrefix);
      this.tuyaDebug('Got Tuya Color Light device ERROR for ' + this.name);
      this.tuyaDebug(error);
      this.tuyaDebug('END TUYA GET COLOR POWER STATUS ERROR ' + this.debugPrefix);
      if(!this.debugging) {
        this.log.warn(error.message);
      }
      callback(error, null);
    }
  });
};

TuyaColorLight.prototype.setToCurrentColor = function(callback) {
  if(this.deviceEnabled === false) {
    this.log.warn('Device is disabled... Bailing out...');
    callback('Disabled');
    return;
  }

  var color = this.color;
  var color2 = this.color2;

  var lightness = Math.round(this.brightness / 2);
  var brightness = this.brightness;
  var apiBrightness = this._convertPercentageToVal(brightness);
  var alphaBrightness = this._getAlphaHex(brightness);

  var hexColorOriginal1 = convert.hsl.hex(color.H, color.S, color.L);
  var rgbColorOriginal1 = convert.hsl.rgb(color.H, color.S, color.L);

  var hexColorOriginal2 = convert.hsl.hex(0, 0, 50);
  var rgbColorOriginal2 = convert.hsl.rgb(0, 0, 50);

  var hexColor1 = convert.hsl.hex(color.H, color.S, lightness);
  var rgbColor1 = convert.hsl.rgb(color.H, color.S, lightness);

  var hexColor2 = convert.hsl.hex(0, 0, lightness);
  var rgbColor2 = convert.hsl.rgb(0, 0, lightness);

  var colorTemperature = this.colorTemperature;

  // var ww = Math.round((this.brightness * 255) / 100);

  var lightColor = (hexColor1  + hexColor2 + alphaBrightness).toLowerCase();

  var temperature = (this.colorMode === 'colour') ? 255 : this._convertColorTemperature(colorTemperature);

  var dpsTmp = {
                '1' : true,
                '2' : this.colorMode,
                '3' : apiBrightness,
                '4' : temperature,
                '5' : lightColor
                // '6' : hexColor + hexColor + 'ff'
              };

  this.tuyaColorLight.set(this, {'id': this.devId, 'dps' : dpsTmp}).then(result => {

    if(this.debugging === true) {
      this.tuyaDebug('BEGIN TUYA SET COLOR LIGHT COLOR ' + this.debugPrefix);
      this.tuyaDebug('Color Mode ' + this.colorMode);

      this.tuyaDebug('HSL Settings - [(H)ue] ' + color.H);
      this.tuyaDebug('HSL Settings - [(S)aturation] ' + color.S);
      this.tuyaDebug('HSL Settings - [(L)ightness] ' + lightness);

      this.tuyaDebug('HEX COLOR 1 ORIGINAL: ' + hexColorOriginal1);
      this.tuyaDebug('HEX COLOR 1 at ' + brightness + '% Brightness: ' + hexColor1);

      this.tuyaDebug('Color 1 ORIGINAL Hex: ' + hexColorOriginal1 + ' at ' + brightness + '% Brightness: ' + hexColor1);
      this.tuyaDebug('Color 1 RGB ORIGINAL: ' + rgbColorOriginal1 + ' at ' + brightness + '% Brightness: ' + rgbColor1);
      this.tuyaDebug('Color 1 R ORIGINAL ' + rgbColorOriginal1[0] + ' R at ' + brightness + '% Brightness: ' + rgbColor1[0]);
      this.tuyaDebug('Color 1 G ORIGINAL ' + rgbColorOriginal1[1] + ' G at ' + brightness + '% Brightness: ' + rgbColor1[1]);
      this.tuyaDebug('Color 1 B ORIGINAL ' + rgbColorOriginal1[2] + ' B at ' + brightness + '% Brightness: ' + rgbColor1[2]);

      this.tuyaDebug('HEX COLOR 2 ORIGINAL: ' + hexColorOriginal2);
      this.tuyaDebug('HEX COLOR 2 at ' + this.brightness + '% Brightness: ' + hexColor2);

      this.tuyaDebug('Color 2 RGB ORIGINAL: ' + rgbColorOriginal2 + ' at ' + brightness + '% Brightness: ' + rgbColor2);
      this.tuyaDebug('Color 2 R ORIGINAL ' + rgbColorOriginal2[0] + ' R at ' + brightness + '% Brightness: ' + rgbColor2[0]);
      this.tuyaDebug('Color 2 G ORIGINAL ' + rgbColorOriginal2[1] + ' G at ' + brightness + '% Brightness: ' + rgbColor2[1]);
      this.tuyaDebug('Color 2 B ORIGINAL ' + rgbColorOriginal2[2] + ' B at ' + brightness + '% Brightness: ' + rgbColor2[2]);

      this.tuyaDebug('NEW HEX AlphaHex: ' + alphaBrightness);

      this.tuyaDebug('SETTING ' + this.name + " device to ");
      this.tuyaDebug('SETTING LIGHT MODE: ' + dpsTmp['2']);
      this.tuyaDebug('SETTING BRIGHTNESS: ' + this.brightness + '% or ' + dpsTmp['3'] + ' of 255');
      this.tuyaDebug('SETTING COLOR TEMPERATURE: ' + temperature + ' or ' + dpsTmp['4'] + ' of 255');

      this.tuyaDebug('SENT DPS VALUES: ');

      this.tuyaDebug("SENT dps[1]: " + dpsTmp['1']);
      this.tuyaDebug("SENT dps[2]: " + dpsTmp['2']);
      this.tuyaDebug("SENT dps[3]: " + dpsTmp['3']);
      this.tuyaDebug("SENT dps[4]: " + dpsTmp['4']);
      this.tuyaDebug("SENT dps[5]: " + dpsTmp['5']);
      // this.tuyaDebug("Sent dps[6]: " + dpsTmp['6']);
      // this.tuyaDebug("Sent dps[7]: " + dpsTmp['7']);
      // this.tuyaDebug("Sent dps[8]: " + dpsTmp['8']);
      // this.tuyaDebug("Sent dps[9]: " + dpsTmp['9']);
      // this.tuyaDebug("Sent dps[10]: " + dpsTmp['10']);
      this.tuyaDebug('END TUYA SET COLOR LIGHT COLOR ' + this.debugPrefix);
    }
    callback();
  }).catch(error => {
    this.tuyaDebug('BEGIN TUYA SET COLOR LIGHT COLOR ERROR ' + this.debugPrefix);
    this.tuyaDebug('Got Tuya device error for Setting ' + this.name + ' device to: ');
    this.tuyaDebug(dpsTmp.toString());
    this.tuyaDebug(error.message);
    this.tuyaDebug('END TUYA SET COLOR LIGHT COLOR ERROR ' + this.debugPrefix);
    callback(error);
  });
};

TuyaColorLight.prototype.setToWarmWhite = function() {
    var brightness = this.brightness;
    this.colorMode = 'white';
};


// MARK: - ON / OFF

TuyaColorLight.prototype.getOnStatus = function(callback) {

  if(this.deviceEnabled === true) {
    this.tuyaColorLight.get(this, ["dps['1']"]).then(status => {
      this.tuyaDebug('TUYA GET COLOR LIGHT POWER for ' + this.name + ' dps: 1'  + this.debugPrefix);
      this.tuyaDebug('Returned Status: ' + status);
      this.tuyaDebug('END TUYA GET COLOR LIGHT POWER ' + this.debugPrefix);
      callback(null, status);
    }).catch(error => {
        this.tuyaDebug('TUYA GET COLOR LIGHT POWER ERROR for ' + this.name + ' dps: 1');
        this.tuyaDebug(error.message);
        this.tuyaDebug('END TUYA GET COLOR LIGHT POWER ERROR ' + this.debugPrefix);
        return callback(error);
    });
  } else {
    this.log.warn('Device is disabled... Bailing out...');
    return callback('Device is disabled...');
  }
}

TuyaColorLight.prototype.setOnStatus = function(on, callback) {

  this.tuyaDebug('Current Powerstate: ' + this.powerState + ' Changing to: ' + on);

  if(this.deviceEnabled === true) {
    var dpsTmp = {'1' : on}
    // TODO: Skip if the light is already on...
    this.tuyaColorLight.set(this, {'id': this.devId, 'dps' : dpsTmp}).then(result => {
        if(result) {
          this.tuyaDebug('TUYA SET COLOR LIGHT POWER ' + this.debugPrefix);
          this.tuyaDebug('Setting ' + this.name + ' dps: ' + '1' + ' device to: ' + on);
          this.tuyaDebug('Setting ' + this.name + ' Result: ' + result);

          this.tuyaDebug('END TUYA SET COLOR LIGHT POWER ' + this.debugPrefix);
          this.powerState = on;
          callback();
        }
      }).catch(error => {
          this.tuyaDebug('BEGIN TUYA GET COLOR LIGHT STATUS ERROR ' + this.debugPrefix);
          this.tuyaDebug('Got Tuya Color Light device ERROR for ' + this.name);
          this.tuyaDebug(error);
          this.tuyaDebug('END TUYA GET COLOR POWER STATUS ERROR ' + this.debugPrefix);
          if(!this.debugging) {
            this.log.warn(error.message);
          }
          callback(error);
    });
  } else {
    this.log.warn('Device is disabled... Bailing out...');
    return callback('Disabled');
  }
}

// MARK: - HUE

TuyaColorLight.prototype.getHue = function(callback) {
  var color = this.color;
  this.tuyaDebug('GET HUE: ' + color.H);
  callback(null, color.H);
};

TuyaColorLight.prototype.setHue = function(value, callback) {
  this.tuyaDebug('SET HUE: ' + value);
  this.tuyaDebug('Saturation Value: ' + this.color.S);
  this.color.H = value;

  if(value === 0 && this.color.S === 0) {
    this.colorMode = 'white';
    this.tuyaDebug('SET Color Mode: \'white\'');
  } else {
    this.colorMode = 'colour';
    this.tuyaDebug('SET Color Mode: \'colour\' -- dahhhhhh british spelling \'coulour\' really is annoying... why you gotta be special?');
  }


  var returnVal = {};

  returnVal.color = this.color;
  returnVal.colorMode = this.colorMode;
  returnVal.hue = this.color.H;
  returnVal.saturation = this.saturation;

  this.setToCurrentColor(function() {
    this.tuyaDebug('Finished setCurrentColor callback');
    callback(null, returnVal);
  }.bind(this));
};

// MARK: - BRIGHTNESS
TuyaColorLight.prototype.getBrightness = function(callback) {
  var brightness = this.brightness;
  this.brightness = brightness;

  this.tuyaDebug('getBrightness: ' + brightness);

  callback(null, brightness);
};

TuyaColorLight.prototype.setBrightness = function(value, callback) {
  this.brightness = value;
  var newValue = this._convertPercentageToVal(value);
  this.tuyaDebug(this.debugPrefix + " BRIGHTNESS from UI: " + value + ' Converted from 100 to 255 scale: ' +  newValue);
  this.setToCurrentColor(function() {
    this.tuyaDebug('Finished setCurrentColor callback');
    callback();
  }.bind(this));
}

// MARK: - SATURATION
TuyaColorLight.prototype.getSaturation = function(callback) {
  var color = this.color;
  this.tuyaDebug('getSaturation: ' + color.S);
  callback(null, color.S);
};

TuyaColorLight.prototype.setSaturation = function(value, callback) {
  var colorMode = 'colour';
  var saturation = value;
  var color = this.color;
  color.S = value;

  this.color = color;
  this.colorMode = colorMode;
  this.saturation = saturation;

  // this.bind(color);

  this.tuyaDebug(' SET SATURATION: ' + value);
  // this.setToCurrentColor();
  this.setToCurrentColor(function() {
    this.tuyaDebug('Finished setCurrentColor callback');
    callback();
  }.bind(this));
};

// Mark: - TEMPERATURE
TuyaColorLight.prototype.getColorTemperature = function(callback) {
  var colorTemperature = this.colorTemperature;
  callback(null, colorTemperature);
};

TuyaColorLight.prototype.setColorTemperature = function(value, callback) {
  // var foo = function(value, callback) {
  //   var colorMode = 'white';
  //   var colorTemperature =  this._convertColorTemperature(value);
  // }

  // foo(value).bind(this);
  // this.colorMode = 'white';
  this.colorTemperature = this._convertValToPercentage(value);

  this.tuyaDebug('setColorTemperature COLOR TEMPERATURE Input: ' + value + ' Output: ' + this.colorTemperature);
  callback();
  // this.setToCurrentColor(function() {
  //   this.tuyaDebug('Finished setCurrentColor callback');
  //   callback();
  // }.bind(this));

};




TuyaColorLight.prototype._getAlphaHex = function(brightness) {
  // for (var i = 1; i >= 0; i -= 0.01) {
  var i = brightness  / 100;
  this.tuyaDebug('input brightness: ' + brightness + ' and i is ' + i);
  var alpha = Math.round(i * 255);
  var hex = (alpha + 0x10000).toString(16).substr(-2);
  var perc = Math.round(i * 100);

  this.tuyaDebug('alpha percent: ' + perc + '% hex: ' + hex + ' alpha: ' + alpha);
  return hex;
};


// MARK: - Polling

TuyaColorLight.prototype.devicePolling = function() {

  this.log('Polling at interval... ' + this.refreshInterval + ' seconds');

  this.getLightStatus(function(error, result) {
    if(error) {
      this.tuyaDebug('Error getting light status');
    } else {
      // this.tuyaDebug(JSON.stringify(result, null, 8));
      // this.tuyaDebug(JSON.stringify(this, null, 8));
    }
      // this.tuyaDebug(JSON.stringify(this, null, 8));
  }.bind(this));

  if(this.config.superDebug) {
    this.tuyaDebug(JSON.stringify(this, null, 8));
  }
};

// MARK: - Helper Functions

TuyaColorLight.prototype._convertPercentageToVal = function(percentage) {
  var tmp = Math.round(255 * (percentage / 100));
  this.tuyaDebug('Converted ' + percentage + ' to: ' + tmp);
  return tmp;
};

TuyaColorLight.prototype._convertValToPercentage = function(val) {
  var tmp = Math.round((val / 255) * 100);
  this.tuyaDebug('Converted ' + val + ' to: ' + tmp);
  return tmp;
};

TuyaColorLight.prototype._convertColorTemperature = function(val) {
  var tmpRange = this.colorTempMax - this.colorTempMin;
  var tmpCalc = Math.round((val / this.colorTempMax) * 100);

  this.tuyaDebug('HK colorTemp Value: ' + val);
  this.tuyaDebug('HK colorTemp scale min : ' + this.colorTempMin);
  this.tuyaDebug('HK colorTemp scale max : ' + this.colorTempMax);
  this.tuyaDebug('HK colorTemp range (tmpRange): ' + tmpRange);
  this.tuyaDebug('HK colorTemp % tmpCalc: ' + tmpCalc);

  var tuyaColorTemp = this._convertPercentageToVal(tmpCalc);

  this.tuyaDebug('HK tuyaColorTemp: ' + tuyaColorTemp);

  return tuyaColorTemp;

};

TuyaColorLight.prototype._convertColorTemperatureToHK = function(val) {

  var tuyaColorTempPercent = this._convertValToPercentage(this.colorTemperature);
  var tmpRange = this.colorTempMax - this.colorTempMin;
  var tmpCalc = Math.round((tmpRange * (tuyaColorTempPercent / 100)) + this.colorTempMin);
  var hkValue = Math.round(tmpCalc);

  this.tuyaDebug('Tuya color Temperature : ' + val);
  this.tuyaDebug('Tuya color temp Percent of 255: ' + tuyaColorTempPercent + '%');

  this.tuyaDebug('HK colorTemp scale min : ' + this.colorTempMin);
  this.tuyaDebug('HK colorTemp scale max : ' + this.colorTempMax);

  this.tuyaDebug('HK Color Temp Range: ' + tmpRange);
  this.tuyaDebug('HK range %: ' + tuyaColorTempPercent);
  this.tuyaDebug('HK Value: ' + hkValue);

  return hkValue;

};


TuyaColorLight.prototype.tuyaDebug = function(args) {
  if(this.debugging === true) {
    this.log.debug(this.debugPrefix, args);
  }
};

TuyaColorLight.prototype.identify = function (callback) {
  this.tuyaDebug(this.name + ' was identified.');
  callback();
};

TuyaColorLight.prototype.getServices = function() {
  this.devicePolling();

  // Setup the HAP services
  informationService = new Service.AccessoryInformation();

  informationService
        .setCharacteristic(Characteristic.Manufacturer, 'Tuya - github@drumfreak')
        .setCharacteristic(Characteristic.Model, 'LED-controller')
        .setCharacteristic(Characteristic.SerialNumber, this.devId);

  var lightbulbService = new Service.Lightbulb(this.name);

  lightbulbService.getCharacteristic(Characteristic.On)
        .on('get', this.getOnStatus.bind(this))
        .on('set', this.setOnStatus.bind(this));

  lightbulbService.getCharacteristic(Characteristic.Hue)
        .on('get', this.getHue.bind(this))
        .on('set', this.setHue.bind(this));

  lightbulbService.getCharacteristic(Characteristic.Saturation)
        .on('get', this.getSaturation.bind(this))
        .on('set', this.setSaturation.bind(this));

  lightbulbService.getCharacteristic(Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));


  // lightbulbService.getCharacteristic(Characteristic.ColorTemperature)
  //       .on('get', this.getColorTemperature.bind(this))
  //       .on('set', this.setColorTemperature.bind(this));

    // Note: default
    // maxValue: 500,
    // minValue: 140,
    // this.colorTemperatureService = this.lightbulbService.getCharacteristic(Characteristic.ColorTemperature)
    //       .on('get', this._getColorTemperature.bind(this))
    //       .on('set', this._setColorTemperature.bind(this))
    //       .setProps({
    //         minValue: this.colorTempMin,
    //         maxValue: this.colorTempMax
    //       });

    return  [informationService, lightbulbService];
};

