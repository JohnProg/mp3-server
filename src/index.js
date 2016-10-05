import http from 'http'
import path from 'path'
import os from 'os'

import express from 'express'
import morgan from 'morgan'
import fetch from 'node-fetch'
import ffmpeg from 'fluent-ffmpeg'

import config from './config.json'
import socket from './socket'
import api from './api'
import utils from './utils'

import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpackHotMiddleware from 'webpack-hot-middleware'
import webpackConfig from '../webpack.dev.config'

// Setup server
let port = process.env.PORT || config.PORT
const DEBUG = process.env.NODE_ENV === 'development'
if (DEBUG) {
    require('pretty-error').start()
}
const FFMPEG_PATH = path.join(__dirname, '../ffmpeg/bin/', (os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'))

ffmpeg.setFfmpegPath(FFMPEG_PATH)

var app = express()
app.set('config', config)
app.use(morgan(DEBUG ? 'dev' : null))

// Old API
app.use('/', api)

// Use webpack middlewares for development
if (DEBUG) {
    let compiler = webpack(webpackConfig)
    app.use(webpackDevMiddleware(compiler, {
        publicPath: webpackConfig.output.publicPath,
        noInfo: true,
        stats: {
            colors: true
        }
    }))
    app.use(webpackHotMiddleware(compiler, {
        log: console.log
    }))
}
app.use('/', express.static(path.join(__dirname, '../public')))
app.use('/api', api)

const server = http.createServer(app)
let io = socket(server)
app.set('io', io)

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

// Start server
server.listen(port)

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
