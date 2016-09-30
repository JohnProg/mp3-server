import fetch from 'node-fetch'
import ytdl from 'ytdl-core'
import ffmpeg from 'fluent-ffmpeg'

let config

export function getVideoInfo (videoId) {
    return fetch(`${config.YT_API_URI}/videos?part=snippet,contentDetails,statistics,status&id=${videoId}&key=${config.YT_API_KEY}`)
    .then((data) => {
        return data.json()
    })
}

export function downloadVideo (videoId, res) {
    return new Promise((resolve, reject) => {
        let readStream = ytdl('http://www.youtube.com/watch?v=' + videoId)

        ffmpeg(readStream)
        .format('mp3')
        .on('start', () => {
            // console.log('Started processing video.')
        })
        .on('end', () => {
            // console.log('Finished processing video.')
            resolve()
        })
        .on('error', (err) => {
            reject(err)
        })
        .pipe(res)
    })
}

export default function (req, res) {
    config = req.app.get('config')
    let videoId = req.query.v

    getVideoInfo(videoId)
    .then((videoInfo) => {
        if (videoInfo.error) {
            return res.status(500).json(videoInfo.error).end()
        }
        let title = videoInfo.items[0].snippet.title

        res.set('Content-Type', 'audio/mpeg')
        res.set('Content-Disposition', `attachment; filename="${title}.mp3"`)
        res.status(200)

        return downloadVideo(videoId, res)
    })
    .catch((e) => {
        console.error(e)
    })
}
