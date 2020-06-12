const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const InlineWebpackPlugin = require('../index.js');
module.exports = {
    mode: 'development',
    output: {
        publicPath: 'https://cdn.example.com/assets/',
        path: __dirname + '/dist',
        filename: '[name].[hash:8].js'
    },
    entry: {
        main: './main.js',
        foo: './foo.js',
        bar: './bar.js',
        uninline: './uninline.js'
    },
    module: {
        rules: [
            {test: /\.html$/, loader: 'html-loader'},
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                defaultVendors: {
                    name: 'vendors',
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            minify: {
                collapseWhitespace: false,
                removeComments: false
            },
            filename: 'index.html',
            template: './template.html'
        }),
        new InlineWebpackPlugin([
            {
                test(filepath, chunk) {
                    if (chunk.name === 'main' && /\.css$/.test(filepath)) {
                        // only for main.css
                        return true;
                    }
                },
                attrs: {
                    ['data-inline-props']: 'test'
                },
                placeholder: '<!-- main-css -->'
            },
            {
                test: /(foo|vendors)/
            },
            {
                test(filepath, chunk) {
                    if (chunk.name === 'bar' && /\.css$/.test(filepath)) {
                        return true;
                    }
                },
                content: 'hello world',
                remove: false,
                placeholder: '<!-- replaceit -->'
            }
        ]),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash:8].css',
            chunkFilename: '[id].css'
        })
    ]
};
