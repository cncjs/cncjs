import React from 'react';
import { screen, within } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import ScanPatternPreview from '../ScanPatternPreview';

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

test('shows accessible selected glyphs and dashed rapid moves for the chosen direction', () => {
  const view = renderAppUI(<ScanPatternPreview scanPattern="raster" scanDirection="x" />);
  try {
    const group = screen.getByRole('group', { name: 'Scan pattern preview' });
    const raster = within(group).getByRole('img', { name: 'Raster' });
    const zigzag = within(group).getByRole('img', { name: 'Zigzag' });
    expect(within(group).getAllByRole('img')).toHaveLength(4);
    expect(raster).toHaveAttribute('data-selected', '');
    expect(zigzag).not.toHaveAttribute('data-selected');
    const rasterSvg = raster.querySelector('svg');
    expect(rasterSvg).toHaveAttribute('width', '56');
    expect(rasterSvg).toHaveAttribute('height', '40');
    expect(rasterSvg).toHaveAttribute('aria-hidden', 'true');
    expect(rasterSvg.querySelectorAll('line[stroke-dasharray="2 2"]')).toHaveLength(2);
    expect(zigzag.querySelectorAll('line')).toHaveLength(0);
    const firstSweep = rasterSvg.querySelector('polyline').getAttribute('points');

    view.rerender(<ScanPatternPreview scanPattern="spiral-in" scanDirection="y" />);
    expect(raster).not.toHaveAttribute('data-selected');
    expect(within(group).getByRole('img', { name: 'Spiral In' })).toHaveAttribute('data-selected', '');
    expect(rasterSvg.querySelectorAll('line[stroke-dasharray="2 2"]')).toHaveLength(3);
    expect(rasterSvg.querySelector('polyline').getAttribute('points')).not.toBe(firstSweep);
  } finally {
    view.dispose();
  }
});
