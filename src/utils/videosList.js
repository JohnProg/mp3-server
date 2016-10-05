let videosList = []
let key = 0

const MAX_VIDEOS = 100

function get (limit = videosList.length) {
    limit = limit > MAX_VIDEOS ? MAX_VIDEOS : limit
    return limit > videosList.length ? videosList : videosList.slice(videosList.length - limit, videosList.length)
}

function push (video) {
    if (videosList.length >= MAX_VIDEOS) {
        videosList.pop()
    }
    video.key = key++
    videosList.push(video)
}

export default {
    push,
    get
}
