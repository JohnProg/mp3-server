'use strict';

const errorHandler = function(err, req, res, next) {
    const chalk = require('chalk');

    console.error(chalk.red(err.message));
    res.set('Content-Type', 'text/plain');
    res.set('Access-Control-Allow-Origin', "*");
    res.status(500).json(err.message).end();
};

module.exports = errorHandler;