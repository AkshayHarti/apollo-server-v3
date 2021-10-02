module.exports = {
    parser: 'babel-eslint',

    env: {
        es6: true,
        node: true,
        jest: true,
    },

    plugins: ['import', 'react', 'react-hooks'],

    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:prettier/recommended',
    ],

    settings: {
        react: {
            version: 'detect',
        },
    },

    rules: {
        // Errors when prettier thinks a file should be changed
        'prettier/prettier': 0,

        // ES5 rules
        'consistent-this': [2, 'self'],
        'dot-notation': 2,
        'eol-last': 2,
        eqeqeq: 2,
        'linebreak-style': [2, 'unix'],
        'max-len': [0, 100],
        'no-array-constructor': 2,
        'no-console': 0,
        'no-debugger': 0,
        'no-eval': 2,
        'no-extend-native': 2,
        'no-fallthrough': 2,
        'no-implied-eval': 2,
        'no-loop-func': 2,
        'no-redeclare': [2, { builtinGlobals: true }],
        'no-undefined': 0,
        'no-underscore-dangle': 0,
        'no-unused-vars': ['error', { ignoreRestSiblings: true }],
        'no-useless-call': 2,
        'no-use-before-define': 0,
        radix: 2,
        strict: 0,
        yoda: 2,

        // ES6 rules
        'no-var': 2,
        'object-shorthand': 2,
        'prefer-arrow-callback': 2,
        'prefer-spread': 2,
        'prefer-template': 2,
        'import/order': 2,
        'import/default': 2,
        'import/first': 2,
        'import/named': 2,
        'import/no-named-as-default': 0,
        'import/no-unresolved': 2,
        'import/no-extraneous-dependencies': 2,
        'import/no-mutable-exports': 2,
        'import/no-named-default': 2,

        // JSX/React rules
        'react/display-name': [2, { ignoreTranspilerName: true }],
        'react/jsx-boolean-value': [2, 'always'],
        'react/jsx-key': 2,
        'react/jsx-pascal-case': 2,
        'react/no-multi-comp': [2, { ignoreStateless: true }],
        'react/sort-prop-types': 2,
        'react/no-unescaped-entities': 0,

        // JSX/React rules that should be re-enabled after the rule violations are fixed
        'react/no-string-refs': 0,
        'react/no-deprecated': 0,

        // jsx-no-bind is bugged and can't be disabled by setting it to 0
        // have to pass the below options to turn it off
        'react/jsx-no-bind': [
            2,
            {
                ignoreRefs: true,
                allowArrowFunctions: true,
                allowBind: true,
            },
        ],

        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
    },
}
