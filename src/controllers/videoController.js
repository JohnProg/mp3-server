'use strict';

module.exports = function(config) {
    const https = require('https'),
        Video = require('../video')(config);

    const search = function (request, response) {
        if (!request.query.q) {
            throw new Error('No query specified');
        }
        else {
            var q = request.query.q.replace(' ', '%20');
            var requestUrl = config.ytApiUrl + "/search?part=snippet"
                + "&q=" + q
                + "&type=video"
                + "&maxResults=3"
                + "&order=relevance"
                + "&key=" + config.ytApiKey;
            https.get(requestUrl, function (searchResponse) {
                var data = "";
                searchResponse.on('data', function (dataChunk) {
                    data += dataChunk;
                });
                searchResponse.on('end', function () {
                    response.set('Content-Type', 'application/json');
                    response.set('Access-Control-Allow-Origin', "*");
                    response.status(200).send(JSON.stringify(data));
                });
            }).on('error', function (err) {
                console.log("Youtube search query error: " + err);
            });
        }
    };

    const download = function (request, response) {
        // No video id in query.
        if (!request.query.v) {
            throw new Error('No video id specified');
        }
        else {
            var videoId = request.query.v;
            var video = new Video(videoId);
            video.getInfo(function (err, videoInfo) {
                if (err) {
                    console.log(err);
                    return;
                }
                response.set('Content-Type', 'audio/mpeg');
                response.set('Content-Disposition', 'attachment; filename="' + videoInfo.title + '.mp3"');
                response.set('Access-Control-Allow-Origin', "*");
                response.status(200);
                video.download(response)
                    .on('error', function(err) {
                        console.log(err);
                        response.end();
                    });
            });
        }
    };

    var videoController = {};
    videoController.search = search;
    videoController.download = download;
    return videoController;
}