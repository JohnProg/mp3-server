'use strict';

module.exports = function(config) {
    const https = require('https'),
        events = require('events'),
        eventEmitter = new events.EventEmitter(),
        ytdl = require('ytdl-core'),
        ffmpeg = require('fluent-ffmpeg'),
        async = require('async');

    class Video {
        constructor(videoId) {
            this.id = videoId;
            this.size = 0;
            this.info = null;
        }

        getInfo(cb) {
            async.waterfall([
                (callback) => {
                    var requestUrl = config.ytApiUrl + "/videos?part=snippet"
                        + "&id=" + this.id
                        + "&fields=items(snippet(title))"
                        + "&key=" + config.ytApiKey;
                    https.get(requestUrl, function (res) {
                        callback(null, res);
                    }).on('error', function (err) {
                        callback(err);
                    });
                },
                (res, callback) => {
                    var data = "";
                    res.on('data', function (dataChunk) {
                        data += dataChunk;
                    });
                    res.on('end', function () {
                        this.info = JSON.parse(data);
                        try {
                            var title = this.info.items[0].snippet.title;
                            cb(null, {
                                title: title
                            });
                        }
                        catch(err) {
                            callback(new Error('Invalid YouTube video ID.'));
                        }
                    });
                    res.on('clientError', callback);
                }
            ], function(err) {
                cb(err, null);
            });
        }

        download(response, callback) {
            this.getInfo((err, videoInfo) => {
                if (err) {
                    eventEmitter.emit('error', err);
                    eventEmitter.removeAllListeners('error');
                    return;
                }
                var readStream = ytdl("http://www.youtube.com/watch?v=" + this.id);
                var command = ffmpeg(readStream)
                    .format("mp3")
                    .on("start", function () {
                        console.log("Started processing video.");
                    })
                    .on("end", function () {
                        console.log("Finished processing video.");
                    })
                    .on("error", function(err) {
                        eventEmitter.emit('error', err);
                        eventEmitter.removeAllListeners('error');
                    })
                    .pipe(response)
            });
            return eventEmitter;
        }
    }

    return Video;
}
