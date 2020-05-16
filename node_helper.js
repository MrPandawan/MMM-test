//
// Module : MMM-AmazonMusic
//
"use strict"
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const fs = require("fs")
const path = require("path")
const Spotify = require("./Spotify.js")
var NodeHelper = require("node_helper")

// recupere les infos lie a la cofiguration en dur
let updateOldSingleSpotifyConfigurationToNewMultipleSpotifyConfiguration = function (configuration) {
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
        this.spotifyConfigurations = []; // Configuration from spotify.config.json file.
        this.spotify = null;
        this.devices = [];
        this.spotifies = [];
        let file = path.resolve(__dirname, "spotify.config.json");
        if (fs.existsSync(file)) {
            let parsedConfigurations = JSON.parse(fs.readFileSync(file));
            this.spotifyConfigurations = updateOldSingleSpotifyConfigurationToNewMultipleSpotifyConfiguration(parsedConfigurations);
            this.spotifyConfigurations.forEach(configuration => {
                this.spotifies.push(new Spotify(configuration));
            });
        }
        this.lancerExect();
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
        // })
    },

    // Init after DOM_OBJECTS_CREATED
    // Define config HERE
    initAfterLoading: function (config) {
        this.config = config
        this.updateDevicesConnects().then(r => {
            console.log('[MMM-AmazonMusic] Starting', r);
        }).catch(e => {
            console.log('[MMM-AmazonMusic] Starting', r);
        })
    },

    // Find all devices
    findAllDevices: function (spotify) {
        return new Promise((resolve, reject) => {
            spotify.getDevices((code, error, result) => {
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
        for (const spotify of this.spotifies) {
            try {
                let result = await this.findAllDevices(spotify);
                this.spotify = spotify;
                this.sendSocketNotification("CURRENT_DEVICES_" + this.config.deviceName, result);
                return result
            } catch (e) {
                console.log('Dont get any device found:' + e, spotify.config.USERNAME);
                throw new Error(e);
            }
        }
    },

    // Get from amazon music playing and return result
    updateAmazon: async function (serial) {
        return new Promise((resolve, reject) => {
            this.spotify.getCurrentPlayback(serial, (code, error, result) => {
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
            console.log("[AMAZON] This Amazon is not playing:", spotify.config.deviceName)
        }
        // playing is false so retry
        if (!playing) {
            this.sendSocketNotification("CURRENT_PLAYBACK_FAIL_" + this.config.deviceName);
            setTimeout(() => {
                this.findCurrentPlayBack(serial);
            }, this.config.updateInterval);
            // spotify is true so update Pulse to set music
        } else {
            setTimeout(() => {
                this.updatePulse(serial);
            }, this.config.updateInterval)
        }
    },

    // update after stop playing
    updatePulse: function (serial) {
        if (this.spotify == null) {
            this.updateDevicesConnects()
            return
        }
        this.spotify.getCurrentPlayback(serial, (code, error, result) => {
            if (result === "undefined" || code !== 200) {
                this.spotify = null;
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
            //         this.spotify.play({uris: [payload.spotifyUri]})
            //     } else if (payload.spotifyUri) {
            //         this.spotify.play({context_uri: payload.spotifyUri})
            //     }
            //     if (payload.deviceName) this.spotify.transferByName(payload.deviceName)
            // }

            // if (noti == "GET_DEVICES") {
            //     this.spotify.getDevices((code, error, result) => {
            //         this.sendSocketNotification("LIST_DEVICES", result)
            //     })
            // }

            // if (noti == "PLAY") {
            //     this.spotify.play(payload, (code, error, result) => {
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
        // if (noti == "AMAZON_UPDATE_PLAYING_" + this.config.deviceName) {
        //     if (payload == "PLAYING") {
        //         this.sendSocketNotification("CURRENT_PLAYBACK_FAIL", null);
        //         setTimeout(() => {
        //             this.updateDevicesConnects();
        //         }, this.config.updateInterval);
        //     } else {
        //         this.updatePulse();
        //     }
        // }
        // if (noti == "PAUSE") {
        //     this.spotify.pause((code, error, result) => {
        //         this.sendSocketNotification("DONE_PAUSE", result)
        //     })
        // }

        // if (noti == "NEXT") {
        //     this.spotify.next((code, error, result) => {
        //         this.sendSocketNotification("DONE_NEXT", result)
        //     })
        // }

        // if (noti == "PREVIOUS") {
        //     this.spotify.previous((code, error, result) => {
        //         this.sendSocketNotification("DONE_PREVIOUS", result)
        //     })
        // }

        // if (noti == "VOLUME") {
        //     this.spotify.volume(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_VOLUME", result)
        //     })
        // }

        // if (noti == "SEARCH_AND_PLAY") {
        //     this.searchAndPlay(payload.query, payload.condition)
        // }

        // if (noti == "TRANSFER") {
        //     this.spotify.transferByName(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_TRANSFER", result)
        //     })
        // }

        // if (noti == "REPEAT") {
        //     this.spotify.repeat(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_REPEAT", result)
        //     })
        // }

        // if (noti == "SHUFFLE") {
        //     this.spotify.shuffle(payload, (code, error, result) => {
        //         this.sendSocketNotification("DONE_SHUFFLE", result)
        //     })
        // }

        // if (noti == "REPLAY") {
        //     this.spotify.replay((code, error, result) => {
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
    //             console.log("[SPOTIFY] Unplayable item: ", r)
    //             return false
    //         }
    //     }
    //     this.spotify.search(param, (code, error, result) => {
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
    //                 this.spotify.play(foundForPlay, (code, error, result) => {
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
