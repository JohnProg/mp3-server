import fetch from 'node-fetch'

let config

export default function (req, res) {
    try {
        config = req.app.get('config')
        let q = req.query.q// .replace(' ', '%20');

        fetch(`${config.YT_API_URI}/search?part=snippet&q=${q}&type=video&maxResults=3&order=relevance&key=${config.YT_API_KEY}`)
        .then((data) => {
            return data.json()
        })
        .then((data) => {
            res.status(200).json(data)
        })
        .catch((e) => {
            console.error('Ping error', e)
        })
    } catch (e) {
        console.error(e)
    }
}
