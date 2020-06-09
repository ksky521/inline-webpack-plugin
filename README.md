# inline-webpack-plugin

This is a webpack plugin to embed css/js chunk in the html ([html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) is needed).

## install

```bash
npm i @ksky521/inline-webpack-plugin -D
```

## Usage

```js
// webpack.config.js
const InlineWebpackPlugin = require('@ksky521/inline-webpack-plugin');
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
    plugins: [
        // ... html-webpack-plugin required!
        new InlineWebpackPlugin({
            chunks: [
                {
                    name: 'main',
                    placeholder: {
                        css: '<!-- main-css -->'
                    }
                },
                'foo',
                {name: 'bar'},
                {
                    name: 'vendors'
                }
            ]
        })
    ]
};
```

You can find this demo in the [example](https://github.com/ksky521/inline-webpack-plugin/tree/master/example) directory and view the output:

```bash
npm i
cd example
npx webpack
```

## Options

-   chunks: `[object]`, with `name`、`placeholder`.

