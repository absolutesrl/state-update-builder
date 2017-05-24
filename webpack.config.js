var path = require('path');

module.exports = {
    devtool: "cheap-eval-source-map",
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js",
        library: "state-update-builder",
        libraryTarget: "umd"
    },
    module: {
        rules: [
            {test: /\.js$/, include: '/src', exclude: /node_modules/, loader: 'babel-loader'}
        ]
    },
    resolve: {
        modules: ["node_modules", path.resolve(__dirname, "src")],
        alias: {
            "src$": "/src"
        }
    }
};