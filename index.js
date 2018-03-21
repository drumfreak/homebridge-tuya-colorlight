const tuya = require('homebridge-tuyapi-extended');
const debug = require('debug')('[Homebridge Tuya Color LED Light]  ');

const convert = require('color-convert');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-tuya-colorlight", "TuyaColorLight", TuyaColorLight);
}

function TuyaColorLight(log, config) {

  this.log = log;

  // Setup the object.
  this.name = config.name;
  this.devId = config.devId;
  this.color = {H: 130, S:100, L:50};
  this.color2 = {H: 0, S:100, L:50};
  this.powerState = true;
  this.colorMode = 'white';
  this.brightness = 100; // percentage value use _convertValToPercentage functions below.
  this.hue = this.color.H;
  this.saturation = this.color.S;
  this.lightness = this.color.L;
  this.colorTemperature = 255;
  this.colorTempMin = 153;
  this.colorTempMax = 500;
  this.dps = {};
  this.debugPrefix = config.debugPrefix || '~~~~~~~~~~~~~~~~~~~~~~~~~~ TUYA LIGHT: ';
  this.debugPrefix += this.name + '   ';

  this.log.prefix = 'Homebridge Tuya Color Light';

  this.debug = config.debug || false;

  // Setup Tuya Color Light
  if (config.ip != undefined) {

    this.debugger('Tuya Color Light ' + this.name + ' Ip is defined as ' + config.ip);

    this.tuyaColorLight = new tuya({type: 'outlet', ip: config.ip, id: config.devId, key: config.localKey});

  } else {

    this.debugger(this.debugPrefix + 'Tuya Color Light ' + this.name + ' IP is undefined, resolving Ids and this usually does not work, so set a static IP for your powerstrip and add it to the config...');

    this.tuyaColorLight = new tuya({type: 'outlet', id: config.devId, key: config.localKey});

    this.tuyaColorLight.resolveIds(); // This method sucks... it hangs, it doesn't resolve properly. Fix it.

  }

  this.services = this.getServices();

  // Pull an update from Tuya
  this._getLightStatus(function(error, result) {
    this.debugger(' LIGHT ON STATUS IS: ' + result);
    this.services[1].value = result;
    // Extend this some more to get the rest of the data collected to the proper state.
  }.bind(this));

  /* Device Function Points from Tuya lights... what a party to figure out.
  dps:
   { '1': true,
     '2': 'colour', // or 'white' if in white mode.
     '3': 25,  // brightness for white mode.
     '4': 0,   // temperature for white mode.
     '5': 'ff00150163ffff', // Primary color (ff0015) + Secondary Color (0163ff) + 2 bit for alpha channel (ff).
     '6': '00ff0000000000', // Unknown  timer?
     '7': 'ffff500100ff00', // Unknown  timer?
     '8': 'ffff8003ff000000ff000000ff000000000000000000', // Unknown scenes?
     '9': 'ffff5001ff0000', // Unknown timer
     '10': 'ffff0505ff000000ff00ffff00ff00ff0000ff000000'  // Unknown scenes?
    }
  */

  //debug(this.tuyaColorLight);
};


TuyaColorLight.prototype._getLightStatus = function(callback) {
  this.tuyaColorLight.get({schema: true}).then(status => {

    this.debugger('BEGIN TUYA COLOR LIGHT STATUS ' + this.debugPrefix);
    this.debugger('Getting Tuya Color Light device status for ' + this.name);

    this.powerState = status.dps['1'];

    if(status.dps['2'] !== undefined) {
      this.colorMode = status.dps['2']; // colour or white
    }

    if(status.dps['3'] !== undefined) {
      this.brightness = this._convertValToPercentage(status.dps['3']);
      this.brightnessService.value = this._convertValToPercentage(status.dps['3']); // update the ui for brightness
    }

    if(status.dps['4'] !== undefined) {
      this.colorTemperature = status.dps['4']; // TODO FIX
     // this.colorTemperatureService.value = this._convertColorTemperatureToHK(this.colorTemperature);
    }

    if(status.dps !== undefined) {

      if(status.dps['5'] !== undefined) {

        var converted = convert.hex.hsl(status.dps['5'].substring(0,6));
        var converted2 = convert.hex.hsl(status.dps['5'].substring(6,12));

        var alphaHex = status.dps['5'].substring(12,14).toLowerCase();

        this.color.H = converted[0];
        this.color.S = converted[1];
        this.color.L = converted[2];

        this.color2.H = converted2[0];
        this.color2.S = converted2[1];
        this.color2.L = converted2[2];

        this.hueService.value = this.hue;
        this.saturation = this.color.S;
        this.saturationService.value = this.saturation;
        this.lightness = this.color.L;

        var hexColor1 = convert.hsl.hex(this.color.H, this.color.S, this.color.L).toLowerCase();
        var hexColor2 = convert.hsl.hex(this.color2.H, this.color2.S, this.color2.L).toLowerCase();

      }

      if(!this.debug) {
        this.log.info('Received update for Tuya Color LED Light: ' + this.name);
      } else {
        this.debugger(this.debugPrefix + " dps[1] : " + status.dps['1']);
        this.debugger(this.debugPrefix + " dps[2] : " + status.dps['2']);
        this.debugger(this.debugPrefix + " dps[3] : " + status.dps['3']);
        this.debugger(this.debugPrefix + " dps[4] : " + status.dps['4']);
        this.debugger(this.debugPrefix + " dps[5] : " + status.dps['5']);
        this.debugger(this.debugPrefix + " dps[6] : " + status.dps['6']);
        this.debugger(this.debugPrefix + " dps[7] : " + status.dps['7']);
        this.debugger(this.debugPrefix + " dps[8] : " + status.dps['8']);
        this.debugger(this.debugPrefix + " dps[9] : " + status.dps['9']);

        this.debugger('Factored Results ' + this.name + ' device properties...');
        this.debugger('TUYA Light [1] Power: ' + this.onService.value);
        this.debugger('TUYA Light [2] Color Mode: ' + this.colorMode);
        this.debugger('TUYA Light [3] BRIGHTNESS: ' + this.brightness + '%');
        this.debugger('TUYA Light [4] TEMPERATURE: ' + this.colorTemperature);
        this.debugger('TUYA Light [5] (H)UE: ' + this.hue);
        this.debugger('TUYA Light [5] (S)ATURATION: ' + this.saturation + '%');
        this.debugger('TUYA Light [5] (L)ightness: ' + this.lightness + '%');
        this.debugger('TUYA Light DEVICE COLOR 1: ' + status.dps['5'].substring(0,6));
        this.debugger('TUYA Light Color 1 Hex to HSL: ' + converted);
        this.debugger('TUYA Light Color 1 HSL to HEX: ' + hexColor1);
        this.debugger('TUYA Light DEVICE COLOR 2: ' + status.dps['5'].substring(6,12));
        this.debugger('TUYA Light Color 2 Hex to HSL: ' + converted2);
        this.debugger('TUYA Light Color 2 HSL to HEX: ' + hexColor2);
        this.debugger('TUYA Light Color Alpha Hex Val: ' + status.dps['5'].substring(12,14));
        this.debugger('TUYA Light Color Alpha Hex Val: ' + status.dps['5'].substring(12,14));
        this.debugger('TUYA Light Color ALPHAHEX: ' + alphaHex);
      }

      // this.brightness = status.dps['3'] / 255 * 100;
    }

    this.debugger('END TUYA COLOR LIGHT STATUS ' + this.debugPrefix);

    return callback(null, this.powerState);

  }).catch(error => {
    this.debugger('BEGIN TUYA GET COLOR LIGHT STATUS ERROR ' + this.debugPrefix);
    this.debugger('Got Tuya Color Light device ERROR for ' + this.name);
    this.debugger(this.debugPrefix + error);
    this.debugger('END TUYA GET COLOR POWER STATUS ERROR ' + this.debugPrefix);
    if(!this.debug) {
      this.log.warn(this.debugPrefix + error);
    }
    return callback(error, null);
  });
}




TuyaColorLight.prototype.setToCurrentColor = function() {
  var color1 = this.color;
  var color2 = this.color2;

  var apiBrightness = this._convertPercentageToVal(this.brightness);
  var alphaBrightness = this._getAlphaHex(this.brightness);

  var hexColor1 = convert.hsl.hex(color1.H, color1.S, color1.L).toLowerCase();
  var rgbColor1 = convert.hsl.rgb(color1.H, color1.S, color1.L);
  var color1R = Math.round((rgbColor1[0] / 100) * this.brightness);
  var color1G = Math.round((rgbColor1[1] / 100) * this.brightness);
  var color1B = Math.round((rgbColor1[2] / 100) * this.brightness);

  var hexColor1Brightened = convert.rgb.hex(color1R, color1G, color1B).toLowerCase();

  var hexColor2 = convert.hsl.hex(color2.H, color2.S, color2.L).toLowerCase();
  var rgbColor2 = convert.hsl.rgb(color2.H, color2.S, color2.L);
  var color2R = Math.round((rgbColor2[0] / 100) * this.brightness);
  var color2G = Math.round((rgbColor2[1] / 100) * this.brightness);
  var color2B = Math.round((rgbColor2[2] / 100) * this.brightness);

  var hexColor2Brightened = convert.rgb.hex(color2R, color2G, color2B).toLowerCase();


  var ww = Math.round((this.brightness * 255) / 100);

  lightColor = hexColor1Brightened  + 'ffffff' + 'ff';

  var dpsTmp = {
                '1' : true,
                '2' : this.colorMode,
                '3' : apiBrightness,
                '4' : this._convertColorTemperature(this.colorTemperature),
                '5' : lightColor
                // '6' : hexColor + hexColor + 'ff'
              };



  this.tuyaColorLight.setDps({'id': this.devId, 'dps' : dpsTmp}).then(() => {
    if(this.debug) {
      this.debugger('BEGIN TUYA SET COLOR LIGHT COLOR ' + this.debugPrefix);
      this.debugger('Color 1 R ORIGINAL ' + rgbColor1[0] + ' R at ' + this.brightness + '% Brightness: ' + color1R);
      this.debugger('Color 1 G ORIGINAL ' + rgbColor1[1] + ' G at ' + this.brightness + '% Brightness: ' + color1G);
      this.debugger('Color 1 B ORIGINAL ' + rgbColor1[1] + ' B at ' + this.brightness + '% Brightness: ' + color1B);
      this.debugger('Color 1 Original Hex: ' + hexColor1 + ' at ' + this.brightness + '% Brightness: ' + hexColor1Brightened);
      this.debugger('Color 2 R ORIGINAL ' + rgbColor2[0] + ' R at ' + this.brightness + '% Brightness: ' + color2R);
      this.debugger('Color 2 G ORIGINAL ' + rgbColor2[1] + ' G at ' + this.brightness + '% Brightness: ' + color2G);
      this.debugger('Color 2 B ORIGINAL ' + rgbColor2[1] + ' B at ' + this.brightness + '% Brightness: ' + color2B);
      this.debugger('Color 2 Original Hex: ' + hexColor2 + ' at ' + this.brightness + '% Brightness: ' + hexColor2Brightened);
      this.debugger('ww ' + ww);
      this.debugger('SETTING ' + this.name + " device to ");
      this.debugger('SETTING LIGHT MODE: ' + dpsTmp['2']);
      this.debugger('SETTING BRIGHTNESS: ' + this.brightness + '% or ' + dpsTmp['3'] + ' of 255');
      this.debugger('SETTING COLOR TEMPERATURE: ' + this._convertColorTemperature(this.colorTemperature) + ' or ' + dpsTmp['4'] + ' of 255');
      this.debugger('HEX COLOR 1: ' + hexColor1);
      this.debugger('HEX COLOR 1 Brightness: ' + hexColor1Brightened);
      this.debugger('HEX COLOR 2: ' + hexColor2);
      this.debugger('HEX COLOR 2 Brightness: ' + hexColor2);
      this.debugger('NEW HEX AlphaHex: ' + alphaBrightness);
      this.debugger('SENT DPS VALUES: ' + dpsTmp.toString());
      this.debugger('END TUYA SET COLOR LIGHT COLOR ' + this.debugPrefix);
   }
    //return callback(null, 'ff5500');
  }).catch(error => {
    debug('BEGIN TUYA SET COLOR LIGHT COLOR ERROR ' + this.debugPrefix);
    this.debugger('Got Tuya device error for Setting ' + this.name + ' device to: ');
    this.debugger(this.debugPrefix + dpsTmp.toString());
    this.debugger(this.debugPrefix + error.toString());
    this.debugger('END TUYA SET COLOR LIGHT COLOR ERROR ' + this.debugPrefix);
    //eturn callback(error, null);
  });
};

TuyaColorLight.prototype.setToWarmWhite = function() {
    var brightness = this.brightness;
    this.colorMode = 'white';
};


// MARK: - ON / OFF

TuyaColorLight.prototype._getOn = function(callback) {
  this.tuyaColorLight.get(["dps['1']"]).then(status => {
    this.debugger('TUYA GET COLOR LIGHT POWER for ' + this.name + ' dps: 1'  + this.debugPrefix);
    this.debugger('Returned Status: ' + status);
    this.debugger(this.debugPrefix +  ' END TUYA GET COLOR LIGHT POWER ' + this.debugPrefix);
    return callback(null, status);
  }).catch(error => {
    this.debugger('TUYA GET COLOR LIGHT POWER ERROR for ' + this.name + ' dps: 1');
    this.debugger(this.debugPrefix, error);
    this.debugger('END TUYA GET COLOR LIGHT POWER ERROR ' + this.debugPrefix);
    return callback(error, null);
  });
}

TuyaColorLight.prototype._setOn = function(on, callback) {

  // TODO: Skip if the light is already on...
  this.tuyaColorLight.set({'id': this.devId, set: on, 'dps' : 1}).then(() => {
    this.debugger('TUYA SET COLOR LIGHT POWER ' + this.debugPrefix);
    this.debugger('Setting ' + this.name + ' dps: ' + '1' + ' device to: ' + on);
    this.debugger('END TUYA SET COLOR LIGHT POWER ' + this.debugPrefix);
    this.powerState = on;
    return callback(null, on);
  }).catch(error => {
    this.debugger('TUYA SET COLOR LIGHT POWER ERROR ' + this.debugPrefix);
    this.debugger('Got Tuya device error for ' + this.name + ' dps: 1');
    this.debugger(this.debugPrefix, error);
    this.debugger('END TUYA SET COLOR LIGHT POWER ERROR ' + this.debugPrefix);
    return callback(error, null);
  });
}

// MARK: - HUE

TuyaColorLight.prototype._getHue = function(callback) {
  var color = this.color;
  this.debugger('HUE: ' + color.H);
  callback(null, color.H);
};

TuyaColorLight.prototype._setHue = function(value, callback) {
  this.debugger('HUE: ', value);

  if(value === 0 && this.color.S === 0) {
    this.colorMode = 'white';
  } else {
    this.colorMode = 'colour';
  }
  this.color.H = value;
  this.setToCurrentColor();
  callback(null, value);
};

// MARK: - BRIGHTNESS
TuyaColorLight.prototype._getBrightness = function(callback) {
  var brightness = this.brightness;
  callback(null, brightness);
};

TuyaColorLight.prototype._setBrightness = function(value, callback) {
  this.brightness = value;
  var newValue = this._convertPercentageToVal(value);
  this.debugger(this.debugPrefix + " BRIGHTNESS from UI: %s", value, newValue);
  this.setToCurrentColor();
  callback(null, value);
};

// MARK: - SATURATION
TuyaColorLight.prototype._getSaturation = function(callback) {
  var color = this.color;
  callback(null, color.S);
};

TuyaColorLight.prototype._setSaturation = function(value, callback) {
  this.colorMode = 'colour';
  this.saturation = value;
  this.color.S = value;
  this.debugger(this.debugPrefix + " SATURATION: %s", value);
  // this.setToCurrentColor();
  callback(null, value);
};

// Mark: - TEMPERATURE
TuyaColorLight.prototype._getColorTemperature = function(callback) {
  var colorTemperature = this.colorTemperature;
  callback(null, colorTemperature);
};

TuyaColorLight.prototype._setColorTemperature = function(value, callback) {
  this.colorMode = 'white';
  this.colorTemperature = this._convertColorTemperature(value);
  this.debugger(this.debugPrefix + " COLOR TEMPERATURE: %s", value);
  this.setToCurrentColor();
  callback(null, value);
};


TuyaColorLight.prototype.getServices = function() {

  // Setup the HAP services
  var informationService = new Service.AccessoryInformation();

      informationService
        .setCharacteristic(Characteristic.Manufacturer, 'Tuya - github@drumfreak')
        .setCharacteristic(Characteristic.Model, 'LED-controller')
        .setCharacteristic(Characteristic.SerialNumber, this.devId);


  var lightbulbService = new Service.Lightbulb();

  this.onService = lightbulbService
        .getCharacteristic(Characteristic.On)
        .on('set', this._setOn.bind(this))
        .on('get', this._getOn.bind(this));

  this.hueService = lightbulbService
        .addCharacteristic(new Characteristic.Hue())
        .on('get', this._getHue.bind(this))
        .on('set', this._setHue.bind(this));

  this.saturationService = lightbulbService
        .addCharacteristic(new Characteristic.Saturation())
        .on('get', this._getSaturation.bind(this))
        .on('set', this._setSaturation.bind(this));

  this.brightnessService = lightbulbService
        .addCharacteristic(new Characteristic.Brightness())
        .on('set', this._setBrightness.bind(this))
        .on('get', this._getBrightness.bind(this));

  lightbulbService
        .addOptionalCharacteristic(Characteristic.ColorTemperature);


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


TuyaColorLight.prototype._getAlphaHex = function(brightness) {
  // for (var i = 1; i >= 0; i -= 0.01) {
  var i = brightness  / 100;
  this.debugger('input brightness: ' + brightness + ' and i is ' + i);
  var alpha = Math.round(i * 255);
  var hex = (alpha + 0x10000).toString(16).substr(-2).toLowerCase();
  var perc = Math.round(i * 100);

  this.debugger('alpha percent: ' + perc + '% hex: ' + hex + ' alpha: ' + alpha);
  return hex;
};

// MARK: - Helper Functions

TuyaColorLight.prototype._convertPercentageToVal = function(percentage) {
  var tmp = Math.round(255 * (percentage / 100));
  this.debugger('Converted ' + percentage + ' to: ' + tmp);
  return tmp;
};

TuyaColorLight.prototype._convertValToPercentage = function(val) {
  var tmp = Math.round((val / 255) * 100);
  this.debugger('Converted ' + val + ' to: ' + tmp);
  return tmp;
};

TuyaColorLight.prototype._convertColorTemperature = function(val) {
  var tmpRange = this.colorTempMax - this.colorTempMin;
  var tmpCalc = Math.round((val / this.colorTempMax) * 100);

  this.debugger('HK colorTemp Value: ' + val);
  this.debugger('HK colorTemp scale min : ' + this.colorTempMin);
  this.debugger('HK colorTemp scale max : ' + this.colorTempMax);
  this.debugger('HK colorTemp range (tmpRange): ' + tmpRange);
  this.debugger('HK colorTemp % tmpCalc: ' + tmpCalc);

  var tuyaColorTemp = this._convertPercentageToVal(tmpCalc);

  this.debugger('HK tuyaColorTemp: ' + tuyaColorTemp);

  return tuyaColorTemp;

};

TuyaColorLight.prototype._convertColorTemperatureToHK = function(val) {

  var tuyaColorTempPercent = this._convertValToPercentage(this.colorTemperature);
  var tmpRange = this.colorTempMax - this.colorTempMin;
  var tmpCalc = Math.round((tmpRange * (tuyaColorTempPercent / 100)) + this.colorTempMin);
  var hkValue = Math.round(tmpCalc);

  this.debugger('Tuya color Temperature : ' + val);
  this.debugger('Tuya color temp Percent of 255: ' + tuyaColorTempPercent + '%');

  this.debugger('HK colorTemp scale min : ' + this.colorTempMin);
  this.debugger('HK colorTemp scale max : ' + this.colorTempMax);

  this.debugger('HK Color Temp Range: ' + tmpRange);
  this.debugger('HK range %: ' + tuyaColorTempPercent);
  this.debugger('HK Value: ' + hkValue);

  return hkValue;

};


TuyaColorLight.prototype.debugger = function(args) {
  if(this.debug == true) {
    this.log.debug(this.debugPrefix, args);
  }
};

TuyaColorLight.prototype.identify = function (callback) {
  this.debugger(this.debugPrefix + _this.config.name + " was identified.");
  callback();
};
