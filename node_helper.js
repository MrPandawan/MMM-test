//
// Module : MMM-AmazonMusic
//
"use strict"
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const fs = require("fs")
const path = require("path")
const AmazonMusic = require("./AmazonMusic.js")
var NodeHelper = require("node_helper");

var colorCyan = '\x1b[36m%s\x1b[0m';
var colorRed = '\x1b[31m%s\x1b[0m';
// MODULES
module.exports = NodeHelper.create({
    start: function () {
        this._init = false;
        this.config = []; // Configuration come from MM config file and save each on array
        this.amazonmusic = [];
        // lecture du fichier de configuration amazon auth server
        let file = path.resolve(__dirname, "amazonmusic.config.json");
        if (fs.existsSync(file)) {
            let parsedConfigurations = JSON.parse(fs.readFileSync(file));
            this.amazonmusic = new AmazonMusic(parsedConfigurations);
        }
        // Lancement de l'executable api pour recuperer les ressources
        this.lancerExect().catch(e => {
            console.log(colorRed, '========== An error on init lancerExect : ==========');
            console.error(e);
        });
    },

    // Try to launch command for fetch AlexaApi
    lancerExect: function () {
        let cmd = 'node ./modules/MMM-AmazonMusic/resources/alexaapi.js ' + this.amazonmusic.config.AUTH_DOMAIN + ' null ' + this.amazonmusic.config.WEB_AMAZON + ' 100'
        return new Promise(async (resolve, reject) => {
            try {
                let result = await exec(cmd);
                return resolve(result);
            } catch (err) {
                return reject(err);
            }
        });
    },

    // Init after DOM_OBJECTS_CREATED
    // Define config HERE
    initAfterLoading: async function (config) {
        console.log(config)
        this.config.push(config)
        await this.updateDevicesConnects(config).then(() => {
            console.log(colorCyan, '========== [MMM-AmazonMusic] Starting On ' + config.deviceName + ' ==========');
        });
    },

    // Find all devices
    findAllDevices: function () {
        return new Promise((resolve, reject) => {
            this.amazonmusic.getDevices((code, error, result) => {
                if (code !== 200 || typeof result === "undefined") {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    },

    // Find the current Amazon Play on device name
    updateDevicesConnects: async function (config) {
        await this.findAllDevices().then(result => {
            this.sendSocketNotification("CURRENT_DEVICES_" + config.deviceName, result);
            return Promise.resolve(result)
        }).catch(e => {
            console.error(colorRed, 'Connexion refuse : ' + e, ' pour le device  :' + config.deviceName);
            console.error(colorRed, "internet connexion failed OR SERVER amazon down retry to connect");
            setTimeout(() => {
                this.updateDevicesConnects(config);
            }, 3000);
        });
    },

    // Get from amazon music playing and return result
    updateAmazon: async function (serial) {
        return new Promise((resolve, reject) => {
            this.amazonmusic.getCurrentPlayback(serial, (code, error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    console.log("ERREUR Code no playblack found:", code, error);
                    reject(error);
                }
            });
        });
    },

    findCurrentPlayBack: async function (config, serial) {

        let playing = false;
        try {
            playing = true;
            let result = await this.updateAmazon(serial);
            if (result.state) {
                this.sendSocketNotification("CURRENT_PLAYBACK_TRUE_" + config.deviceName, result)
                // throw new Error('no playing')
            }
        } catch (e) {
            playing = false;
            console.log("[AMAZON] This Amazon is not playing:", config.deviceName)
        }
        // playing is false so retry
        if (!playing) {
            this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + config.deviceName);
            setTimeout(() => {
                this.findCurrentPlayBack(config, serial);
            }, config.updateInterval);
            // amazonmusic is true so update Pulse to set music
        } else {
            setTimeout(() => {
                this.updatePulse(config, serial);
            }, config.updateInterval)
        }
    },

    // update after stop playing
    updatePulse: function (config, serial) {
        if (this.amazonmusic == null) {
            this.updateDevicesConnects(config)
            return
        }
        this.amazonmusic.getCurrentPlayback(serial, (code, error, result) => {
            if (result === "undefined" || code !== 200) {
                this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + config.deviceName);
            } else {
                this.sendSocketNotification("CURRENT_PLAYBACK_TRUE_" + config.deviceName, result);
                setTimeout(() => {
                    this.updatePulse(config, serial)
                }, config.updateInterval);
            }
        })
    },


    // Receveild all notification
    socketNotificationReceived: function (noti, payload) {
        // when is initalised
        if (noti == "INIT") {
            this.initAfterLoading(payload);
        }
        this.config.forEach(spot => {
            if (noti == "AMAZON_CURRENT_PLAYBACK_" + spot.deviceName) {
                this.findCurrentPlayBack(spot, payload.serial);
            }
            if (noti == "PAUSE_" + spot.deviceName) {
                this.amazonmusic.pause(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_PAUSE", result)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande pause");
                    }
                })
            }
            if (noti == "PLAY_" + spot.deviceName) {
                this.amazonmusic.play(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_PLAY", result)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande play");
                    }
                })
            }
            if (noti == "NEXT_" + spot.deviceName) {
                this.amazonmusic.next(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_NEXT", result)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande next");
                    }
                })
            }
            if (noti == "PREVIOUS_" + spot.deviceName) {
                this.amazonmusic.previous(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_PREV", result)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande previous");
                    }
                })
            }
            if (noti == "REPEAT_" + spot.deviceName) {
                this.amazonmusic.repeat(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_REPEAT_" + spot.deviceName, payload.value)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande repeat");
                    }
                })
            }
            if (noti == "SHUFFLE_" + spot.deviceName) {
                this.amazonmusic.shuffle(payload, (code, error, result) => {
                    if (result) {
                        this.sendSocketNotification("DONE_SHUFFLE_" + spot.deviceName, payload.value)
                    }
                    else if (error) {
                        console.error(code, error, "Erreur sur la commande repetition");
                    }
                })
            }
        });
    },
})
