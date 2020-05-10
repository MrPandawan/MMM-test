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

let updateOldSingleSpotifyConfigurationToNewMultipleSpotifyConfiguration = function (configuration) {
    if (Array.isArray(configuration)) {
        // not update required
        return configuration;
    }

    return [configuration];
};

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
    },

    // Try to launch command for fetch AlexaApie
    lancerExect: async function () {
        let cmd = 'node ./modules/MMM-AmazonMusic/resources/alexaapi.js ' + this.spotifies[0].config.AUTH_DOMAIN + ' null ' + this.spotifies[0].config.WEB_AMAZON + ' 100'
        try {
            let result = await exec(cmd);

        } catch (err) {
            throw new Error(err);
        }
    },

    // Init after DOM_OBJECTS_CREATED
    initAfterLoading: function (config) {
        this.config = config
        this.lancerExect().then(l => {
            this.findCurrentAmazonPlay().then(r => {
                console.log('[MMM-AmazonMusic] Starting', r);
            });
        }).catch(e => {
            console.log("[serveur Amazon] deja lance", e)
            this.findCurrentAmazonPlay().then(r => {
                console.log('[MMM-AmazonMusic] Starting', r);
            });
        })
    },

    // Find the current Amazon Play on device name
    findCurrentAmazonPlay: async function () {
        let playing = false;
        for (const spotify of this.spotifies) {
            try {
                let result = await this.updateSpotify(spotify);
                this.spotify = spotify;
                playing = true;
                this.sendSocketNotification("CURRENT_DEVICES_" + this.config.deviceName, result);
            } catch (e) {
                console.log('This spotify is not playing:', spotify.config.USERNAME)
            }
        }

    },

    updateSpotify: function (spotify) {
        return new Promise((resolve, reject) => {
            // spotify.getCurrentPlayback((code, error, result) => {
            //     if (code !== 200 || typeof result === "undefined") {
            //         reject();
            //     } else {
            //         resolve(result);
            //     }
            // });
            spotify.getDevices((code, error, result) => {
                if (code !== 200 || typeof result === "undefined") {
                    reject();
                } else {
                    resolve(result);
                }
            });
        });
    },

    // updatePulse: function () {
    //     this.spotify.getCurrentPlayback((code, error, result) => {
    //         if (code !== 200 || typeof result == "undefined") {
    //             this.sendSocketNotification("CURRENT_PLAYBACK_FAIL", null);
    //             this.spotify = null;
    //             this.findCurrentAmazonPlay();
    //         } else {
    //             this.sendSocketNotification("CURRENT_PLAYBACK", result);
    //             setTimeout(() => {
    //                 this.updatePulse()
    //             }, this.config.updateInterval)
    //         }
    //     })
    // },

    socketNotificationReceived: function (noti, payload) {
        if (noti == "INIT") {
            this.initAfterLoading(payload)
            this.sendSocketNotification("INITIALIZED")
        }

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

        if (noti == "AMAZON_PLAYER_UDATE_" + this.config.deviceName) {
            //    this.spotify.getMediaCurrent(payload, (code, error, result) => {
            //        console.log(result);
            //    })
            this.spotify.getCurrentPlayback(payload, (code, error, result) => {
                if (result) {
                    this.sendSocketNotification("ANAZON_PLAY_DONE_" + this.config.deviceName, result)
                } else {
                    console.log("ERREUR Code :", code, error);
                }
            })
        }
        if (noti == "AMAZON_UPDATE_PLAYING_" + this.config.deviceName) {
            if (payload == "PLAYING") {
                this.sendSocketNotification("CURRENT_PLAYBACK_FAIL", null);
                setTimeout(() => {
                    this.findCurrentAmazonPlay();
                }, this.config.updateInterval);
            } else {
                this.updatePulse();
            }
        }
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
