'use strict';

const os = require('os');

var config = {};
config.ytApiKey = "AIzaSyBhtvRxAa5jePf6x0BRQCK-BBZ5-mhGwss";
config.ytApiUrl = "https://www.googleapis.com/youtube/v3";
config.serverIp = "0.0.0.0";
config.httpPort = process.env.PORT || 8080;
config.autoPingInterval = 15 * 60 * 1000;
config.ffmpegPath = __dirname + "/ffmpeg/bin/" + (os.platform() == 'win32' ? "ffmpeg.exe" : "ffmpeg");

module.exports = config;