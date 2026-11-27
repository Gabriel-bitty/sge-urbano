// Mapa de ocorrências (Gestor) e de OS atribuídas (Técnico) com Leaflet (RF15, CT21)
import { api } from '../api.js';
import { h } from '../dom.js';
import { getUser } from '../session.js';
import { dataTable, pageHeader, statusBadge } from '../ui.js';

const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const SALVADOR = [-12.9714, -38.5014];

let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= new Promise((resolve) => {
    document.head.append(h('link', {
      rel: 'stylesheet',
      href: LEAFLET_CSS,
      integrity: 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==',
      crossorigin: 'anonymous',
    }));
    const script = h('script', {
      src: LEAFLET_JS,
      integrity: 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==',
      crossorigin: 'anonymous',
    });
    script.addEventListener('load', () => resolve(window.L));
    document.head.append(script);
  });
  return leafletPromise;
}

function markerTitle(marker) {
  return marker.source === 'work_order' ? `OS #${marker.workOrderId}` : `Ocorrência #${marker.occurrenceId}`;
}

function popupContent(marker) {
  return h('div', { class: 'map-popup', dataset: { cy: 'popup' } },
    h('strong', {}, markerTitle(marker)),
    h('p', {}, 'Tipo: ', marker.type),
    h('p', {}, 'Estado: ', marker.status),
    marker.equipmentId ? h('p', {}, `Equipamento #${marker.equipmentId}`) : null,
    marker.workOrderId ? h('a', { href: `#/os/${marker.workOrderId}` }, 'Abrir OS') : null);
}

export async function mapaView(container) {
  const user = getUser();
  const isManager = user.role === 'Gestor';
  const mapElement = h('div', { class: 'map', dataset: { cy: 'mapa' } }, h('p', { class: 'loading' }, 'Carregando mapa…'));
  const listArea = h('div');

  container.append(
    pageHeader('Mapa', isManager
      ? 'Ocorrências registradas pelos cidadãos. As coordenadas são simuladas.'
      : 'Locais das ordens de serviço atribuídas a você. As coordenadas são simuladas.'),
    mapElement,
    listArea
  );

  const { markers } = await api.get('/map');

  listArea.replaceChildren(
    h('h2', {}, isManager ? 'Ocorrências no mapa' : 'Minhas OS no mapa'),
    dataTable({
      cy: 'tabela-marcadores',
      rows: markers,
      emptyMessage: isManager ? 'Nenhuma ocorrência registrada.' : 'Nenhuma OS atribuída a você.',
      columns: [
        { label: 'Item', render: markerTitle },
        { label: 'Tipo', render: (m) => m.type },
        { label: 'Estado', render: (m) => statusBadge(m.status) },
        { label: 'Equipamento', render: (m) => (m.equipmentId ? `Equipamento #${m.equipmentId}` : '—') },
      ],
    })
  );

  const L = await loadLeaflet();
  if (!mapElement.isConnected) return;
  mapElement.replaceChildren();

  const map = L.map(mapElement).setView(SALVADOR, 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; colaboradores do OpenStreetMap',
  }).addTo(map);

  const points = [];
  for (const marker of markers) {
    if (marker.latitude === null || marker.longitude === null) continue;
    const point = [marker.latitude, marker.longitude];
    points.push(point);
    L.marker(point, { title: markerTitle(marker), alt: markerTitle(marker) })
      .bindPopup(popupContent(marker))
      .addTo(map);
  }

  if (points.length > 0) {
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }
}
