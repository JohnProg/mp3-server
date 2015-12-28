'use strict';

var startTime = Date.now();
const upTime = function() {
    return (Date.now() - startTime);
};

module.exports.upTime = upTime;