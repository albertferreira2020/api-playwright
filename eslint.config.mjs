import eslintJs from "@eslint/js";
import globals from "globals";

export default [
    {
        files: ["**/*.js", "**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
                process: "readonly",
                console: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
            },
        },
        rules: {
            ...eslintJs.configs.recommended.rules,
            "no-console": "off",
            "indent": "off",
            "no-unused-vars": "off",
        },
    },
];
