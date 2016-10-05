let webpack = require('webpack')
let path = require('path')

let mainPath = path.resolve(__dirname, 'public', 'src', 'index.js')

let config = {
    devtool: 'eval',
    entry: [
        'webpack/hot/dev-server',
        'webpack-hot-middleware/client',
        mainPath
    ],
    output: {
        filename: 'index.js',
        path: '/',
        publicPath: '/build/js'
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
        new webpack.HotModuleReplacementPlugin()
    ]
}

module.exports = config
