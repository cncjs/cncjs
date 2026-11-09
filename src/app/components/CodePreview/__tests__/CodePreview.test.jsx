import React from 'react';
import { renderAppUI } from '@app/test/render';
import CodePreview from '..';

const gcode = 'G21\nG0 X1 Y2\n; <script>alert("x")</script> & finish\nM2';

test('real G-code highlighter preserves four lines and escapes markup', () => {
  const { container } = renderAppUI(<CodePreview data={gcode} language="gcode" showLineNumbers />);
  const pre = container.querySelector('pre');
  expect(pre).not.toBeNull();
  expect(pre.querySelector('code').textContent).toContain('G21');
  expect(pre.textContent).toContain('<script>alert("x")</script> & finish');
  expect(pre.querySelectorAll('script')).toHaveLength(0);
  const numbers = pre.querySelectorAll('.react-syntax-highlighter-line-number');
  expect([...numbers].map(node => node.textContent.trim())).toEqual(['1', '2', '3', '4']);
});

test('empty G-code is an empty code block', () => {
  const { container } = renderAppUI(<CodePreview data="" language="gcode" />);
  expect(container.querySelector('code').textContent).toBe('');
});

test('JSON previews keep their content and custom container style', () => {
  const { container } = renderAppUI(<CodePreview data='{"name":"example"}' style={{ margin: 0 }} />);
  expect(container.querySelector('code').textContent).toBe('{"name":"example"}');
  expect(container.querySelector('pre').style.margin).toBe('0px');
});
