import fs from 'fs';
import path from 'path';

const appRoot = path.resolve(__dirname, '../..');
const legacyFamilies = [
  'Checkbox', 'FormControl', 'FormGroup', 'HorizontalForm', 'InputGroup',
  'InlineError', 'Radio', 'ToggleSwitch', 'Validation',
];
const legacyImport = new RegExp(`@app/components/(${legacyFamilies.join('|')})(?:/|['"])`);

const sourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const filename = path.join(directory, entry.name);
  if (entry.isDirectory()) {
    return entry.name === '__tests__' ? [] : sourceFiles(filename);
  }
  return /\.(js|jsx)$/.test(entry.name) ? [filename] : [];
});

test('production source has no legacy P2 form family imports', () => {
  const offenders = sourceFiles(appRoot).filter(filename => legacyImport.test(fs.readFileSync(filename, 'utf8')));
  expect(offenders.map(filename => path.relative(appRoot, filename))).toEqual([]);
});
