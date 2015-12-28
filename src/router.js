'use strict';

module.exports = function(config) {
    const status = require('./controllers/statusController'),
        video = require('./controllers/videoController')(config);

    var router = {};
    router.statusController = status;
    router.videoController = video;
    return router;
};