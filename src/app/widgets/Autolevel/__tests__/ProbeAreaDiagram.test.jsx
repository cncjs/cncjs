import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import ProbeAreaDiagram from '../ProbeAreaDiagram';
import { getScanPointCount } from '../scanPath';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: (value, options = {}) => value.replace(/{{(\w+)}}/g, (_match, key) => options[key]) },
}));

const grid = { startX: 0, endX: 20, stepX: 10, startY: 0, endY: 10, stepY: 10, units: 'mm' };
const marker = (diagram, label) => within(diagram).getByText(label).parentElement.querySelector('circle');
const dots = diagram => Array.from(diagram.children).filter(child => child.tagName.toLowerCase() === 'circle');

const expectPosition = (element, x, y) => {
  expect(element).toHaveAttribute('cx', String(x));
  expect(element).toHaveAttribute('cy', String(y));
};

describe('Probe area diagram', () => {
  test.each([
    ['raster', 'x', [30, 110], [190, 10]],
    ['raster', 'y', [30, 110], [190, 10]],
    ['zigzag', 'x', [30, 110], [30, 10]],
    ['zigzag', 'y', [30, 110], [190, 10]],
    ['spiral-in', 'x', [30, 110], [30, 10]],
    ['spiral-in', 'y', [30, 110], [110, 110]],
    ['spiral-out', 'x', [30, 10], [30, 110]],
    ['spiral-out', 'y', [110, 110], [30, 110]],
  ])('uses actual %s / %s endpoints without moving the six grid dots', (scanPattern, scanDirection, start, end) => {
    const view = renderAppUI(<ProbeAreaDiagram {...grid} scanPattern={scanPattern} scanDirection={scanDirection} />);
    try {
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      expect(dots(diagram)).toHaveLength(6);
      expectPosition(marker(diagram, 'START'), ...start);
      expectPosition(marker(diagram, 'END'), ...end);
      expect(marker(diagram, 'END')).toHaveAttribute('fill', 'none');
    } finally {
      view.dispose();
    }
  });

  test('keeps a non-divisible last grid point short of the requested bound', () => {
    const view = renderAppUI(<ProbeAreaDiagram {...grid} endX={25} />);
    try {
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      expect(dots(diagram)).toHaveLength(6);
      expectPosition(marker(diagram, 'END'), 158, 10);
      expect(dots(diagram).map(dot => dot.getAttribute('cx'))).toEqual(['30', '30', '94', '94', '158', '158']);
    } finally {
      view.dispose();
    }
  });

  test('samples large axes by stride and retains the final real point', () => {
    const view = renderAppUI(
      <ProbeAreaDiagram
        {...grid} endX={25} stepX={1}
        endY={0}
      />,
    );
    try {
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      expect(dots(diagram)).toHaveLength(14);
      expectPosition(dots(diagram)[13], 190, 110);
      expectPosition(marker(diagram, 'END'), 190, 110);
    } finally {
      view.dispose();
    }
  });

  test('accepts zero-width axes and negative coordinates', () => {
    const view = renderAppUI(
      <ProbeAreaDiagram
        {...grid} startX={-10} endX={-10}
        startY={-20} endY={0}
      />,
    );
    try {
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      expect(dots(diagram)).toHaveLength(3);
      expectPosition(marker(diagram, 'START'), 30, 110);
      expectPosition(marker(diagram, 'END'), 30, 10);
    } finally {
      view.dispose();
    }
  });

  test.each([
    ['empty start', { startX: '' }],
    ['NaN coordinate', { startY: NaN }],
    ['infinite coordinate', { endX: Infinity }],
    ['inverted X bounds', { endX: -1 }],
    ['inverted Y bounds', { endY: -1 }],
    ['empty step', { stepX: '' }],
    ['whitespace coordinate', { startX: ' ' }],
    ['zero step', { stepY: 0 }],
    ['negative step', { stepX: -1 }],
    ['infinite step', { stepY: Infinity }],
  ])('hides dots and markers for %s and restores them when corrected', (_label, changes) => {
    const view = renderAppUI(<ProbeAreaDiagram {...grid} {...changes} />);
    try {
      const diagram = screen.getByRole('img', { name: 'Probe area diagram' });
      expect(diagram.querySelector('rect')).toBeInTheDocument();
      expect(dots(diagram)).toHaveLength(0);
      expect(within(diagram).queryByText('START')).not.toBeInTheDocument();
      expect(within(diagram).queryByText('END')).not.toBeInTheDocument();
      view.rerender(<ProbeAreaDiagram {...grid} />);
      expect(dots(diagram)).toHaveLength(6);
      expectPosition(marker(diagram, 'START'), 30, 110);
      expectPosition(marker(diagram, 'END'), 190, 10);
    } finally {
      view.dispose();
    }
  });

  test('counts the epsilon-corrected grid and reports zero for incomplete input', () => {
    expect(getScanPointCount({ ...grid, endX: 0.3, stepX: 0.1, endY: 0 })).toBe(4);
    expect(getScanPointCount({ ...grid, stepX: '' })).toBe(0);
    expect(getScanPointCount({ ...grid, endX: -1 })).toBe(0);
  });
});
