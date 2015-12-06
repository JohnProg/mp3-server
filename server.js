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
ytdl = require('ytdl-core'),
ffmpeg = require('fluent-ffmpeg');

const ytApiKey = "AIzaSyBhtvRxAa5jePf6x0BRQCK-BBZ5-mhGwss";
const ytApiUrl = "https://www.googleapis.com/youtube/v3";
const serverIp = "0.0.0.0";
const httpPort = process.env.PORT || 8080;
const httpsPort = process.env.PORT || 443;
const autoPingInterval = 15 * 60 * 1000;
const ffmpegPath = __dirname + "/ffmpeg/bin/" + (os.platform() == 'win32' ? "ffmpeg.exe" : "ffmpeg");

ffmpeg.setFfmpegPath(ffmpegPath);

function Video (videoId) {
    this.id = videoId;
    this.size = 0;
	this.info = null;
};
Video.prototype.getInfo = function(callback) {
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
            video.info = JSON.parse(data);
			
            callback(null, {
                title: video.info.items[0].snippet.title
            });
        });
    }).on('error', function (err) {
        callback(err, null);
    });
};
Video.prototype.download = function (response) {
	var video = this;
    this.getInfo(function (err, videoInfo) {
        if (err) {
            console.log(err);
			return;
        }
		var readStream = ytdl("http://www.youtube.com/watch?v=" + video.id);
		var command = ffmpeg(readStream)
		.format("mp3")
		.on("start", function() {
			console.log("Started processing video.");
		})
		.on("end", function() {
			console.log("Finished processing video.");
		})
		.pipe(response);
    });
};


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

app.get('/download', function(request, response) {
    // No video id in query.
    if (!request.query.v) {
        response.set('Content-Type', 'text/plain');
		response.set('Access-Control-Allow-Origin', "*");
        response.status(403).send('No video id specified');
    }
    else {
        var videoId = request.query.v;
		var video = new Video(videoId);
		video.getInfo(function(err, videoInfo) {
			if (err) {
				console.log(err);
				return;
			}
			response.set('Content-Type', 'audio/mpeg');
			response.set('Content-Disposition', 'attachment; filename="' + videoInfo.title + '.mp3"');
			response.set('Access-Control-Allow-Origin', "*");
			response.status(200);
			video.download(response);
		});
    } 
});

var options = {
  key: fs.readFileSync("ssl/key.pem"),
  cert: fs.readFileSync("ssl/cert.pem")
};

http.createServer(app).listen(httpPort);
https.createServer(options, app).listen(httpsPort);
console.log("Server is running.");
