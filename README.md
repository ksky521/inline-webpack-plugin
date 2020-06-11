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
            test(filepath, chunk) {
                if (chunk.name === 'main' && /\.css$/.test(filepath)) {
                    // only for main.css
                    return '<!-- main-css -->';
                }
                if (chunk.name === 'foo' || chunk.name === 'vendors') {
                    // chunk all,include css & js file
                    return true;
                }
            }
        })
    ]
};
```

You can find this demo in the [example](https://github.com/ksky521/inline-webpack-plugin/tree/master/example) directory and view the output:

```bash
npm i
npm run test
```

## Options

-   `test`: `string` | `function` | `RegExp`, when `test` is a function, return `true` or `string`, `string` is placeholder to replace, The parameters of the function are:
    -   filepath: file path
    -   chunk: chunk object, chunk.name is chunk name.

## Debug log

Use [debug](https://www.npmjs.com/package/debug) for log.

```bash
DEBUG=@ksky521/inline-webpack-plugin
```
