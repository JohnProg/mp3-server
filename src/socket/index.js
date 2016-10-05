import socket from 'socket.io'
import utils from '../utils'

export default function (server) {
    let io = socket(server)

    io.on('connection', (socket) => {
        try {
            io.sockets.emit('videosList', {
                videos: utils.videosList.get()
            })
            io.sockets.emit('uptime', {
                uptime: utils.timer.getUptime()
            })
        } catch (e) {
            console.error(e)
        }
    })

    return io
}
