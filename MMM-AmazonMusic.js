//
// Module : MMM-Amazon
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

  // for gets scripts if exist
  getScripts: function () {
    r = []
    if (this.config.iconify) {
      r.push(this.config.iconify)
    }
    return r
  },

  // get styles if exist
  getStyles: function () {
    return ["MMM-AmazonMusic.css"]
  },

  // launch currentPlayback start
  start: function () {
    this.currentPlayback = null
  },

  // NOTIF RECEVED MAIN MODULES
  notificationReceived: function (noti, payload, sender) {
    // First notif after init all modules from main
    if (noti === "DOM_OBJECTS_CREATED") {
      this.sendSocketNotification("INIT", this.config)
    }
    // all other notif but never use for moment its for push dom click
    switch (noti) {
      case "AMAZONMUSIC_SEARCH":
        this.sendSocketNotification("SEARCH_AND_PLAY", pl)
        break
      case "AMAZONMUSIC_PLAY":
        this.sendSocketNotification("PLAY", payload)
        break
      case "AMAZONMUSIC_PAUSE":
        this.sendSocketNotification("PAUSE")
        break
      case "AMAZONMUSIC_NEXT":
        this.sendSocketNotification("NEXT")
        break
      case "AMAZONMUSIC_PREVIOUS":
        this.sendSocketNotification("PREVIOUS")
        break
      case "AMAZONMUSIC_VOLUME":
        this.sendSocketNotification("VOLUME", payload)
        break
      case "AMAZONMUSIC_TRANSFER":
        this.sendSocketNotification("TRANSFER", payload)
        break
      case "AMAZONMUSIC_SHUFFLE":
        this.clickShuffle()
        break
      case "AMAZONMUSIC_REPEAT":
        this.clickRepeat()
        break
      case "AMAZONMUSIC_TOGGLE":
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
      console.log(this.config.deviceName);
      if (this.config.deviceName === element.name && element.online) {
        if (element.capabilities.includes("AUDIO_PLAYER")) {
          this.sendSocketNotification("AMAZON_CURRENT_PLAYBACK_" + this.config.deviceName, element.serial)
          break;
        }
      }
    }
  },

  // Socket NOTI from Node Helper
  socketNotificationReceived: function (noti, payload) {
    switch (noti) {
      // never use
      case "INITIALIZED":
        break
      // get current device and parse response serveur
      case "CURRENT_DEVICES_" + this.config.deviceName:
        this.checkDevicesOnline(payload);
        break;
      // play the current 
      case "CURRENT_PLAYBACK_TRUE_" + this.config.deviceName:
        let playerInfo = JSON.parse(payload);
        this.updateCurrentPlayback(playerInfo);
        break;
      case "CURRENT_PLAYBACK_FAIL_" + this.config.deviceName:
        console.log("NOT PLAYBACK")
        this.updateNoPlayback()
    }
    if (noti.search("DONE_") > -1) {
      this.sendNotification(noti)
    }
  },

  updateNoPlayback: function () {
    var dom = document.getElementById("AMAZONMUSIC" + this.config.deviceName.replace(/\s+/g, ''))
    dom.classList.add("inactive")
  },

  updateCurrentPlayback: function (current) {
    if (!current) return
    if (!this.currentPlayback) {
      console.log(current);
      this.updateSongInfo(current);
      this.updatePlaying(current);
      this.updateDevice();
      // this.updateShuffle(current)
      // this.updateRepeat(current)
      this.updateProgress(current)
    } else {
      if (this.currentPlayback.playerInfo.infoText.title !== current.playerInfo.infoText.title) {
        this.updateSongInfo(current)
        this.updatePlaying(current)
      }
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
      if (this.currentPlayback.playerInfo.progress.mediaProgress !== current.playerInfo.progress.mediaProgress) {
        this.updateProgress(current)
      }
    }

    this.currentPlayback = current
  },

  // Progress
  updateProgress: function (
    current,
    end = document.getElementById("AMAZONMUSIC_PROGRESS_END" + this.config.deviceName.replace(/\s+/g, '')),
    curbar = document.getElementById("AMAZONMUSIC_PROGRESS_CURRENT" + this.config.deviceName.replace(/\s+/g, '')),
    now = document.getElementById("AMAZONMUSIC_PROGRESS_BAR_NOW" + this.config.deviceName.replace(/\s+/g, ''))
  ) {
    var msToTime = (duration) => {
      var ret = ""
      var d = Number(duration)
      var seconds = Math.floor(d % 3600 % 60)
        , minutes = Math.floor(d % 3600 / 60)
        , hours = Math.floor(d / 3600)
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

  // Songs infos
  updateSongInfo: function (newPlayback) {
    if (!newPlayback) return
    if (!newPlayback.playerInfo) return
    var sDom = document.getElementById("AMAZONMUSIC" + this.config.deviceName.replace(/\s+/g, ''));
    console.log(sDom)
    sDom.classList.remove("noPlayback")

    var cover_img = document.getElementById("AMAZONMUSIC_COVER_IMAGE" + this.config.deviceName.replace(/\s+/g, ''))
    cover_img.src = newPlayback.playerInfo.mainArt.url;

    var back = document.getElementById("AMAZONMUSIC_BACKGROUND" + this.config.deviceName.replace(/\s+/g, ''))
    back.style.backgroundImage = `url(${newPlayback.playerInfo.mainArt.url})`
    var title = document.getElementById("AMAZONMUSIC_TITLE" + this.config.deviceName.replace(/\s+/g, ''))
    var doc = title.querySelector(".text");

    doc.textContent = newPlayback.playerInfo.infoText.title;

    var arr = document.getElementById("AMAZONMUSIC_ARTIST" + this.config.deviceName.replace(/\s+/g, ''));
    var artist = arr.querySelector(".text");
    var artistName = newPlayback.playerInfo.infoText.subText1
    var album = newPlayback.playerInfo.infoText.subText2

    // for (var x = 0; x < artists.length; x++) {
    //   if (!artistName) {
    //     artistName = artists[x].name
    //   } else {
    artistName += ", " + album
    //   }
    // }
    artist.textContent = artistName
    this.sendNotification("AMAZONMUSIC_UPDATE_SONG_INFO", newPlayback)
  },

  // update device
  updateDevice: function () {
    var device = document.getElementById("AMAZONMUSIC_DEVICE" + this.config.deviceName.replace(/\s+/g, ''))
    var content = device.querySelector(".text");
    content.textContent = this.config.deviceName;
  },

  //**********************  CONTROLS UPDATE **********************//
  updateShuffle: function (newPlayback) {
    var shuffle = document.getElementById("AMAZONMUSIC_CONTROL_SHUFFLE")
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
    var repeat = document.getElementById("AMAZONMUSIC_CONTROL_REPEAT")
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

  // only for button actif
  updatePlaying: function (newPlayback) {
    var s = document.getElementById("AMAZONMUSIC" + this.config.deviceName.replace(/\s+/g, ''))
    var p = document.getElementById("AMAZONMUSIC_CONTROL_PLAY" + this.config.deviceName.replace(/\s+/g, ''))
    var pi = document.createElement("span")
    pi.className = "iconify"
    pi.dataset.inline = "false"
    if (newPlayback.playerInfo.state === "PLAYING") {
      s.classList.add("playing")
      s.classList.remove("pausing")
      s.classList.remove("inactive")
      pi.dataset.icon = "mdi:pause-circle-outline"
      p.className = "playing"
    } else {
      s.classList.add("pausing")
      s.classList.remove("playing")
      s.classList.remove("inactive")
      pi.dataset.icon = "mdi:play-circle-outline"
      p.className = "pausing"
    }
    p.innerHTML = ""
    p.appendChild(pi)
    this.sendNotification("AMAZON_UPDATE_PLAYING_" + this.config.deviceName, newPlayback.playerInfo.state)
  },

  /*****************   END ONLY CONTROL  *****************/

  /********************** CONTROLS BUTTON  *******************/

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


  /********************** DOM COMMIN  *******************/

  getDom: function () {
    var m = document.createElement("div")
    m.id = "AMAZONMUSIC" + this.config.deviceName.replace(/\s+/g, '');
    m.classList.add("AMAZONMUSIC");
    if (this.config.style !== "default") {
      m.classList.add(this.config.style)
    }
    if (this.config.control !== "default") {
      m.classList.add(this.config.control)
    }
    m.classList.add("noPlayback")

    var back = document.createElement("div")
    back.id = "AMAZONMUSIC_BACKGROUND" + this.config.deviceName.replace(/\s+/g, '');
    back.classList.add("AMAZONMUSIC_BACKGROUND");
    m.appendChild(back)

    var fore = document.createElement("div")
    fore.id = "AMAZONMUSIC_FOREGROUND" + this.config.deviceName.replace(/\s+/g, '')
    fore.classList.add("AMAZONMUSIC_FOREGROUND");

    var cover = document.createElement("div")
    cover.id = "AMAZONMUSIC_COVER" + this.config.deviceName.replace(/\s+/g, '');
    cover.classList.add("AMAZONMUSIC_COVER");

    var cover_img = document.createElement("img")
    cover_img.id = "AMAZONMUSIC_COVER_IMAGE" + this.config.deviceName.replace(/\s+/g, '');
    cover_img.classList.add("AMAZONMUSIC_COVER_IMAGE");
    cover_img.src = "./modules/MMM-AmazonMusic/resources/imgs/amazon_music.png"
    cover.appendChild(cover_img)
    fore.appendChild(cover)

    var misc = document.createElement("div")
    misc.id = "AMAZONMUSIC_MISC" + this.config.deviceName.replace(/\s+/g, '');
    misc.classList.add("AMAZONMUSIC_MISC");

    var info = document.createElement("div")
    info.id = "AMAZONMUSIC_INFO" + this.config.deviceName.replace(/\s+/g, '');
    info.classList.add("AMAZONMUSIC_INFO");

    var title = document.createElement("div")
    title.id = "AMAZONMUSIC_TITLE" + this.config.deviceName.replace(/\s+/g, '');
    title.classList.add("AMAZONMUSIC_TITLE");

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
    artist.id = "AMAZONMUSIC_ARTIST" + this.config.deviceName.replace(/\s+/g, '');
    artist.classList.add("AMAZONMUSIC_ARTIST");

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
    device.id = "AMAZONMUSIC_DEVICE" + this.config.deviceName.replace(/\s+/g, '');
    device.classList.add("AMAZONMUSIC_DEVICE");

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
    progress.id = "AMAZONMUSIC_PROGRESS" + this.config.deviceName.replace(/\s+/g, '');
    progress.classList.add("AMAZONMUSIC_PROGRESS");

    var currentTime = document.createElement("div")
    currentTime.id = "AMAZONMUSIC_PROGRESS_CURRENT" + this.config.deviceName.replace(/\s+/g, '');
    currentTime.classList.add("AMAZONMUSIC_PROGRESS_CURRENT");
    currentTime.innerHTML = "--:--"

    var songTime = document.createElement("div")
    songTime.id = "AMAZONMUSIC_PROGRESS_END" + this.config.deviceName.replace(/\s+/g, '');
    songTime.classList.add("AMAZONMUSIC_PROGRESS_END");

    songTime.innerHTML = "--:--"
    var time = document.createElement("div")
    time.id = "AMAZONMUSIC_PROGRESS_TIME" + this.config.deviceName.replace(/\s+/g, '');
    time.classList.add("AMAZONMUSIC_PROGRESS_TIME");

    time.appendChild(currentTime)
    time.appendChild(songTime)
    progress.appendChild(time)
    var bar = document.createElement("div")
    bar.id = "AMAZONMUSIC_PROGRESS_BAR" + this.config.deviceName.replace(/\s+/g, '');
    bar.classList.add("AMAZONMUSIC_PROGRESS_BAR");

    var barNow = document.createElement("div")
    barNow.id = "AMAZONMUSIC_PROGRESS_BAR_NOW" + this.config.deviceName.replace(/\s+/g, '');
    barNow.classList.add("AMAZONMUSIC_PROGRESS_BAR_NOW");

    bar.appendChild(barNow)
    progress.appendChild(bar)
    var control = document.createElement("div")
    control.id = "AMAZONMUSIC_CONTROL" + this.config.deviceName.replace(/\s+/g, '');
    control.classList.add("AMAZONMUSIC_CONTROL");

    var shuffle = document.createElement("div")
    shuffle.id = "AMAZONMUSIC_CONTROL_SHUFFLE" + this.config.deviceName.replace(/\s+/g, '');
    shuffle.classList.add("AMAZONMUSIC_CONTROL_SHUFFLE");

    shuffle.addEventListener("click", () => { this.clickShuffle() })
    shuffle.className = "off"
    var si = document.createElement("span")
    si.className = "iconify"
    si.dataset.icon = "mdi:shuffle"
    si.dataset.inline = "false"
    shuffle.appendChild(si)
    var repeat = document.createElement("div")
    repeat.id = "AMAZONMUSIC_CONTROL_REPEAT" + this.config.deviceName.replace(/\s+/g, '');
    repeat.classList.add("AMAZONMUSIC_CONTROL_REPEAT");

    repeat.addEventListener("click", () => { this.clickRepeat() })
    var ri = document.createElement("span")
    ri.className = "iconify"
    ri.dataset.inline = "false"
    repeat.className = "off"
    ri.dataset.icon = "mdi:repeat-off"
    repeat.appendChild(ri)
    var backward = document.createElement("div")
    backward.id = "AMAZONMUSIC_CONTROL_BACKWARD" + this.config.deviceName.replace(/\s+/g, '');
    backward.classList.add("AMAZONMUSIC_CONTROL_BACKWARD");

    backward.addEventListener("click", () => { this.clickBackward() })
    backward.innerHTML = `<span class="iconify" data-icon="mdi:skip-previous" data-inline="false"></span>`
    var forward = document.createElement("div")
    forward.id = "AMAZONMUSIC_CONTROL_FORWARD" + this.config.deviceName.replace(/\s+/g, '');
    forward.classList.add("AMAZONMUSIC_CONTROL_FORWARD");

    forward.innerHTML = `<span class="iconify" data-icon="mdi:skip-next" data-inline="false"></span>`
    forward.addEventListener("click", () => { this.clickForward() })
    var play = document.createElement("div")
    play.id = "AMAZONMUSIC_CONTROL_PLAY" + this.config.deviceName.replace(/\s+/g, '');
    play.classList.add("AMAZONMUSIC_CONTROL_PLAY");

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
