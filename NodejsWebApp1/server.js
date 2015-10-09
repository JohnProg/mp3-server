'use strict';
var http = require('http');
let fs = require('fs'),
url = require('url'),
events = require('events'),
ytdl = require('ytdl-core'),
YoutubeMp3Downloader = require('youtube-mp3-downloader');

//Configure YoutubeMp3Downloader.
var yt2mp3 = new YoutubeMp3Downloader({
    "ffmpegPath": __dirname + "/ffmpeg/bin/ffmpeg.exe",             // Where is the FFmpeg binary located? 
    "outputPath": __dirname + "/mp3",                               // Where should the downloaded and encoded files be stored? 
    "youtubeVideoQuality": "highest",                               // What video quality should be used? 
    "queueParallelism": 2,                                          // How many parallel downloads/encodes should be started? 
    "progressTimeout": 4000                                         // How long should be the interval of the progress reports 
});

http.createServer(function (request, response) {
    var request = url.parse(request.url, true);
    var action = request.pathname;

    if (action == '/convert') {
		// TODO: Only video conversion, reposing with info JSON instead of mp3.
        //response.writeHead(200, { 'Content-Type': 'application/json' });
    }
    else if (action == '/download') {
       download(request, response);
    }
    else {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('404');
    }
}).listen(8080, '127.0.0.1');


// Send mp3 in response.
function respondMp3(request, response, fileDir, fileName, fileSize) {
    var filePath = fileDir + "/" + fileName;
    console.log('Download\nName: "' + fileName + '"\nSize: ' + fileSize + '\n');
    response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': fileSize, 'Content-Disposition': 'attachment; filename="' + fileName + '"' });
    var readStream = fs.createReadStream(filePath);
    readStream.pipe(response);
    readStream.on("close", function () {
        fs.unlink(fileDir + "/" + fileName, function (err) {
            if (err) {
                console.log(err);
            }
            else
                fs.rmdir(fileDir, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    else 
                        console.log("Removed '" + fileDir + "'");
                });
        });
    });
}

// Download video by given id.
function downloadVideo(request, response, videoId) {
    // Get video info.
    // "http://www.youtube.com/watch?v=" +
    ytdl.getInfo("http://www.youtube.com/watch?v=" + videoId, function (err, info) {
        // IdneKLhsWOQ - test id.
        fs.mkdir(__dirname + "/mp3/" + videoId, function (err) {
            if (err) {

            }
            else {
                yt2mp3.download(videoId, videoId + "/" + info.title + ".mp3");
                console.log('Downloading ' + videoId + '...');
                yt2mp3.on('progress', function (progress) {
                    console.log('Progress: ' + progress.progress.percentage + '%');
                });
                yt2mp3.on('error', function (err) {
                    console.log(err);
                });
                yt2mp3.on('finished', function (data) {
                    console.log(data);
                    download(request, response);
                });
            }
        });
    });
}

// Full procedure for downloading video.
function download(request, response) {
    // Get video id from query.
    // No video id in query.
    if (!request.query.v) {
        response.writeHead(403, { 'Content-Type': 'text/plain' });
        response.end('Niepodano numeru id');
    }
    else {
        var videoId = request.query.v;
        var fileDir = __dirname + "/mp3/" + videoId;
        // Get fileName.
        fs.readdir(fileDir, function (error, files) {
            if (error) {
                // No specified dir (video wasn't downloaded yet).
                downloadVideo(request, response, videoId);
            }
            else 
            {
                // Get fileStats.
                var fileName = files[0];
                var filePath = fileDir + "/" + fileName;
                fs.stat(filePath, function(error, fileStats) {
                    if (error) {
                        downloadVideo(request, response, videoId);
                    }
                    else {
                        var fileSize = fileStats.size;
                        respondMp3(request, response, fileDir, fileName, fileSize);
                    }
                });
            }
        });
    }
}