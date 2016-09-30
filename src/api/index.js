import express from 'express'

import getStatus from './getStatus'
import searchVideo from './searchVideo'
import downloadVideo from './downloadVideo'

const router = express.Router()

router.use('*', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*')
    next()
})

// API endpoints
router.get('/status', getStatus)
router.get('/search', searchVideo)
router.get('/download', downloadVideo)

export default router
