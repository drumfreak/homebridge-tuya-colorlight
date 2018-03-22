Tuya LED Color Light Support for Homebridge
===================================

Example `config.json` for LED Color Light Controllers that support RGB or RGBWW:

    "accessories": [
    	{
            "accessory": "TuyaColorLight",
            "name": "Fountain Color Light",
            "ip": "192.168.104.31",
            "devId": "XXXXXXXXXX",
            "localKey": "XXXXXXXXXXXXXX",
            "gwId":"XXXXXXXXXXXXXXXX",
            "productKey":"IXXXXXXXXXW",
            "apiMinTimeout" : 0,
            "apiMaxTimeout" : 200,
            "apiRetries": 0,
            "apiDebug" : false,
            "debugPrefix" : "~!~ ",
            "debug" : false,
            "deviceEnabled" : true
        }
    ]



Example `config.json` for Tuya based multiple LED Color Lights:

    "accessories": [
        {
            "accessory": "TuyaColorLight",
            "name": "Fountain Color Light",
            "ip": "192.168.104.31",
            "productId":"IXXXXXXXXXW",
            "devId": "XXXXXXXXXX",
            "localKey": "XXXXXXXXXXXXXX",
            "apiMinTimeout" : 0,
            "apiMaxTimeout" : 200,
            "apiRetries": 0,
            "apiDebug" : false,
            "debugPrefix" : "~!~ ",
            "debug" : false,
            "deviceEnabled" : true
        },

        {
            "accessory": "TuyaColorLight",
            "name": "Tree Color Light",
            "ip": "192.168.104.32",
            "productId":"IXXXXXXXXXW",
            "devId": "XXXXXXXXXX",
            "localKey": "XXXXXXXXXXXXXX",
            "apiMinTimeout" : 0,
            "apiMaxTimeout" : 200,
            "apiRetries": 0,
            "apiDebug" : false,
            "debugPrefix" : "~!~ ",
            "debug" : false,
            "deviceEnabled" : true
        }
    ]


This was originally derived from the [homebridge-tuya-outlet](https://github.com/codetheweb/homebridge-tuya-outlet) plugin and modified to utilize the 'dps' in the Tuya api for managing multiple device function points.

Carefully read and review the procedures to obtain the Tuya api device ID (hint: it has the MAC address in it) and the localKey. It's quite a procedure, but it's easy once learned: [Tuya API Sniffing Procedures](https://github.com/codetheweb/tuyapi/blob/master/docs/SETUP.md)

This plugin requires a modified version of the tuyapi that I extended found here: [homebridge-tuyapi-extended](https://github.com/drumfreak/homebridge-tuyapi-extended)

See [tuyapi](https://github.com/codetheweb/tuya-device) for original inspiration.

Tested on the following LED lights (Non affiliated links following:)
* [LOHAS RGB Floodlight 10W, Smart Control, Waterproof(IP65)](https://www.amazon.com/gp/product/B0796NFV4K/)
* [LOHAS LED GU24 Bulb, A19 Smart Wi-Fi Light, Color Changing Multicolor Dimmable Bulbs, 60W Equivalent](https://www.amazon.com/gp/product/B078JN566Z)

This plugin should work with any TUYA based LED Color light that can be added to the Tuya, or Smart Life apps. A popular brand I've found is [LOHAS Lights](http://www.lohas-led.com/) or on Amazon: [LOHAS Lights on Amazon](https://www.amazon.com/s?ie=UTF8&me=A2X4NE86JUW3T&page=1)

Helpful things to note:

1. I found it is best to assign a static IP address through DHCP on my router to each device. Add that IP address to the config file in homebridge when setting up your devices. So each unique physical device should have it's own static ip.  Even though this is not required in the original [tuyapi](https://github.com/codetheweb/tuya-device) and [homebridge-tuya-outlet](https://github.com/codetheweb/homebridge-tuya-outlet), I found that there is a potential hang in homebridge while waiting on the IP address to be obtained. By adding it static, it reduced the wait time and lag when accessing these devices.

2. At this time, until the [homebridge-tuyapi-extended](https://github.com/drumfreak/homebridge-tuyapi-extended) is updated, if you add a device and it is in your config file, but unplugged, this may cause your homebridge to crash or hang. This is being worked out, and a reason for the fork of the original tuyapi.


