'use strict';
var http = require('http');
var https = require('https');
let fs = require('fs'),
url = require('url'),
events = require('events'),
ytdl = require('ytdl-core');
var YoutubeMp3Downloader = require('youtube-mp3-downloader');

//Configure YoutubeMp3Downloader.
var yt2mp3 = new YoutubeMp3Downloader({
    "ffmpegPath": __dirname + "/ffmpeg/bin/ffmpeg.exe",             // Where is the FFmpeg binary located? 
    "outputPath": __dirname + "/mp3",                               // Where should the downloaded and encoded files be stored? 
    "youtubeVideoQuality": "highest",                               // What video quality should be used? 
    "queueParallelism": 4,                                         // How many parallel downloads/encodes should be started? 
    "progressTimeout": 4000                                         // How long should be the interval of the progress reports 
});

const ytApiKey = "AIzaSyBhtvRxAa5jePf6x0BRQCK-BBZ5-mhGwss";
const ytApiUrl = "https://www.googleapis.com/youtube/v3";
const serverIp = "127.0.0.1";
const serverPort = 8080;
console.log("Starting server...");


var Video = function (videoId) {
    this.id = videoId;
    this.isDownloaded = false;
    this.onDownloadCallbacks = [];
};
Video.prototype.getInfo = function (callback) {
    var video = this;
    var requestUrl = ytApiUrl + "/videos?part=snippet" 
                     + "&id=" + video.id 
                     + "&fields=items(snippet(title))" 
                     + "&key=" + ytApiKey;
    https.get(requestUrl, function (searchResponse) {
        var data = "";
        searchResponse.on('data', function (dataChunk) {
            data += dataChunk;
        });
        searchResponse.on('end', function () {
            var videoInfo = JSON.parse(data);
            callback(null, {
                title: videoInfo.items[0].snippet.title
            });
        });
    }).on('error', function (err) {
        callback(err, null);
    });
};
Video.prototype.download = function () {
    var video = this;
    this.getInfo(function (err, videoInfo) {
        if (err) {
            console.log(err);
        }
        else {
            yt2mp3.download(video.id, video.id + "/" + videoInfo.title + ".mp3");
            console.log('Downloading ' + video.id + '...');
            yt2mp3.on('progress', function (progress) {
                console.log('Progress: ' + progress.progress.percentage + '%');
            });
            yt2mp3.on('error', function (err) {
                console.log(err);
                for (var i = 0; i < video.onDownloadCallbacks.length; i++) {
                    this.onDownloadCallbacks[i](err, null);
                }
            });
            yt2mp3.on('finished', function (data) {
                video.isDownloaded = true;
                for (var i = 0; i < video.onDownloadCallbacks.length; i++) {
                    video.onDownloadCallbacks[i](null, data);
                }
            });
        }
    });
};

var videos = [];

http.createServer(function (request, response) {
    console.log(request.url);
    var request = url.parse(request.url, true);
    var action = request.pathname;

    if (action == '/search') {
        (function () {
            if (!request.query.q) {
                response.writeHead(403, { 'Content-Type': 'text/plain' });
                response.end('Niepodano ');
            }
            else {
                var q = request.query.q.replace(' ', '%20');
                var requestUrl = ytApiUrl + "/search?part=snippet" 
                     + "&q=" + q 
                     + "&type=video" 
                     + "&maxResults=3" 
                     + "&order=relevance" 
                     + "&key=" + ytApiKey
                https.get(requestUrl, function (searchResponse) {
                    var data = "";
                    searchResponse.on('data', function (dataChunk) {
                        data += dataChunk;
                    });
                    searchResponse.on('end', function () {
                        response.writeHead(200, { 'Content-Type': 'application/json' });
                        response.end(JSON.stringify(data));
                    });
                }).on('error', function (err) {
                    console.log(err);  
                });
            }
        })();
    }
    else if (action == '/convert') {
        (function () {
            // No video id in query.
            if (!request.query.v) {
                response.writeHead(403, { 'Content-Type': 'text/plain' });
                response.end('Niepodano numeru id');
            }
            else {
                var videoId = request.query.v;
                var fileDir = __dirname + "/mp3/" + videoId;
                // Get fileName.
                fs.readdir(fileDir, function (err, files) {
                    // No specified dir with video (video wasn't downloaded yet).
                    if (err) {
                        // Create dir.
                        fs.mkdir(__dirname + "/mp3/" + videoId, function (err) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                // Download video.
                                var video = new Video(videoId);
                                videos.push(video);
                                video.download(videoId);
                                video.onDownloadCallbacks.push(function (err, data) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    else {
                                        fs.readdir(fileDir, function (err, files) {
                                            // Get fileStats.
                                            if (err)
                                                console.log(err);                                                                                              
                                            var fileName = files[0];
                                            var filePath = fileDir + "/" + fileName;
                                            fs.stat(filePath, function (err, fileStats) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                else {
                                                    var fileSize = fileStats.size;
                                                    response.writeHead(200, { 'Content-Type': 'application/json' });
                                                    var mp3Info = {
                                                        fileName: fileName,
                                                        fileSize: fileSize,
                                                        downloadLink: '/download?v=' + videoId
                                                    };
                                                    response.end(JSON.stringify(mp3Info));
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        // Video already exists.
                        var video;
                        for (var i = 0; i < videos.length; i++) {
                            if (videos[i].id === videoId) {
                                video = videos[i];
                                break;
                            }
                        }
                        // FInished downloading.
                        if (video.isDownloaded == true) {
                            var fileName = files[0];
                            var filePath = fileDir + "/" + fileName;
                            fs.stat(filePath, function (err, fileStats) {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    var fileSize = fileStats.size;
                                    response.writeHead(200, { 'Content-Type': 'application/json' });
                                    var mp3Info = {
                                        fileName: fileName,
                                        fileSize: fileSize,
                                        downloadLink: '/download?v=' + videoId
                                    };
                                    response.end(JSON.stringify(mp3Info));
                                }
                            });
                        }
                        // Still downloading, add onDownload callback.
                        else {
                            if (typeof video.onDownloadCallbacks == 'undefined')
                                video.onDownloadCallbacks = [];
                            video.onDownloadCallbacks.push(function (err, data) {
                                console.log(files[0]);
                                var fileName = files[0];
                                var filePath = fileDir + "/" + fileName;
                                fs.stat(filePath, function (err, fileStats) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    else {
                                        var fileSize = fileStats.size;
                                        response.writeHead(200, { 'Content-Type': 'application/json' });
                                        var mp3Info = {
                                            fileName: fileName,
                                            fileSize: fileSize,
                                            downloadLink: '/download?v=' + videoId
                                        };
                                        response.end(JSON.stringify(mp3Info));
                                    }
                                });
                            });
                        }
                    }
                });
            }
        })();
    }
    else if (action == '/download') {
        (function () { 
            // No video id in query.
            if (!request.query.v) {
                response.writeHead(403, { 'Content-Type': 'text/plain' });
                response.end('Niepodano numeru id');
            }
            else {
                var videoId = request.query.v;
                var fileDir = __dirname + "/mp3/" + videoId;
                // Get fileName.
                fs.readdir(fileDir, function (err, files) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        // Get fileStats.
                        var fileName = files[0];
                        var filePath = fileDir + "/" + fileName;
                        fs.stat(filePath, function (error, fileStats) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                var fileSize = fileStats.size;
                                var filePath = fileDir + "/" + fileName;
                                response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': fileSize, 'Content-Disposition': 'attachment; filename="' + fileName + '"' });
                                var readStream = fs.createReadStream(filePath);
                                readStream.pipe(response);
                                readStream.on("close", function () {

                                });
                            }
                        });
                    }
                });
            }
        })();
    }
    else {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('404');
    }
}).listen(serverPort, serverIp);
console.log("Server is running on " + serverIp + ":" + serverPort);


// Remove dir recursively.
function removeDir(fileDir) {
    
    fs.readdir(fileDir, function (err, files)
    {
        if (err) {
            console.log(err);
        }
        else {
            for (var i = 0; i < files.length; i++) {
                fs.unlink(fileDir + "/" + files[i], function (err) {
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
            }
        }
    });
}