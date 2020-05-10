//
// Module : MMM-Spotify
//
var i = 0;
Module.register("MMM-AmazonMusic", {
  defaults: {
    deviceName: null,
    style: "default", // "default", "mini" available.
    control: "default", //"default", "hidden" available
    updateInterval: 1000,
    allowDevices: [],
    iconify: "https://code.iconify.design/1/1.0.0-rc7/iconify.min.js",
    //iconify: null,
    //When you use this module with `MMM-CalendarExt` or any other `iconify` used modules together, Set this null.

    onStart: null,
    //If you want to play something on start; set like this.
    /* remove all from it
    onStart: {
      deviceName: "Web Player (Chrome)", //if null, current(last) activated device will be.
      spotifyUri : "spotify:playlist:37i9dQZF1DX9EM98aZosoy", //when search is set, sportifyUri will be ignored.
      search: {
        type: "artist, track", // `artist`, track`, `album`, `playlist` available
        keyword: "michael+jackson",
        random:true,
      }
    }
    */
  },

  getScripts: function () {
    r = []
    if (this.config.iconify) {
      r.push(this.config.iconify)
    }
    return r
  },

  getStyles: function () {
    return ["MMM-AmazonMusic.css"]
  },

  start: function () {
    this.currentPlayback = null
  },

  // NOTIF RECEVED MAIN MODULES
  notificationReceived: function (noti, payload, sender) {
    // First notif after init all modules from main
    if (noti === "DOM_OBJECTS_CREATED") {
      this.sendSocketNotification("INIT", this.config)
      // after INIT and launch configuration
    }
    // all other notif
    switch (noti) {
      case "SPOTIFY_SEARCH":
        this.sendSocketNotification("SEARCH_AND_PLAY", pl)
        break
      case "SPOTIFY_PLAY":
        this.sendSocketNotification("PLAY", payload)
        break
      case "SPOTIFY_PAUSE":
        this.sendSocketNotification("PAUSE")
        break
      case "SPOTIFY_NEXT":
        this.sendSocketNotification("NEXT")
        break
      case "SPOTIFY_PREVIOUS":
        this.sendSocketNotification("PREVIOUS")
        break
      case "SPOTIFY_VOLUME":
        this.sendSocketNotification("VOLUME", payload)
        break
      case "SPOTIFY_TRANSFER":
        this.sendSocketNotification("TRANSFER", payload)
        break
      case "SPOTIFY_SHUFFLE":
        this.clickShuffle()
        break
      case "SPOTIFY_REPEAT":
        this.clickRepeat()
        break
      case "SPOTIFY_TOGGLE":
        this.clickPlay()
        break
    }
  },

  // Get le device online and parse function
  checkDevicesOnline: function (devices) {
    let obj = JSON.parse(devices)
    console.log(obj)
    for (let index = 0; index < obj.length; index++) {
      const element = obj[index];
      if (this.config.deviceName === element.name && element.online) {
        if (element.capabilities.includes("AUDIO_PLAYER")) {
          this.sendSocketNotification("AMAZON_PLAYER_UDATE_" + this.config.deviceName, element.serial)
        }
      }
    }
  },

  // Socket NOTI from Node Helper
  socketNotificationReceived: function (noti, payload) {
    switch (noti) {
      case "INITIALIZED":
        break
      case "CURRENT_DEVICES_" + this.config.deviceName:
        this.checkDevicesOnline(payload);
        console.log(JSON.parse(payload));

        break;
      case "ANAZON_PLAY_DONE_" + this.config.deviceName:
        let playerInfo = JSON.parse(payload);
        this.updateCurrentPlayback(playerInfo);
        break;
      case "CURRENT_PLAYBACK":
        if (
          (this.config.allowDevices.length === 0)
          || (this.config.allowDevices.length >= 1 && this.config.allowDevices.includes(payload.device.name))
        ) {
          this.updateCurrentPlayback(payload)
        } else {
          this.currentPlayback = null
          this.updateDom()
        }
        break
      case "CURRENT_PLAYBACK_FAIL":
        this.updateNoPlayback()
    }
    if (noti.search("DONE_") > -1) {
      this.sendNotification(noti)
    }
  },

  updateNoPlayback: function () {
    var dom = document.getElementById("SPOTIFY")
    dom.classList.add("inactive")
  },

  updateCurrentPlayback: function (current) {
    if (!current) return
    if (!this.currentPlayback) {
      console.log(current);
      console.log("PAYBACK CUrRENT");
      console.log("INFO MusIC ICI : ", i++)
      this.updateSongInfo(current)
      // this.updatePlaying(current)
      // this.updateDevice(current)
      // this.updateShuffle(current)
      // this.updateRepeat(current)
      this.updateProgress(current)
    //   } else {
    //     if (this.currentPlayback.is_playing !== current.is_playing) {
    //       this.updateSongInfo(current)
    //       this.updatePlaying(current)
    //     }
    //     if (this.currentPlayback.item.id !== current.item.id) {
    //       this.updateSongInfo(current)
    //     }
    //     if (this.currentPlayback.device.id !== current.device.id) {
    //       this.updateDevice(current)
    //     }
    //     if (this.currentPlayback.repeat_state !== current.repeat_state) {
    //       this.updateRepeat(current)
    //     }
    //     if (this.currentPlayback.shuffle_state !== current.shuffle_state) {
    //       this.updateShuffle(current)
    //     }
    //     if (this.currentPlayback.progress_ms !== current.progress_ms) {
    //       this.updateProgress(current)
    //     }
    }

    this.currentPlayback = current
  },

  updateProgress: function (
    current,
    end = document.getElementsByClassName("SPOTIFY_PROGRESS_END"+ this.config.deviceName.replace(/\s+/g, ''))[0],
    curbar = document.getElementsByClassName("SPOTIFY_PROGRESS_CURRENT" + this.config.deviceName.replace(/\s+/g, ''))[0],
    now = document.getElementsByClassName("SPOTIFY_PROGRESS_BAR_NOW"+this.config.deviceName.replace(/\s+/g, ''))[0]
  ) {
    var msToTime = (duration) => {
      var ret = ""
      var milliseconds = parseInt((duration % 1000) / 100)
        , seconds = parseInt((duration / 1000) % 60)
        , minutes = parseInt((duration / (1000 * 60)) % 60)
        , hours = parseInt((duration / (1000 * 60 * 60)) % 24)
      if (hours > 0) {
        hours = (hours < 10) ? "0" + hours : hours
        ret = ret + hours + ":"
      }
      minutes = (minutes < 10) ? "0" + minutes : minutes
      seconds = (seconds < 10) ? "0" + seconds : seconds
      return ret + minutes + ":" + seconds
    }
    var songDur = current.playerInfo.progress.mediaLength
    var cur = current.playerInfo.progress.mediaProgress
    var pros = (cur / songDur) * 100
    
    end.innerHTML = msToTime(songDur)
    curbar.innerHTML = msToTime(cur)
    console.log(songDur, cur)
    now.style.width = pros + "%"
  },

  updateShuffle: function (newPlayback) {
    var shuffle = document.getElementById("SPOTIFY_CONTROL_SHUFFLE")
    var si = document.createElement("span")
    si.className = "iconify"
    si.dataset.icon = "mdi:shuffle"
    if (newPlayback.shuffle_state) {
      shuffle.className = "on"
      si.dataset.icon = "mdi:shuffle"
    } else {
      shuffle.className = "off"
      si.dataset.icon = "mdi:shuffle-disabled"
    }
    shuffle.innerHTML = ""
    shuffle.appendChild(si)
  },

  updateRepeat: function (newPlayback) {
    var repeat = document.getElementById("SPOTIFY_CONTROL_REPEAT")
    var ri = document.createElement("span")
    ri.className = "iconify"
    ri.dataset.inline = "false"
    repeat.className = newPlayback.repeat_state
    const ris = {
      "off": "mdi:repeat-off",
      "track": "mdi:repeat-once",
      "context": "mdi:repeat"
    }
    ri.dataset.icon = ris[newPlayback.repeat_state]
    repeat.innerHTML = ""
    repeat.appendChild(ri)
  },

  updateDevice: function (newPlayback) {
    var device = document.querySelector("#SPOTIFY_DEVICE .text")
    device.textContent = newPlayback.device.name
    this.sendNotification("SPOTIFY_UPDATE_DEVICE", newPlayback.device)
  },

  updatePlaying: function (newPlayback) {
    var s = document.getElementById("SPOTIFY")
    var p = document.getElementById("SPOTIFY_CONTROL_PLAY")
    var pi = document.createElement("span")
    pi.className = "iconify"
    pi.dataset.inline = "false"
    if (newPlayback.state === "PLAYING") {
      s.classList.add("playing")
      s.classList.remove("pausing")
      s.classList.remove("inactive")
      pi.dataset.icon = "mdi:play-circle-outline"
      p.className = "playing"
    } else {
      s.classList.add("pausing")
      s.classList.remove("playing")
      s.classList.remove("inactive")
      pi.dataset.icon = "mdi:pause-circle-outline"
      p.className = "pausing"
    }
    p.innerHTML = ""
    p.appendChild(pi)
    this.sendNotification("AMAZON_UPDATE_PLAYING_"+this.config.deviceName, newPlayback.state)
  },

  updateSongInfo: function (newPlayback) {
    if (!newPlayback) return
    if (!newPlayback.playerInfo) return
    var sDom = document.getElementsByClassName("SPOTIFY" +this.config.deviceName.replace(/\s+/g, ''))[0]
    console.log(sDom)
    sDom.classList.remove("noPlayback")

    var cover_img = document.getElementsByClassName("SPOTIFY_COVER_IMAGE"+this.config.deviceName.replace(/\s+/g, ''))
    cover_img[0].src = newPlayback.playerInfo.mainArt.url;

    var back = document.getElementsByClassName("SPOTIFY_BACKGROUND"+this.config.deviceName.replace(/\s+/g, ''))
    back[0].style.backgroundImage = `url(${newPlayback.playerInfo.mainArt.url})`
    // var test = ".SPOTIFY_TITLE" + this.config.deviceName.replace(/\s+/g, '')
    var title = document.getElementsByClassName("SPOTIFY_TITLE" + this.config.deviceName.replace(/\s+/g, ''))
    var doc = title[0].querySelector(".text");

    doc.textContent = newPlayback.playerInfo.infoText.title;

    var arr = document.getElementsByClassName("SPOTIFY_ARTIST"+ this.config.deviceName.replace(/\s+/g, ''));
    var artist = arr[0].querySelector(".text");
    var artists = newPlayback.playerInfo.infoText.subText1
    var artistName = newPlayback.playerInfo.infoText.subText1
    for (var x = 0; x < artists.length; x++) {
      if (!artistName) {
        artistName = artists[x].name
      } else {
        artistName += ", " + artists[x].name
      }
    }
    artist.textContent = artistName
    this.sendNotification("SPOTIFY_UPDATE_SONG_INFO", newPlayback)
  },

  clickPlay: function () {
    if (this.currentPlayback.is_playing) {
      this.sendSocketNotification("PAUSE")
    } else {
      this.sendSocketNotification("PLAY")
    }
  },

  clickRepeat: function () {
    var c = this.currentPlayback.repeat_state
    var n = ""
    if (c === "off") n = "track"
    if (c === "track") n = "context"
    if (c === "context") n = "off"
    this.sendSocketNotification("REPEAT", n)
  },

  clickShuffle: function () {
    this.sendSocketNotification("SHUFFLE", !this.currentPlayback.shuffle_state)
  },

  clickBackward: function () {
    if (this.currentPlayback.progress_ms < 3000) {
      this.sendSocketNotification("PREVIOUS")
    } else {
      this.sendSocketNotification("REPLAY")
    }
  },

  clickForward: function () {
    this.sendSocketNotification("NEXT")
  },

  getDom: function () {
    var m = document.createElement("div")
    m.id = "SPOTIFY"
    m.classList.add("SPOTIFY" + this.config.deviceName.replace(/\s+/g, ''));
    if (this.config.style !== "default") {
      m.classList.add(this.config.style)
    }
    if (this.config.control !== "default") {
      m.classList.add(this.config.control)
    }
    m.classList.add("noPlayback")
    
    var back = document.createElement("div")
    back.id = "SPOTIFY_BACKGROUND"
    back.classList.add("SPOTIFY_BACKGROUND" + this.config.deviceName.replace(/\s+/g, ''));
    m.appendChild(back)

    var fore = document.createElement("div")
    fore.id = "SPOTIFY_FOREGROUND"
    fore.classList.add("SPOTIFY_FOREGROUND" + this.config.deviceName.replace(/\s+/g, ''));

    var cover = document.createElement("div")
    cover.id = "SPOTIFY_COVER"
    cover.classList.add("SPOTIFY_COVER" + this.config.deviceName.replace(/\s+/g, ''));

    var cover_img = document.createElement("img")
    cover_img.id = "SPOTIFY_COVER_IMAGE"
    cover_img.classList.add("SPOTIFY_COVER_IMAGE" + this.config.deviceName.replace(/\s+/g, ''));
    cover_img.src = "./modules/MMM-AmazonMusic/resources/imgs/amazon_music.png"
    cover.appendChild(cover_img)
    fore.appendChild(cover)
    
    var misc = document.createElement("div")
    misc.id = "SPOTIFY_MISC"
    misc.classList.add("SPOTIFY_MISC" + this.config.deviceName.replace(/\s+/g, ''));

    var info = document.createElement("div")
    info.id = "SPOTIFY_INFO"
    info.classList.add("SPOTIFY_INFO" + this.config.deviceName.replace(/\s+/g, ''));

    var title = document.createElement("div")
    title.id = "SPOTIFY_TITLE"
    title.classList.add("SPOTIFY_TITLE" + this.config.deviceName.replace(/\s+/g, ''));

    var ti = document.createElement("span")
    ti.className = "iconify"
    ti.dataset.icon = "mdi:music"
    ti.dataset.inline = "false"
    title.appendChild(ti)
    var tt = document.createElement("span")
    tt.className = "text"
    tt.textContent = ""
    title.appendChild(tt)
    var artist = document.createElement("div")
    artist.id = "SPOTIFY_ARTIST"
    artist.classList.add("SPOTIFY_ARTIST" + this.config.deviceName.replace(/\s+/g, ''));

    var ai = document.createElement("span")
    ai.className = "iconify"
    ai.dataset.icon = "ic-baseline-person"
    ai.dataset.inline = "false"
    artist.appendChild(ai)
    var at = document.createElement("span")
    at.className = "text"
    at.textContent = ""
    artist.appendChild(at)
    var device = document.createElement("div")
    device.id = "SPOTIFY_DEVICE"
    device.classList.add("SPOTIFY_DEVICE" + this.config.deviceName.replace(/\s+/g, ''));

    var di = document.createElement("span")
    di.className = "iconify"
    di.dataset.icon = "ic-baseline-devices"
    di.dataset.inline = "false"
    device.appendChild(di)
    var dt = document.createElement("span")
    dt.className = "text"
    dt.textContent = ""
    device.appendChild(dt)

    var progress = document.createElement("div")
    progress.id = "SPOTIFY_PROGRESS"
    progress.classList.add("SPOTIFY_PROGRESS" + this.config.deviceName.replace(/\s+/g, ''));

    var currentTime = document.createElement("div")
    currentTime.id = "SPOTIFY_PROGRESS_CURRENT"
    currentTime.classList.add("SPOTIFY_PROGRESS_CURRENT" + this.config.deviceName.replace(/\s+/g, ''));
    currentTime.innerHTML = "--:--"

    var songTime = document.createElement("div")
    songTime.id = "SPOTIFY_PROGRESS_END"
    songTime.classList.add("SPOTIFY_PROGRESS_END" + this.config.deviceName.replace(/\s+/g, ''));

    songTime.innerHTML = "--:--"
    var time = document.createElement("div")
    time.id = "SPOTIFY_PROGRESS_TIME"
    time.classList.add("SPOTIFY_PROGRESS_TIME" + this.config.deviceName.replace(/\s+/g, ''));

    time.appendChild(currentTime)
    time.appendChild(songTime)
    progress.appendChild(time)
    var bar = document.createElement("div")
    bar.id = "SPOTIFY_PROGRESS_BAR"
    bar.classList.add("SPOTIFY_PROGRESS_BAR" + this.config.deviceName.replace(/\s+/g, ''));

    var barNow = document.createElement("div")
    barNow.id = "SPOTIFY_PROGRESS_BAR_NOW"
    barNow.classList.add("SPOTIFY_PROGRESS_BAR_NOW" + this.config.deviceName.replace(/\s+/g, ''));

    bar.appendChild(barNow)
    progress.appendChild(bar)
    var control = document.createElement("div")
    control.id = "SPOTIFY_CONTROL"
    control.classList.add("SPOTIFY_CONTROL" + this.config.deviceName.replace(/\s+/g, ''));

    var shuffle = document.createElement("div")
    shuffle.id = "SPOTIFY_CONTROL_SHUFFLE"
    shuffle.classList.add("SPOTIFY_CONTROL_SHUFFLE" + this.config.deviceName.replace(/\s+/g, ''));

    shuffle.addEventListener("click", () => { this.clickShuffle() })
    shuffle.className = "off"
    var si = document.createElement("span")
    si.className = "iconify"
    si.dataset.icon = "mdi:shuffle"
    si.dataset.inline = "false"
    shuffle.appendChild(si)
    var repeat = document.createElement("div")
    repeat.id = "SPOTIFY_CONTROL_REPEAT"
    repeat.classList.add("SPOTIFY_CONTROL_REPEAT" + this.config.deviceName.replace(/\s+/g, ''));

    repeat.addEventListener("click", () => { this.clickRepeat() })
    var ri = document.createElement("span")
    ri.className = "iconify"
    ri.dataset.inline = "false"
    repeat.className = "off"
    ri.dataset.icon = "mdi:repeat-off"
    repeat.appendChild(ri)
    var backward = document.createElement("div")
    backward.id = "SPOTIFY_CONTROL_BACKWARD"
    backward.classList.add("SPOTIFY_CONTROL_BACKWARD" + this.config.deviceName.replace(/\s+/g, ''));

    backward.addEventListener("click", () => { this.clickBackward() })
    backward.innerHTML = `<span class="iconify" data-icon="mdi:skip-previous" data-inline="false"></span>`
    var forward = document.createElement("div")
    forward.id = "SPOTIFY_CONTROL_FORWARD"
    forward.classList.add("SPOTIFY_CONTROL_FORWARD" + this.config.deviceName.replace(/\s+/g, ''));

    forward.innerHTML = `<span class="iconify" data-icon="mdi:skip-next" data-inline="false"></span>`
    forward.addEventListener("click", () => { this.clickForward() })
    var play = document.createElement("div")
    play.id = "SPOTIFY_CONTROL_PLAY"
    play.classList.add("SPOTIFY_CONTROL_PLAY" + this.config.deviceName.replace(/\s+/g, ''));

    play.addEventListener("click", () => { this.clickPlay() })
    var pi = document.createElement("span")
    pi.className = "iconify"
    pi.dataset.inline = "false"
    //pi.dataset.icon = (this.currentPlayback.is_playing) ? "mdi:play-circle-outline" : "mdi:pause-circle-outline"
    pi.dataset.icon = "mdi:play-circle-outline"
    play.appendChild(pi)

    info.appendChild(title)
    info.appendChild(artist)
    info.appendChild(device)
    misc.appendChild(info)
    misc.appendChild(progress)
    control.appendChild(shuffle)
    control.appendChild(backward)
    control.appendChild(play)
    control.appendChild(forward)
    control.appendChild(repeat)
    misc.appendChild(control)
    fore.appendChild(misc)

    m.appendChild(fore)
    return m
  },
})
