/**
 * Created by sss on 2015-11-09.
 */

"use strict";

let http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    url = require('url'),
    events = require('events'),
    ytmp3 = require('youtube-mp3-downloader'),
    ytdl = require('ytdl-core');

class Video {
    constructor(videoId) {
        this.id = videoId;
        this.size = 0;
        this.isDownloaded = false;
        this.onDownloadCallbacks = [];
        this.yt2mp3 = new ytmp3({
            "ffmpegPath": __dirname + "/ffmpeg/bin/" + (os.platform() == 'win32' ? "ffmpeg.exe" : "ffmpeg"),             // Where is the FFmpeg binary located?
            "outputPath": __dirname + "/mp3",                               // Where should the downloaded and encoded files be stored?
            "youtubeVideoQuality": "highest",                               // What video quality should be used?
            "queueParallelism": 4,                                         // How many parallel downloads/encodes should be started?
            "progressTimeout": 4000                                         // How long should be the interval of the progress reports
        });
    };

    getInfo = (callback) => {
        var requestUrl = ytApiUrl + "/videos?part=snippet"
            + "&id=" + this.id
            + "&fields=items(snippet(title))"
            + "&key=" + ytApiKey;
        https.get(requestUrl, function (searchResponse) {
            var data = "";
            searchResponse.on('data', function (dataChunk) {
                data += dataChunk;
            });
            searchResponse.on('end', function () {
                var videoInfo = JSON.parse(data);
                process.nextTick(function () {
                    callback(null, {
                        title: videoInfo.items[0].snippet.title
                    });
                });
            });
        }).on('error', function (err) {
            process.nextTick(function () {
                callback(err, null);
            });
        });
    };

    download = () => {
        this.getInfo((err, videoInfo) => {
            if (err) {
                console.log(err);
                return;
            }
            this.yt2mp3.download(this.id, this.id + "/" + videoInfo.title + ".mp3");
            console.log('Downloading ' + this.id + '...');
            this.yt2mp3.on('progress', function (progress) {
                console.log('Progress: ' + progress.progress.percentage + '%');
            });
            this.yt2mp3.on('error', (err) => {
                console.log(err);
                this.onDownloadCallbacks.forEach(function (callback) {
                    process.nextTick(() => {
                        callback(err, null);
                    });
                });
            });
            this.yt2mp3.on('finished', (data) => {
                this.isDownloaded = true;
                fs.stat(data.file, function (err, stats) {
                    this.size = stats.size;
                });
                this.onDownloadCallbacks.forEach((callback) => {
                    process.nextTick(() => {
                        callback(null, data);
                    });
                });
            });
        });
    }
}

module.exports = Video;