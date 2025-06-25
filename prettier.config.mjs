/**
 * @type {import("prettier").Config}
 * Need to restart IDE when changing configuration
 * Open the command palette (Ctrl + Shift + P) and execute the command > Reload Window.
 */

const config = {
  semi: true,
  tabWidth: 2,
  endOfLine: 'lf',
  printWidth: 100,
  singleQuote: true,
  trailingComma: 'es5',
  proseWrap: 'never',
  bracketSpacing: true,
  arrowParens: 'avoid',
  // Ignore formatting for specific files if needed
  overrides: [
    {
      files: ["index.js", "scraper.js"],
      options: {
        requirePragma: true, // Only format files with @format or @prettier pragma
      },
    },
  ],
};

export default config;
