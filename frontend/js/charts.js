// Gráficos simples em SVG, sem biblioteca externa
import { formatDate, formatKwh } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Barras horizontais: consumo medido x esperado por grupo. */
export function horizontalBars(items, { label = 'Gráfico' } = {}) {
  const rowHeight = 46;
  const labelWidth = 150;
  const width = 640;
  const max = Math.max(1, ...items.flatMap((i) => [i.measured, i.expected]));
  const scale = (value) => ((width - labelWidth - 90) * value) / max;
  const root = svg('svg', {
    viewBox: `0 0 ${width} ${items.length * rowHeight + 10}`,
    role: 'img',
    'aria-label': label,
    class: 'chart',
  });

  items.forEach((item, index) => {
    const y = index * rowHeight + 6;
    root.append(
      svg('text', { x: 0, y: y + 20, class: 'chart-label' }, item.label),
      svg('rect', { x: labelWidth, y, width: scale(item.measured), height: 16, class: 'bar-measured' }),
      svg('text', { x: labelWidth + scale(item.measured) + 6, y: y + 13, class: 'chart-value' }, formatKwh(item.measured)),
      svg('rect', { x: labelWidth, y: y + 20, width: scale(item.expected), height: 10, class: 'bar-expected' }),
      svg('title', {}, `${item.label}: medido ${formatKwh(item.measured)}, esperado ${formatKwh(item.expected)}`)
    );
  });
  return root;
}

/** Colunas por dia para a tendência de consumo. */
export function columns(points, { label = 'Gráfico' } = {}) {
  const width = 640;
  const height = 200;
  const bottom = 24;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = width / Math.max(points.length, 1);
  const barWidth = Math.min(40, step * 0.6);
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label, class: 'chart' });

  root.append(svg('line', { x1: 0, x2: width, y1: height - bottom, y2: height - bottom, class: 'chart-axis' }));
  points.forEach((point, index) => {
    const barHeight = ((height - bottom - 16) * point.value) / max;
    const x = index * step + (step - barWidth) / 2;
    const bar = svg('rect', { x, y: height - bottom - barHeight, width: barWidth, height: barHeight, class: 'bar-measured' });
    bar.append(svg('title', {}, `${formatDate(point.date)}: ${formatKwh(point.value)}`));
    root.append(bar, svg('text', { x: x + barWidth / 2, y: height - 6, class: 'chart-label', 'text-anchor': 'middle' },
      formatDate(point.date).slice(0, 5)));
  });
  return root;
}
