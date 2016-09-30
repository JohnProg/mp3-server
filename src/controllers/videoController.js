'use strict';

module.exports = function(config) {
    const https = require('https'),
        async = require('async'),
        chalk = require('chalk'),
        Video = require('../video')(config);

    const search = function (request, response, next) {
        //if (!request.query.q) {
        //    throw new Error('No query specified');
        //}
        //else {
        async.waterfall([
            function(callback) {
                var q = request.query.q;//.replace(' ', '%20');
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
                    searchResponse.on('clientError', callback);
                }).on('error', callback);
            }
        ], function(err) {
            //throw err;
            next(err);
        });
        //}
    };

    const download = function (request, response,next) {
        // No video id in query.
        //if (!request.query.v) {
        //    throw new Error('No video id specified');
        //}
        //else {
        var videoId = request.query.v;
        var video = new Video(videoId);
        async.waterfall([
            function (callback) {
                video.getInfo(callback);
            },
            function (videoInfo, callback) {
                response.set('Content-Type', 'audio/mpeg');
                response.set('Content-Disposition', 'attachment; filename="' + videoInfo.title + '.mp3"');
                response.set('Access-Control-Allow-Origin', "*");
                response.status(200);
                video.download(response).on('error', callback);
            }
        ], function (err) {
            next(err);
            //console.error(chalk.red(err.message));
        });
        //}
    };

    var videoController = {};
    videoController.search = search;
    videoController.download = download;
    return videoController;
}