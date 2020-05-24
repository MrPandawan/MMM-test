//
// Module : MMM-AmazonMusic
// Developer : 
//

const fetch = require('node-fetch');
const fs = require("fs")
const path = require("path")
const request = require("request")
const querystring = require("querystring")
const opn = require("open")
const express = require("express")
const app = express()

class AmazonMusic {
    constructor(config = null) {
        if (config == null) {
            config = {
                "AUTH_DOMAIN": "http://localhost",
                "AUTH_PATH": "/callback",
                "WEB_AMAZON": "alexa.amazon.fr",
                "AUTH_PORT": ":3000",
                "SCOPE": "user-read-private app-remote-control playlist-read-private streaming user-read-playback-state user-modify-playback-state",
            }
        }
        this.redirect_uri = null
        this.state = ""
        this.config = config
        this.devices = [];
        var redirect_uri = this.config.AUTH_DOMAIN
        redirect_uri += ":" + this.config.AUTH_PORT
        redirect_uri += this.config.AUTH_PATH
        this.redirect_uri = redirect_uri
        this.state = Date.now()
    }

    authFlow(afterCallback = () => {
    }, error = () => {
    }) {
    }

    /***** Alexa.Command *****
        URL: /command?device=?&command=?
        device - String - name of the device
        command - String - command : pause|play|next|prev|fwd|rwd|shuffle|repeat
    */
    doRequest(api, type, qsParam, bodyParam, cb) {
        //console.log("TESSSTT");
        var authOptions = {
            url: this.config.AUTH_DOMAIN + this.config.AUTH_PORT + api,
            method: type,
            headers: {
                'Authorization': "Bearer "
            },
            json: true
        }
        if (bodyParam) {
            authOptions.url += bodyParam
        }
        console.log(authOptions.url);
        // if (qsParam) {
        //     authOptions.qs = qsParam
        // }
        // console.log(authOptions);
        var req = () => {
            request(authOptions.url, (error, response, body) => {
                if (error) {
                    console.log(`[AMAZONMUSIC] API Request fail on :`, api)
                    cb(error, body)
                } else {
                    if (api !== "/v1/me/player" && type !== "GET") {
                        console.log(`[AMAZONMUSIC] API Requested:`, api)
                    }
                }
                if (cb) {
                    if (response.statusCode) {
                        cb(response.statusCode, error, body)
                    } else {
                        console.log(`[AMAZONMUSIC] Invalid response`)
                        cb('400', error, body)
                    }
                }
            })
        }
        req()
    }

    getMediaCurrent(params, cb) {
        this.doRequest("/media?device=", "GET", null, params, cb);
    }
    getCurrentPlayback(params, cb) {
        this.doRequest("/playerinfo?device=", "GET", null, params, cb)
    }

    getDevices(cb) {
        this.doRequest("/devices", "GET", null, null, cb)
    }

    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=play
    play(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=play', cb)
    }

    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=pause
    pause(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=pause', cb)
    }

    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=next
    next(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=pause', cb)
    }

    previous(cb) {
        /*
        this.doRequest("/v1/me/player/previous", "POST", null, null, (code, error, body)=>{
          this.doRequest("/v1/me/player/seek", "PUT", null, {position_ms:0}, cb)
        })
        */
        this.doRequest("/v1/me/player/seek", "PUT", { position_ms: 0 }, null, (code, error, body) => {
            this.doRequest("/v1/me/player/previous", "POST", null, null, cb)
        })
    }

    search(param, cb) {
        param.limit = 50
        this.doRequest("/v1/search", "GET", param, null, cb)
    }

    transfer(req, cb) {
        if (req.device_ids.length > 1) {
            req.device_ids = [req.device_ids[0]]
        }
        this.doRequest("/v1/me/player", "PUT", null, req, cb)
    }

    transferByName(device_name, cb) {
        this.getDevices((code, error, result) => {
            if (code == 200) {
                var devices = result.devices
                for (var i = 0; i < devices.length; i++) {
                    if (devices[i].name == device_name) {
                        this.transfer({ device_ids: [devices[i].id] }, cb)
                        return
                    }
                }
            } else {
                cb(code, error, result)
            }
        })
    }

    volume(volume = 50, cb) {
        this.doRequest("/v1/me/player/volume", "PUT", { volume_percent: volume }, null, cb)
    }

    repeat(state, cb) {
        this.doRequest("/v1/me/player/repeat", "PUT", { state: state }, null, cb)
    }

    shuffle(state, cb) {
        this.doRequest("/v1/me/player/shuffle", "PUT", { state: state }, null, cb)
    }

    replay(cb) {
        this.doRequest("/v1/me/player/seek", "PUT", { position_ms: 0 }, null, cb)
    }
}

module.exports = AmazonMusic
