const fs = require('fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Spinner, TonicProvider, createTheme } = require('@tonic-ui/react');
const colors = require('../src/app/config/theme-colors.json');

const theme = createTheme({ colors });

// Render the actual Tonic spinner before the application bundle loads. Keep
// language placeholders for the existing server-side template renderer.
module.exports = (filename) => {
  const indicator = React.createElement(Spinner, { size: 'sm', mx: 'auto', 'aria-hidden': true });
  const spinner = renderToStaticMarkup(React.createElement(TonicProvider, { theme }, indicator));
  return fs.readFileSync(filename, 'utf8')
    .replace('{{spinner}}', spinner)
    .replace('{{lightBackground}}', theme.colors.background.highest._light)
    .replace('{{darkBackground}}', theme.colors.background.highest._dark)
    .replace('{{lightText}}', theme.colors.text.primary._light)
    .replace('{{darkText}}', theme.colors.text.primary._dark);
};
