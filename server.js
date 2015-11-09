"use strict";

let express = require('express'),
http = require('http'),
https = require('https'),
os = require('os'),
fs = require('fs'),
path = require('path'),
url = require('url'),
events = require('events'),
async = require('async'),
YoutubeMp3Downloader = require('youtube-mp3-downloader'),
ytdl = require('ytdl-core');

const ytApiKey = "AIzaSyBhtvRxAa5jePf6x0BRQCK-BBZ5-mhGwss";
const ytApiUrl = "https://www.googleapis.com/youtube/v3";
const serverIp = "0.0.0.0";
const serverPort = process.env.PORT || 8080;
const mp3DirSpaceLimit = 75 * 1000 * 1000;
const autoPingInterval = 15 * 60 * 1000;

function Video (videoId) {
    this.id = videoId;
    this.size = 0;
    this.isDownloaded = false;
    this.onDownloadCallbacks = [];
    this.yt2mp3;
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
    //Configure YoutubeMp3Downloader.
    if (typeof video.yt2mp3 == 'undefined') {
        video.yt2mp3 = new YoutubeMp3Downloader({
            "ffmpegPath": __dirname + "/ffmpeg/bin/" + (os.platform() == 'win32' ? "ffmpeg.exe" : "ffmpeg"),             // Where is the FFmpeg binary located? 
            "outputPath": __dirname + "/mp3",                               // Where should the downloaded and encoded files be stored? 
            "youtubeVideoQuality": "highest",                               // What video quality should be used? 
            "queueParallelism": 4,                                         // How many parallel downloads/encodes should be started? 
            "progressTimeout": 4000                                         // How long should be the interval of the progress reports 
        });
    }
    if (typeof video.onDownloadCallbacks == 'undefined') {
        video.onDownloadCallbacks = [];
    }
    this.getInfo(function (err, videoInfo) {
        if (err) {
            console.log(err);
        }
        else {
            video.yt2mp3.download(video.id, video.id + "/" + videoInfo.title + ".mp3");
            console.log('Downloading ' + video.id + '...');
            video.yt2mp3.on('progress', function (progress) {
                console.log('Progress: ' + progress.progress.percentage + '%');
            });
            video.yt2mp3.on('error', function (err) {
                console.log(err);
                for (var i = 0; i < video.onDownloadCallbacks.length; i++) {
                    this.onDownloadCallbacks[i](err, null);
                }
            });
            video.yt2mp3.on('finished', function (data) {
                video.isDownloaded = true;
                fs.stat(data.file, function (err, stats) {
                    video.size = stats.size;
                });
                for (var i = 0; i < video.onDownloadCallbacks.length; i++) {
                    video.onDownloadCallbacks[i](null, data);
                }
            });
        }
    });
};

var videos = [];

// Clear /mp3 dir.
console.log("Removing '/mp3' directory ...");
removeDir(__dirname + "/mp3", function (err) {
    if (err) {
        console.log("Error removing '/mp3': " + err);
    }
    else {
        fs.mkdir(__dirname + "/mp3", function(err) {
            if (err)
                console.log("Error creating '/mp3': " + err);
        });
    }
});


// App upTime.
var startTime = Date.now();
function upTime() {
    return (Date.now() - startTime);
};

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
        console.log("Auto pinger error: " + err);
    });
}, autoPingInterval);

var app = express();
app.get('/status', function(request, response) {
    var status = {
        upTime: upTime()
    };
    response.status(200).json(JSON.stringify(status));
});
app.get('/search', function(request, response) {
    if (!request.query.q) {
        response.set('Content-Type', 'text/plain');
		response.set('Access-Control-Allow-Origin', "*");
        response.status(403).send('No query specified');
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
                response.set('Content-Type', 'application/json');
				response.set('Access-Control-Allow-Origin', "*");
                response.status(200).send(JSON.stringify(data));
            });
        }).on('error', function (err) {
            console.log("Youtube search query error: " + err);
        });
    } 
});
app.get('/convert', function(request, response) {
    // No video id in query.
    if (!request.query.v) {
        response.set('Content-Type', 'text/plain');
		response.set('Access-Control-Allow-Origin', "*");
        response.status(403).send('No video id specified');
    }
    else {
        var videoId = request.query.v;
        var fileDir = __dirname + "/mp3/" + videoId;
        // Get fileName.
        fs.readdir(fileDir, function (err, files) {
            // No specified dir with video (video wasn't downloaded yet).
            if (err) {
                // Create dir.
                fs.mkdir(fileDir, function (err) {
                    if (err) {
                        console.log("Error creating '" + fileDir + "': " + err);
                    }
                    else {
                        // Check if have free space.
                        var totalSize = 0;
                        for (var i = 0; i < videos.length; i++) {
                            totalSize += videos[i].size;
                        }
                        // Remove oldest video if no free space.
                        if (totalSize > 0 && totalSize > mp3DirSpaceLimit) {
                            var oldestVideo = videos[0];
                            removeDir(__dirname + "/mp3/" + oldestVideo.id, function (err) {
                                if (err) {
                                    console.log("Error removing oldest video '" + __dirname + "/mp3/" + oldestVideo.id + "': " + err);
                                }
                                else {
                                    videos.splice(0, 1);
                                    console.log("Removed old video '" + oldestVideo.id + "'. Free space: " + (totalSize - oldestVideo.size) + "/" + mp3DirSpaceLimit);
                                }
                            });
                        }
                        
                        // Download video.
                        var video = new Video(videoId);
                        videos.push(video);
                        video.download(videoId);
                        video.onDownloadCallbacks.push(function (err, data) {
                            if (err) {
                                console.log("On download callback error: " + err);
                            }
                            else {
                                fs.readdir(fileDir, function (err, files) {
                                    // Get fileStats.
                                    if (err) {
                                        console.log("Error reading '" + fileDir + "': " + err);
                                    }
                                    else {
                                    var fileName = files[0];
                                    var filePath = fileDir + "/" + fileName;
                                    fs.stat(filePath, function (err, fileStats) {
                                        if (err) {
                                            console.log("Error reading '" + filePath + "': " + err);
                                        }
                                        else {
                                            var fileSize = fileStats.size;
                                            response.set('Content-Type', 'application/json');
                                            var mp3Info = {
                                                fileName: fileName,
                                                fileSize: fileSize,
                                                downloadLink: '/download?v=' + videoId
                                            };
											response.set('Access-Control-Allow-Origin', "*");
                                            response.status(200).send(JSON.stringify(mp3Info));
                                        }
                                    });
                                    }
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
                    if (videos[i].id == videoId) {
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
                            console.log("Error reading '" + filePath + "': " + err);
                        }
                        else {
							var fileSize = fileStats.size;
							response.set('Access-Control-Allow-Origin', "*");
                            response.set('Content-Type', 'application/json');
                            var mp3Info = {
                                fileName: fileName,
                                fileSize: fileSize,
                                downloadLink: '/download?v=' + videoId
                            };
                            response.status(200).send(JSON.stringify(mp3Info));
                        }
                    });
                }
            // Still downloading, add onDownload callback.
                else {
                    video.onDownloadCallbacks.push(function (err, data) {
                        //console.log(files[0]);
                        var fileName = files[0];
                        var filePath = fileDir + "/" + fileName;
                        fs.stat(filePath, function (err, fileStats) {
                            if (err) {
                                console.log("Error reading '" + filePath + "': " + err);
                            }
                            else {
                                var fileSize = fileStats.size;
								response.set('Access-Control-Allow-Origin', "*");	
                                response.set('Content-Type', 'application/json');
                                var mp3Info = {
                                    fileName: fileName,
                                    fileSize: fileSize,
                                    downloadLink: '/download?v=' + videoId
                                };
                                response.status(200).send(JSON.stringify(mp3Info));
                            }
                        });
                    });
                }
            }
        });
    }
});

app.get('/download', function(request, response) {
    // No video id in query.
    if (!request.query.v) {
        response.set('Content-Type', 'text/plain');
		response.set('Access-Control-Allow-Origin', "*");
        response.status(403).send('No video id specified');
    }
    else {
        var videoId = request.query.v;
        var fileDir = __dirname + "/mp3/" + videoId;
        // Get fileName.
        fs.readdir(fileDir, function (err, files) {
            if (err) {
                console.log("Error reading '" + fileDir + "': " + err);
            }
            else {
                // Get fileStats.
                var fileName = files[0];
                var filePath = fileDir + "/" + fileName;
                fs.stat(filePath, function (error, fileStats) {
                    if (err) {
                            console.log("Error reading '" + filePath + "': " + err);
                    }
                    else {
                        var fileSize = fileStats.size;
                        var filePath = fileDir + "/" + fileName;
                        response.set('Content-Type', 'audio/mpeg');
                        response.set('Content-Length', fileSize.toString());
                        response.set('Content-Disposition', 'attachment; filename="' + fileName + '"');
						response.set('Access-Control-Allow-Origin', "*");
                        response.status(200);
                        var readStream = fs.createReadStream(filePath);
                        readStream.pipe(response);
                        readStream.on("close", function () {

                        });
                    }
                });
            }
        });
    } 
});

console.log("Starting server...");
var server = app.listen(serverPort, function() {
   var host = server.address().address;
   var post = server.address().port;
   
   console.log("Server is running on " + host + ":" + post);
});

// Remove dir recursively.
function removeDir(location, next) {
    if (typeof next == 'undefined') {
        next = function () { };
    }
    fs.readdir(location, function (err, files) {
        async.each(files, function (file, cb) {
            file = location + '/' + file
            fs.stat(file, function (err, stat) {
                if (err) {
                    return cb(err);
                }
                if (stat.isDirectory()) {
                    removeDir(file, cb);
                } else {
                    fs.unlink(file, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        return cb();
                    })
                }
            })
        }, function (err) {
            if (err) return next(err)
            fs.rmdir(location, function (err) {
                return next(err)
            })
        });
    });
}