'use strict';

module.exports = function(config) {
    const https = require('https'),
        events = require('events'),
        eventEmitter = new events.EventEmitter(),
        ytdl = require('ytdl-core'),
        ffmpeg = require('fluent-ffmpeg');

    class Video {
        constructor(videoId) {
            this.id = videoId;
            this.size = 0;
            this.info = null;
        }

        getInfo(callback) {
            var requestUrl = config.ytApiUrl + "/videos?part=snippet"
                + "&id=" + this.id
                + "&fields=items(snippet(title))"
                + "&key=" + config.ytApiKey;
            https.get(requestUrl, function (searchResponse) {
                var data = "";
                searchResponse.on('data', function (dataChunk) {
                    data += dataChunk;
                });
                searchResponse.on('end', function () {
                    this.info = JSON.parse(data);

                    callback(null, {
                        title: this.info.items[0].snippet.title
                    });
                });
            }).on('error', function (err) {
                callback(err, null);
            });
        }

        download(response) {
            this.getInfo((err, videoInfo) => {
                if (err) {
                    console.log(err);
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
                    .pipe(response);
            });
            return eventEmitter;
        }
    }

    return Video;
}
