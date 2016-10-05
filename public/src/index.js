import React from 'react'
import ReactDOM from 'react-dom'

import socket from 'socket.io-client'

import './scss/index.scss'

const MAX_VIDEOS = 4

class App extends React.Component {

    constructor () {
        super()

        this.state = {
            uptime: 0,
            videos: []
        }

        this.io = socket('localhost:3000')

        this.io.on('connect', () => {

        })

        this.io.on('disconnect', () => {

        })

        this.io.on('uptime', (data) => {
            this.setState({
                uptime: data.uptime
            })
        })

        this.io.on('videosList', (data) => {
            console.log(data.videos)
            this.setState({
                videos: data.videos.length > MAX_VIDEOS ? data.videos.slice(data.videos.length - MAX_VIDEOS, data.videos.length) : data.videos
            })
        })

        this.io.on('download', (data) => {
            let videos = this.state.videos.length > MAX_VIDEOS ? this.state.videos.slice(this.state.videos.length - MAX_VIDEOS, this.state.videos.length) : this.state.videos
            videos.push(data.video)
            this.setState({
                videos
            })
        })

        let arr = [1, 2, 3, 4]
        console.log('before', arr)
        arr.reverse()
        console.log('after', arr)
    }

    formatDate (date) {
        return date
    }

    install () {
        window.chrome.webstore.install('https://chrome.google.com/webstore/detail/idmpmcojkloaepopblkoiebbldelfnio',
        (data) => {
            console.log(data)
        }, (err) => {
            console.error(err)
        })
    }

    render () {
        return (
            <div className='app-wrapper'>
                <div className='extension-logo'></div>
                <button className='btn center' onClick={this.install}>Install</button>
                {/* <p>Server uptime: {this.formatDate(this.state.uptime)}</p> */}
                <hr/>
                <p>Latest downloads:</p>
                <ul className='videos-list' data-loading={this.state.videos.length === 0} style={{height: MAX_VIDEOS * 75}}>
                    {this.state.videos.map((video, i) => {
                        return (
                            <li className='video' key={video.key}>
                                <a href={`https://youtube.com/watch?v=${video.id}`} target='_blank'>
                                    <img className='video-thumbnail' src={video.thumbnail}/>
                                    <span className='video-title'>{video.title}</span>
                                </a>
                            </li>
                        )
                    }).reverse()}
                </ul>
            </div>
        )
    }
}

export default App

ReactDOM.render(
    <App />,
    document.getElementById('app')
)
