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

    /**
     * Alexa.Command *****
     * URL: /command?device=?&command=?
     * device - String - name or ID of the device
     * command - String - command : pause|play|next|prev|fwd|rwd|shuffle|repeat|vol:<0-100>
     **/
    // Commande de requete sur Amazon Api
    doRequest(api, type, qsParam, bodyParam, cb) {
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
        var req = () => {
            request(authOptions.url, (error, response, body) => {
                if (error) {
                    console.log(`[AMAZONMUSIC] API Request fail on :`, api)
                    cb(null, error, body)
                }
                else if (cb) {
                    if (response) {
                        cb(response.statusCode, error, body)
                    } else {
                        console.log(`[AMAZONMUSIC] Invalid response`)
                        cb(response.statusCode, error, body)
                    }
                }
            })
        }
        req()
    }

    // Recupere les informations de la musique en cours sur le device
    getCurrentPlayback(params, cb) {
        this.doRequest("/playerinfo?device=", "GET", null, params, cb)
    }

    // Recupere l'ensemble des devices amazon
    getDevices(cb) {
        this.doRequest("/devices", "GET", null, null, cb)
    }

    // Commande pour lecture sur le player
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=play
    play(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=play', cb)
    }

    // Commande pour pause sur le player
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=pause
    pause(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=pause', cb)
    }

    // Commande pour next sur la prochaine musique
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=next
    next(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=next', cb)
    }

    // Commande pour jouer la musique precedente
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=prev
    previous(param, cb) {
        this.doRequest("/command?device=", "POST", null, param + '&command=previous', cb)
    }

    // Command pour repeat la musique en cours
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=repeat
    repeat(param, cb) {
        this.doRequest("/command?device=", "POST", null, param.device + '&command=repeat&value=' + param.value, cb)
    }

    // Command pour shuffle la musique en cours
    // command?device=  ae816d7d455646f6801e5750ad01065c  &command=shuffle
    shuffle(param, cb) {
        this.doRequest("/command?device=", "POST", null, param.device + '&command=shuffle&value=' + param.value, cb)
    }
}

module.exports = AmazonMusic
