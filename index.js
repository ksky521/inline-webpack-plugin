const HtmlWebpackPlugin = require('html-webpack-plugin');
const htmlparser = require('htmlparser2');
const debug = require('debug');
const {name, version} = require('./package.json');

const RE_ANY = /<(script|link)\s?[^>]*?>(?:<\/\1\s?>)?/gm;
const isJS = val => /\.js$/.test(val);
// const isCSS = val => /\.css$/.test(val);

const log = debug(name);

log(version);
class InlineWebpackPlugin {
    constructor(options = []) {
        this.version = version;
        this.assetsMap = new Map();
        this.deleteAssets = [];
        options = Array.isArray(options) ? options : [options];
        if (!Array.isArray(options)) {
            throw new Error(`${name} options must be a array.`);
        }
        this.options = options.map(opt => {
            let test;
            if (typeof opt.test === 'function') {
                test = opt.test;
            }
            else if (opt.test && opt.test instanceof RegExp) {
                test = (filepath, chunk) => opt.test.test(filepath);
            }
            else if (typeof opt.test === 'string' && opt.test !== '') {
                test = (filepath, chunk) => filepath === opt.test;
            }
            else {
                throw new Error(
                    `${name}: [options].test must be a string or RegExp or function, but get ${typeof opt.test}`
                );
            }
            return {...opt, test};
        });
    }

    afterHtmlProcessing(compilation, data, cb) {
        let html = data.html;
        const test = (filepath, chunk) => this.options.find(opt => opt.test(filepath, chunk));

        const file2AssetsMap = new Map();
        for (let i = 0, len = compilation.chunks.length; i < len; i++) {
            const chunk = compilation.chunks[i];
            /* eslint-disable no-loop-func */
            chunk.files.forEach(file => {
                // 处理 placeholder 情况
                const result = test(file, chunk);
                if (result) {
                    let {placeholder = '', remove = true, content = undefined, attrs = {}} = result;

                    file2AssetsMap.set(file, {
                        chunk,
                        content,
                        remove,
                        attrs,
                        placeholder
                    });
                }
            });
        }

        const assetsMap = this.assetsMap;

        compilation.getAssets().forEach(({name, source}) => {
            const fileObject = file2AssetsMap.get(name);

            if (fileObject) {
                const {placeholder, content, chunk, attrs, remove = true} = fileObject;

                const tag = isJS(name) ? 'script' : 'style';
                let code;
                if (typeof content === 'function') {
                    code = content(name, chunk);
                }
                else if (typeof content === 'string') {
                    code = content;
                }
                const attrString = this._getAttrString(attrs);
                code = code !== undefined
                    ? code
                    : `\n<${tag} data-inline-name="${name}" ${attrString}>${source.source()}</${tag}>\n`;

                assetsMap.set(name, code);
                let tagAsPlaceholder = true;
                if (placeholder && placeholder !== '') {
                    if (html.indexOf(placeholder) !== -1) {
                        html = html.split(placeholder).join(code);
                        tagAsPlaceholder = false;
                    }
                }
                const regExp = new RegExp(name);
                this.deleteAssets.push({name, regExp, tagAsPlaceholder, remove});
            }
        });
        log('file to inline %O', file2AssetsMap);
        log('tag to delete %O', this.deleteAssets);
        html = this.deleteTag(html);
        data.html = html;
        cb(null, data);
    }
    _getAttrString(attrs) {
        let str = '';
        if (typeof attrs === 'object') {
            str += Object.keys(attrs)
                .map(k => `${k}=${attrs[k] ? JSON.stringify(attrs[k]) : ''}`)
                .join(' ');
        }
        else if (typeof attrs === 'string') {
            str += attrs;
        }
        return str;
    }
    deleteTag(html) {
        const assetsMap = this.assetsMap;
        let removeTagFlag = false;
        let code = '';
        let needRemoveOrigTag = false;
        const tagRegExp = RE_ANY;
        const parser = new htmlparser.Parser(
            new htmlparser.DomHandler((error, dom) => {
                if (error) {
                    throw error;
                }
                const attributes = dom[0].attribs;
                const url = attributes.href || attributes.src;
                removeTagFlag = this.deleteAssets.some(({name, regExp, remove, tagAsPlaceholder}) => {
                    if (regExp.test(url)) {
                        needRemoveOrigTag = remove;
                        code = tagAsPlaceholder ? assetsMap.get(name) : '';
                        return true;
                    }
                    code = '';

                    return false;
                });
            })
        );

        return html.replace(tagRegExp, match => {
            parser.parseComplete(match);
            return removeTagFlag ? (needRemoveOrigTag ? code : code + match) : match;
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
