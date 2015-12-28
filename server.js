'use strict';

const express = require('express'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    events = require('events'),
    async = require('async'),
    ytdl = require('ytdl-core'),
    ffmpeg = require('fluent-ffmpeg');

const config = require('./src/config'),
    utils = require('./src/utils'),
    router = require('./src/router')(config),
    errorHandler = require('./src/errorHandler');

ffmpeg.setFfmpegPath(config.ffmpegPath);


// Auto ping app.
setInterval(function () {
    https.get("https://lichwa-mp3.herokuapp.com/status", function (result) {
        var resultBody = '';
        result.on('data', function(dataChunk) {
            resultBody += dataChunk;
        });
        result.on('end', function() {
            console.log(resultBody);
        });
    }).on('error', function(err) {
        console.log("Auto pinger error: %s", err);
    });
}, config.autoPingInterval);


var app = express();
app.get('/status', router.statusController.getStatus);
app.get('/search', router.videoController.search);
app.get('/download', router.videoController.download);
app.use(errorHandler);

http.createServer(app).listen(config.httpPort);
console.log("Server is running.");
