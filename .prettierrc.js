// Prettier configuration for Expo/React Native project
// https://prettier.io/docs/en/options.html

module.exports = {
  // Line length that Prettier will wrap on
  printWidth: 80,

  // Number of spaces per indentation level
  tabWidth: 2,

  // Use spaces instead of tabs
  useTabs: false,

  // Semicolons at the end of statements
  semi: true,

  // Use single quotes instead of double quotes
  singleQuote: true,

  // Quote properties in objects only when necessary
  quoteProps: 'as-needed',

  // Use single quotes in JSX
  jsxSingleQuote: false,

  // Trailing commas where valid in ES5 (objects, arrays, etc.)
  trailingComma: 'es5',

  // Spaces between brackets in object literals
  bracketSpacing: true,

  // Put the > of a multi-line JSX element at the end of the last line
  bracketSameLine: false,

  // Include parentheses around a sole arrow function parameter
  arrowParens: 'always',

  // Format only files that have a special comment at the top
  requirePragma: false,

  // Insert a special @format marker at the top of formatted files
  insertPragma: false,

  // Wrap prose if it exceeds the print width
  proseWrap: 'preserve',

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',

  // Line endings
  endOfLine: 'lf',

  // Enforce single attribute per line in JSX
  singleAttributePerLine: false,

  // Tailwind CSS plugin for class sorting
  plugins: ['prettier-plugin-tailwindcss'],
};
