const HtmlWebpackPlugin = require('html-webpack-plugin');
const htmlparser = require('htmlparser2');
const debug = require('debug');
const {name, version} = require('./package.json');

const RE_ANY = /<(script|link)\s?[^>]*?>(?:<\/\1\s?>)?/gm;
const isJS = val => /\.js$/.test(val);
const isCSS = val => /\.css$/.test(val);

const log = debug(name);

log(version);
class InlineWebpackPlugin {
    constructor(options = {}) {
        this.version = version;
        this.assetsMap = new Map();
        this.deleteAssets = [];
        this.options = options;
        if (typeof options.test === 'function') {
            this.testFunction = options.test;
        }
        else if (options.test && options.test instanceof RegExp) {
            this.testFunction = (filepath, chunk) => options.test.test(filepath);
        }
        else if (typeof options.test === 'string' && options.test !== '') {
            this.testFunction = (filepath, chunk) => filepath === options.test;
        }
        else {
            throw new Error(
                `${name}: options.test must be a string or RegExp or function, but get ${typeof options.test}`
            );
        }
    }

    afterHtmlProcessing(compilation, data, cb) {
        let html = data.html;
        const test = this.testFunction;

        const file2AssetsMap = new Map();
        for (let i = 0, len = compilation.chunks.length; i < len; i++) {
            const chunk = compilation.chunks[i];
            /* eslint-disable no-loop-func */
            chunk.files.forEach(file => {
                // 处理 placeholder 情况
                let replaceTag = true;
                let splitPlaceholder;
                const result = test(file, chunk);
                if (result) {
                    const placeholder = typeof result === 'string' ? result : '';
                    if (placeholder && placeholder !== '') {
                        if (isJS(file) && placeholder.js) {
                            splitPlaceholder = placeholder.js;
                        }
                        else if (isCSS(file) && placeholder.css) {
                            splitPlaceholder = placeholder.css;
                        }
                        if (html.indexOf(splitPlaceholder) !== -1) {
                            replaceTag = false;
                        }
                    }
                    file2AssetsMap.set(file, {
                        replaceTag,
                        placeholder: splitPlaceholder
                    });
                }
            });
        }

        const assetsMap = this.assetsMap;

        compilation.getAssets().forEach(({name, source}) => {
            const fileObject = file2AssetsMap.get(name);

            if (fileObject) {
                const tag = isJS(name) ? 'script' : 'style';

                const code = `\n<${tag} data-inline-name="${name}">${source.source()}</${tag}>\n`;
                assetsMap.set(name, code);
                const {replaceTag, placeholder} = fileObject;
                if (placeholder && !replaceTag) {
                    html = html.split(placeholder).join(code);
                }

                const regExp = new RegExp(name);
                this.deleteAssets.push({name, regExp, replaceTag});
            }
        });
        log('file to inline %O', file2AssetsMap);
        log('tag to delete %O', this.deleteAssets);
        html = this.deleteTag(html);
        data.html = html;
        cb(null, data);
    }

    deleteTag(html) {
        const assetsMap = this.assetsMap;
        let needDelete = false;
        let code = '';
        const tagRegExp = RE_ANY;
        const parser = new htmlparser.Parser(
            new htmlparser.DomHandler((error, dom) => {
                if (error) {
                    throw error;
                }
                const attributes = dom[0].attribs;
                const url = attributes.href || attributes.src;
                needDelete = this.deleteAssets.some(({name, regExp, replaceTag}) => {
                    if (regExp.test(url)) {
                        code = replaceTag ? assetsMap.get(name) : '';
                        return true;
                    }
                    code = '';

                    return false;
                });
            })
        );

        return html.replace(tagRegExp, match => {
            parser.parseComplete(match);
            return needDelete ? code : match;
        });
    }

    apply(compiler) {
        // webpack 4 or higher
        if (HtmlWebpackPlugin.version >= 4) {
            log('html-wepback-plugin v4');

            // HtmlWebpackPlugin 4 or higher
            compiler.hooks.compilation.tap(name, compilation => {
                const process = this.afterHtmlProcessing.bind(this, compilation);

                HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
                    name, // Set a meaningful name here for stack traces
                    process
                );
            });
        }
        else {
            log('html-wepback-plugin v3');
            // HtmlWebpackPlugin 3 or lower
            compiler.hooks.compilation.tap(name, compilation => {
                const process = this.afterHtmlProcessing.bind(this, compilation);

                // if htmlWebpackPlugin is not exist, just do nothing
                if (compilation.hooks.htmlWebpackPluginAfterHtmlProcessing) {
                    compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tapAsync(name, process);
                }
            });
        }
    }
}

module.exports = InlineWebpackPlugin;
