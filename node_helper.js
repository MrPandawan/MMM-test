//
// Module : MMM-AmazonMusic
//
"use strict"
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const fs = require("fs")
const path = require("path")
const AmazonMusic = require("./AmazonMusic.js")
var NodeHelper = require("node_helper")

// recupere les infos lie a la cofiguration en dur
let updateOldSingleAmazonmusicConfigurationToNewMultipleAmazonmusicConfiguration = function (configuration) {
    if (Array.isArray(configuration)) {
        // not update required
        return configuration;
    }
    return [configuration];
};

// MODULES
module.exports = NodeHelper.create({
    start: function () {
        this.config = null; // Configuration come from MM config file.
        this.amazonmusicConfigurations = []; // Configuration from amazonmusic.config.json file.
        this.amazonmusic = null;
        this.devices = [];
        this.spotifies = [];
        let file = path.resolve(__dirname, "amazonmusic.config.json");
        if (fs.existsSync(file)) {
            let parsedConfigurations = JSON.parse(fs.readFileSync(file));
            this.amazonmusicConfigurations = updateOldSingleAmazonmusicConfigurationToNewMultipleAmazonmusicConfiguration(parsedConfigurations);
            this.amazonmusicConfigurations.forEach(configuration => {
                this.spotifies.push(new AmazonMusic(configuration));
            });
        }
        //this.lancerExect();
    },

    // Try to launch command for fetch AlexaApie
    lancerExect: async function () {
        let cmd = 'node ./modules/MMM-AmazonMusic/resources/alexaapi.js ' + this.spotifies[0].config.AUTH_DOMAIN + ' null ' + this.spotifies[0].config.WEB_AMAZON + ' 100'
        // return new Promise((resolve, reject) => {
        try {
            let result = await exec(cmd);
            return (result);
        } catch (err) {
            throw new Error(err);
        }
    },

    // Init after DOM_OBJECTS_CREATED
    // Define config HERE
    initAfterLoading: function (config) {
        this.config = config
        this.updateDevicesConnects().then(r => {
            console.log('[MMM-AmazonMusic] Starting', r);
        }).catch(e => {
            console.log('[MMM-AmazonMusic] Starting');
        })
    },

    // Find all devices
    findAllDevices: function (amazonmusic) {
        return new Promise((resolve, reject) => {
            amazonmusic.getDevices((code, error, result) => {
                if (code !== 200 || typeof result === "undefined") {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    },

    // Find the current Amazon Play on device name
    updateDevicesConnects: async function () {
        console.log("UPDATE DEVICE --> ")
        for (const amazonmusic of this.spotifies) {
            try {
                let result = await this.findAllDevices(amazonmusic);
                this.amazonmusic = amazonmusic;
                this.sendSocketNotification("CURRENT_DEVICES_" + this.config.deviceName, result);
                return result
            } catch (e) {
                console.log('Dont get any device found:' + e, this.config.deviceName);
                console.log("internet connexion failed OR SERVER amazon down");
                //this.lancerExect();
                setTimeout(() => {
                    this.updateDevicesConnects();
                }, 5000);
                throw new Error(e);
            }
        }
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

    findCurrentPlayBack: async function (serial) {
        let playing = false;
        try {
            console.log("Findu current Playback")
            playing = true;
            let result = await this.updateAmazon(serial);
            this.sendSocketNotification("CURRENT_PLAYBACK_TRUE_" + this.config.deviceName, result)
        } catch (e) {
            playing = false;
            console.log("[AMAZON] This Amazon is not playing:", amazonmusic.config.deviceName)
        }
        // playing is false so retry
        if (!playing) {
            this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + this.config.deviceName);
            setTimeout(() => {
                this.findCurrentPlayBack(serial);
            }, this.config.updateInterval);
            // amazonmusic is true so update Pulse to set music
        } else {
            setTimeout(() => {
                this.updatePulse(serial);
            }, this.config.updateInterval)
        }
    },

    // update after stop playing
    updatePulse: function (serial) {
        if (this.amazonmusic == null) {
            this.updateDevicesConnects()
            return
        }
        this.amazonmusic.getCurrentPlayback(serial, (code, error, result) => {
            if (result === "undefined" || code !== 200) {
                this.amazonmusic = null;
                this.updateDevicesConnects();
                this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + this.config.deviceName);
            } else {
                this.sendSocketNotification("CURRENT_PLAYBACK_TRUE_" + this.config.deviceName, result);
                setTimeout(() => {
                    this.updatePulse(serial)
                }, this.config.updateInterval)
            }
        })
    },

    // Receveild all notification
    socketNotificationReceived: function (noti, payload) {
        // when is initalised
        if (noti == "INIT") {
            console.log("INIT ICI -------->")
            this.initAfterLoading(payload)
        }

        // dont use
        if (noti == "ONSTART") {
            payload.position_ms = 0
            //     if (payload.search) {
            //         var param = {
            //             q: payload.search.keyword,
            //             type: payload.search.type,
            //         }
            //         var condition = {
            //             random: payload.search.random,
            //             autoplay: true,
            //         }
            //         this.searchAndPlay(param, condition)

            //     } else if (payload.spotifyUri.match("track")) {
            //         this.amazonmusic.play({uris: [payload.spotifyUri]})
            //     } else if (payload.spotifyUri) {
            //         this.amazonmusic.play({context_uri: payload.spotifyUri})
            //     }
            //     if (payload.deviceName) this.amazonmusic.transferByName(payload.deviceName)
            // }

            // if (noti == "GET_DEVICES") {
            //     this.amazonmusic.getDevices((code, error, result) => {
            //         this.sendSocketNotification("LIST_DEVICES", result)
            //     })
            // }

            // if (noti == "PLAY") {
            //     this.amazonmusic.play(payload, (code, error, result) => {
            //         if (code !== 204) {
            //             console.log(error)
            //             return
            //         }
            //         this.sendSocketNotification("DONE_PLAY", result)
            //     })
        }

        if (noti == "AMAZON_CURRENT_PLAYBACK_" + this.config.deviceName) {
            this.findCurrentPlayBack(payload);
        }
        // not use
        // if (noti == "AMAZON_UPDATE_PLAYING_" + this.config.deviceName) {
        //     console.log("PLAYNG")
        //     if (payload == "PLAYING") {
        //         this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + this.config.deviceName, null);
        //         // setTimeout(() => {
        //         //     this.updateDevicesConnects();
        //         // }, this.config.updateInterval);
        //     } else {
        //         this.updatePulse();
        //     }
        // }
        if (noti == "PAUSE_" + this.config.deviceName) {
            this.amazonmusic.pause(payload, (code, error, result) => {
                if (result) {
			console.log(result);
		}
	        else if (error) {
			console.log(code, error, "ERROR ICI POUR PAUSE");
		}
                this.sendSocketNotification("DONE_PAUSE", result)
            })
        }
        if (noti == "PLAY_" + this.config.deviceName) {
            this.amazonmusic.play(payload, (code, error, result) => {
                if (result) {
			console.log(result);
		}
	        else if (error) {
			console.log(code, error, "ERROR ICI POUR PLAY");
		}
                this.sendSocketNotification("DONE_PLAY", result)
            })
        }
        if (noti == "NEXT_"+this.config.deviceName) {
            this.amazonmusic.next(payload, (code, error, result) => {
                if (result) {
			console.log(result);
		}
	        else if (error) {
			console.log(code, error, "ERROR ICI POUR NEXT");
		}
                this.sendSocketNotification("DONE_NEXT", result)
            })
        }
	if (noti == "PREVIOUS_"+this.config.deviceName) {
            this.amazonmusic.previous(payload, (code, error, result) => {
                if (result) {
			console.log(result);
		}
	        else if (error) {
			console.log(code, error, "ERROR ICI POUR PREV");
		}
                this.sendSocketNotification("DONE_PREV", result)
            })
        }
	if (noti == "REPEAT_"+this.config.deviceName) {
            this.amazonmusic.repeat(payload, (code, error, result) => {
                if (result) {
			console.log(result);
		}
	        else if (error) {
			console.log(code, error, "ERROR ICI POUR REPEAT");
		}
                this.sendSocketNotification("DONE_REPEAT", result)
            })
        }



        // if (noti == "VOLUME") {
        //     this.amazonmusic.volume(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_VOLUME", result)
        //     })
        // }

        // if (noti == "SEARCH_AND_PLAY") {
        //     this.searchAndPlay(payload.query, payload.condition)
        // }

        // if (noti == "TRANSFER") {
        //     this.amazonmusic.transferByName(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_TRANSFER", result)
        //     })
        // }

        // if (noti == "SHUFFLE") {
        //     this.amazonmusic.shuffle(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_SHUFFLE", result)
        //     })
        // }

        // if (noti == "REPLAY") {
        //     this.amazonmusic.replay((code, error, result) => {
        //         this.sendSocketNotification("DONE_REPLAY", result)
        //     })
        // }
    },

    // searchAndPlay: function (param, condition) {
    //     if (!param.type) {
    //         param.type = "artist,track,album,playlist"
    //     } else {
    //         param.type = param.type.replace(/\s/g, '')
    //     }
    //     if (!param.q) {
    //         param.q = "something cool"
    //     }

    //     var pickup = (items, random, retType) => {
    //         var ret = {}
    //         var r = null
    //         r = (random) ? items[Math.floor(Math.random() * items.length)] : items[0]
    //         if (r.uri) {
    //             ret[retType] = (retType == "uris") ? [r.uri] : r.uri
    //             return ret
    //         } else {
    //             console.log("[AMAZONMUSIC] Unplayable item: ", r)
    //             return false
    //         }
    //     }
    //     this.amazonmusic.search(param, (code, error, result) => {
    //         //console.log(code, error, result)
    //         var foundForPlay = null
    //         if (code == 200) { //When success
    //             const map = {
    //                 "tracks": "uris",
    //                 "artists": "context_uri",
    //                 "albums": "context_uri",
    //                 "playlists": "context_uri"
    //             }
    //             //console.log(result)
    //             for (var section in map) {
    //                 if (map.hasOwnProperty(section) && !foundForPlay) {
    //                     var retType = map[section]
    //                     if (result[section] && result[section].items.length > 1) {
    //                         foundForPlay = pickup(result[section].items, condition.random, retType)
    //                     }
    //                 }
    //             }
    //             //console.log(foundForPlay)
    //             if (foundForPlay && condition.autoplay) {
    //                 this.amazonmusic.play(foundForPlay, (code, error, result) => {
    //                     if (code !== 204) {
    //                         return
    //                     }
    //                     this.sendSocketNotification("DONE_SEARCH_AUTOPLAY", result)
    //                 })
    //             } else {
    //                 // nothing found or not play.
    //                 this.sendSocketNotification("DONE_SEARCH_NOTHING")
    //             }
    //         } else { //when fail
    //             console.log(code, error, result)
    //             this.sendSocketNotification("DONE_SEARCH_ERROR")
    //         }
    //     })
    // }
})
