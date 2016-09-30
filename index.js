import http from 'http'
import path from 'path'
import os from 'os'

import express from 'express'
import morgan from 'morgan'
import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'

import config from './config.json'
import api from './src/api'
import errorHandler from './src/errorHandler'
import utils from './src/utils'

// Setup server
let port = process.env.PORT || config.PORT
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) {
    require('pretty-error').start()
}
const FFMPEG_PATH = path.join(__dirname, '/ffmpeg/bin/', (os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'))

ffmpeg.setFfmpegPath(FFMPEG_PATH)

var app = express()
app.set('config', config)
app.use(morgan(DEBUG ? 'dev' : null))
app.use('/api', api)
app.use(errorHandler)

// Start server
const server = http.createServer(app)
server.listen(port)

server.on('listening', () => {
    utils.timer.start()

    let addr = server.address()
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port
    console.log('Server listening on ' + bind)
    port = addr.port

    ping()
    setInterval(ping, config.PING_INTERVAL)
})

server.on('error', (err) => {
    console.error(err)
})

function ping () {
    fetch(`http://127.0.0.1:${port}/api/status`)
    .then((data) => {
        return data.json()
    })
    .then((data) => {
        console.log('Ping response', data)
    })
    .catch((e) => {
        console.error('Ping error', e)
    })
}
