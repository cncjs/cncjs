import colornames from 'colornames';

const PALETTES = {
  light: {
    canvas: colornames('white'),
    canvasOpacity: 1,
    gridCenter: colornames('blue'),
    grid: colornames('gray 44'),
    axisX: colornames('red'),
    axisY: colornames('green'),
    axisZ: colornames('blue'),
    rapid: colornames('green'),
    cut: colornames('blue'),
    arc: colornames('deepskyblue'),
    done: colornames('lightgrey')
  },
  dark: {
    canvas: colornames('gray 22'),
    canvasOpacity: 0.3,
    gridCenter: '#4da3ff',
    grid: colornames('gray 44'),
    axisX: '#ff5252',
    axisY: '#4cd964',
    axisZ: '#4da3ff',
    rapid: '#3ddc84',
    cut: '#00ffff',
    arc: '#00f0ff',
    done: '#aaaaaa'
  }
};

export const getSceneThemeName = () => (
  document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light'
);

export const getScenePalette = (name) => PALETTES[name || getSceneThemeName()] || PALETTES.light;
