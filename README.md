# MMM-Amazon
Amazon controller for MagicMirror. Multiples instances supports!

## Screenshot
- ![default](screenshots/Spotify_default.png)
- ![mini](screenshots/Spotify_mini.png)

## Main Features
- Showing Current playback on any devices
- Playing Controllable by Notification & touch (Play, pause, next, previous)
- Multiple instance module supported

## New updates
### 1.2.1 (2020-11-7)
- Fixed: Using old configuration error and api alexa error.

### 1.2 (2020-11-7)
- Added : `MULTIPLE MODULES`


- How to update from older version
```sh
cd ~/MagicMirror/modules/MMM-AmazonMusic
git pull
```
## Informations
- Base on MagicMiror Module for AMAZON
- https://github.com/eouia/MMM-AmazonMusic
- Base on jeedom Alexaapi for api
- https://github.com/sigalou/jeedom_alexaapi/tree/master/resources
- 

## Install
### 1. module install
```sh
cd ~/MagicMirror/modules
git clone https://github.com/MrPandawan/MMM-test MMM-AmazonMusic
cd MMM-AmazonMusic
npm install
```

### 2. Setup Configuration
### You should be to fetch your cookies api before anything else
1. Go to modules
2. Launch command to connect on you alexa amazon
```sh
cd ~/MagicMirror/modules/MMM-AmazonMusic
node resources/initCookie.js localhost
```

3. pening http://localhost:3457/ with your browser and complete form. 
   
4. After this configure setup the file `amazonmusic.config.json` with amazon want to fetch by default its alexa.amazon.fr
```json
  {
      "AUTH_DOMAIN" : "YOUR LOCAL HOST DOMAIN",
      "WEB_AMAZON": : "alexa.amazon.fr",
      "AUTH_PATH" : "/callback",
      "AUTH_PORT" : "YOUR PORT",
      "SCOPE" : "user-read-private playlist-read-private streaming user-read-playback-state user-modify-playback-state",
  }
```

5. Then configure your Magic Miror config `config.js` with one or more instance with correct name of your devices

```js
var config = {
 modules: [
		{
			module: "MMM-AmazonMusic",
			position: "bottom_left",
			config: {
				deviceName: "YourDeviceName",
				// style: "mini", // "default" or "mini" available
				// control: "hidden", //"default", "hidden" available
				// updateInterval: 1000,
		}
```

## Control with notification
- `AMAZON_PLAY` : playing specific amazinuri.
```
  this.sendNotification("AMAZON_PLAY" + device name, "deviceId:3ENXjRhFPkH8YSH3qBXTfQ")
```
The AMAZON_PLAY notification can also be used as `resume` feature of stopped/paused player, when used without payloads
- `AMAZON_PAUSE` : pausing current playback.
```
  this.sendNotification("AMAZON_PAUSE + deviceName")
```
- `AMAZON_NEXT` : next track of current playback.
```
  this.sendNotification("AMAZON_NEXT + deviceName")
```
- `AMAZON_PREVIOUS` : previous track of current playback.
```
  this.sendNotification("AMAZON_PREVIOUS + deviceName")
```

## Credit
Special thanks to @KARIM-troll so much for taking the time to cowork to make this module.
