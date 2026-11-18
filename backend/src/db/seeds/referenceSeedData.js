const FIXED_TIMESTAMP = '2026-11-18T12:00:00.000Z';

const REGIONS = Object.freeze([
  {
    id: 1,
    name: 'Centro Histórico',
    latitude: -12.9714,
    longitude: -38.5014,
  },
  {
    id: 2,
    name: 'Orla Atlântica',
    latitude: -13.0011,
    longitude: -38.4589,
  },
]);

const POLE_LOCATIONS = Object.freeze([
  ['Praça Municipal', -12.9710, -38.5010, 100],
  ['Rua Chile, ponto 1', -12.9712, -38.5012, 100],
  ['Rua Chile, ponto 2', -12.9716, -38.5015, 80],
  ['Largo do Terreiro, norte', -12.9720, -38.5020, 90],
  ['Largo do Terreiro, sul', -12.9722, -38.5022, 90],
  ['Praça da Sé', -12.9726, -38.5030, 100],
  ['Avenida Sete', -12.9730, -38.5035, 80],
  ['Campo Grande', -12.9740, -38.5050, 100],
  ['Avenida Oceânica, ponto 1', -13.0000, -38.4590, 100],
  ['Avenida Oceânica, ponto 2', -13.0005, -38.4585, 100],
  ['Jardim de Alah', -13.0030, -38.4610, 80],
  ['Costa Azul, ponto 1', -13.0060, -38.4630, 90],
  ['Costa Azul, ponto 2', -13.0070, -38.4640, 90],
  ['Armação, ponto 1', -13.0090, -38.4660, 80],
  ['Armação, ponto 2', -13.0100, -38.4670, 100],
]);

const MUNICIPAL_BUILDING_LOCATIONS = Object.freeze([
  ['Escola Municipal Centro', -12.9705, -38.5005, 1, 500],
  ['Unidade de Saúde Centro', -12.9735, -38.5040, 1, 650],
  ['Escola Municipal Orla', -13.0020, -38.4600, 2, 500],
  ['Centro Administrativo Orla', -13.0040, -38.4620, 2, 700],
  ['Biblioteca Municipal Orla', -13.0080, -38.4650, 2, 450],
]);

const EQUIPMENTS = Object.freeze([
  ...POLE_LOCATIONS.map(
    ([location, latitude, longitude, expectedConsumption], index) => ({
      id: index + 1,
      region_id: index < 8 ? 1 : 2,
      type: 'poste',
      location,
      expected_consumption_kwh: expectedConsumption,
      latitude,
      longitude,
    })
  ),
  ...MUNICIPAL_BUILDING_LOCATIONS.map(
    ([location, latitude, longitude, regionId, expectedConsumption], index) => ({
      id: POLE_LOCATIONS.length + index + 1,
      region_id: regionId,
      type: 'predio_municipal',
      location,
      expected_consumption_kwh: expectedConsumption,
      latitude,
      longitude,
    })
  ),
]);

module.exports = {
  EQUIPMENTS,
  FIXED_TIMESTAMP,
  REGIONS,
};
