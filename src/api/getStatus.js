import utils from '../utils'

export default function (req, res) {
    let status = {
        upTime: utils.timer.getUptime()
    }
    res.status(200).json(status)
}
