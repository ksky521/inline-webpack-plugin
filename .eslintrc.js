/**
 * @file eslint 规则文件
 */
module.exports = {
    extends: ['@ecomfe/eslint-config'],
    env: {
        node: true
    },
    rules: {
        // 禁止 console，要用写 eslint disbale
        'no-console': 'off',
        // 禁止 debugger，防止上线
        'no-debugger': 2,
        // 禁止 alert，要用写 eslint disable
        'no-alert': 2,
        // 不用的 var，要删除，手动 tree shaking，要洁癖
        'no-unused-vars': 2,
        // 没定义就用的就别用，全局的要用 写 eslint global
        'no-undef': 2,
        'comma-dangle': ['error', 'never']
    }
};
