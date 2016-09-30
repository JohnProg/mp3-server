let startTime

function start () {
    startTime = Date.now()
}

function getUptime () {
    return startTime ? (Date.now() - startTime) : 0
}

export default {
    start,
    getUptime
}
