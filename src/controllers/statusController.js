'use strict';

const https = require('https');
const utils = require('../utils');

const getStatus = function(request, response) {
    var status = {
        upTime: utils.upTime()
    };
    response.status(500).json(status);
};

module.exports.getStatus = getStatus;