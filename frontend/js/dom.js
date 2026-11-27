/**
 * Utilitários de DOM e formatação.
 *
 * Todo conteúdo vindo da API é inserido como texto (textContent),
 * nunca como HTML, para evitar injeção de script (RNF19).
 */

export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    if (key === 'class') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  }

  appendChildren(element, children);
  return element;
}

function appendChildren(element, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    element.append(
      child instanceof Node ? child : document.createTextNode(String(child))
    );
  }
}

const numberFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function formatNumber(value) {
  return value === null || value === undefined ? '—' : numberFormat.format(value);
}

export function formatKwh(value) {
  return value === null || value === undefined ? '—' : `${numberFormat.format(value)} kWh`;
}

export function formatDateTime(isoText) {
  if (!isoText) {
    return '—';
  }
  const date = new Date(isoText);
  return Number.isNaN(date.getTime()) ? isoText : dateTimeFormat.format(date);
}

/** Converte AAAA-MM-DD em DD/MM/AAAA sem passar por fuso horário. */
export function formatDate(dayText) {
  if (!dayText || !/^\d{4}-\d{2}-\d{2}$/.test(dayText)) {
    return dayText ?? '—';
  }
  const [year, month, day] = dayText.split('-');
  return `${day}/${month}/${year}`;
}

const EQUIPMENT_TYPE_LABELS = Object.freeze({
  poste: 'Poste',
  predio_municipal: 'Prédio municipal',
});

export function equipmentTypeLabel(type) {
  return EQUIPMENT_TYPE_LABELS[type] ?? type;
}

const ANOMALY_LABELS = {
  falha_total: 'Falha total',
  consumo_acima: 'Consumo acima',
  consumo_abaixo: 'Consumo abaixo',
};

export function anomalyLabel(type) {
  return ANOMALY_LABELS[type] ?? type ?? '—';
}
