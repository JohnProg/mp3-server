let webpack = require('webpack')
let path = require('path')

let mainPath = path.resolve(__dirname, 'public', 'src', 'index.js')

let config = {
    devtool: 'cheap-module-source-map',
    entry: [
        mainPath
    ],
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'public', 'build', 'js')
    },
    module: {
        loaders: [
            {
                test: /\.js?$/,
                loaders: ['babel']
            },
            {
                test: /\.scss$/,
                loaders: ['style', 'css', 'sass']
            },
            {
                test: /\.css$/,
                loader: ['style', 'css']
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        })
    ]
}

module.exports = config
