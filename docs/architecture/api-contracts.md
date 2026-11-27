# Contratos da API REST — SGE-Urbano

Este documento consolida os contratos implementados nas Etapas 12 a 15. Ele
serve como handoff de integração para João Anísio e de automação para Tiago
Maciel. As rotas descritas refletem o backend atual.

## 1. Convenções

- Base URL: `/api`.
- Conteúdo: `application/json`; CSV em `GET /api/reports.csv`.
- Sessão: cookie `HttpOnly` `sge.sid`, criado no login e expirado após 30 minutos
  de inatividade.
- Perfis autenticáveis: `Gestor` e `Técnico`.
- `Cidadão` não possui sessão; usa apenas registro/consulta pública de ocorrência.
- Leituras: `origin = "SIMULADO"` e `unit = "kWh"`.

Erro de validação:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Um ou mais campos são inválidos.",
  "fields": {
    "campo": "Motivo da recusa."
  }
}
```

Erros comuns:

| Status | Código | Uso |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Tipo, formato, limite, campo extra ou transição inválida |
| 400 | `INVALID_JSON` | Corpo JSON inválido |
| 401 | `AUTHENTICATION_REQUIRED` | Sessão ausente, inválida ou expirada |
| 401 | `INVALID_CREDENTIALS` | Login inválido |
| 403 | `FORBIDDEN` | Perfil ou usuário sem autorização |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` | Violação de unicidade |
| 413 | `PAYLOAD_TOO_LARGE` | Corpo acima do limite Express |
| 500 | `INTERNAL_SERVER_ERROR` | Erro não tratado |

## 2. Autenticação

### `POST /api/auth/login`

Público. Corpo:

```json
{
  "username": "gestor.teste",
  "password": "TesteSGE!2026"
}
```

Sucesso `200`:

```json
{
  "user": {
    "id": 1,
    "name": "Gestor de Teste",
    "username": "gestor.teste",
    "role": "Gestor",
    "status": "Ativo"
  }
}
```

A resposta também estabelece o cookie de sessão. Falhas de login não criam
sessão e geram evento `auth.login.failed`.

### `POST /api/auth/logout`

Autenticado. Sucesso `204`. Destrói a sessão, limpa o cookie e registra
`auth.logout`.

### `GET /api/auth/session`

Autenticado. Sucesso `200`:

```json
{
  "user": {
    "id": 1,
    "name": "Gestor de Teste",
    "username": "gestor.teste",
    "role": "Gestor",
    "status": "Ativo"
  }
}
```

## 3. Regiões

Todas exigem `Gestor`.

### `GET /api/regions`

Sucesso `200`: array de:

```json
{
  "id": 1,
  "name": "Centro Histórico",
  "latitude": -12.9714,
  "longitude": -38.5014,
  "status": "Ativo",
  "createdAt": "2026-11-18T12:00:00.000Z",
  "updatedAt": "2026-11-18T12:00:00.000Z"
}
```

### `GET /api/regions/:id`

Mesmo objeto; `404` quando inexistente.

### `POST /api/regions`

Corpo:

```json
{
  "name": "Nova Região",
  "latitude": -12.97,
  "longitude": -38.5
}
```

Sucesso `201`. Nome com pelo menos 2 caracteres; coordenadas finitas nos limites
geográficos.

### `PATCH /api/regions/:id`

Aceita um ou mais de `name`, `latitude`, `longitude` e `status`; `status` aceita
somente `Inativo`. Ao inativar, equipamentos ativos são inativados em cascata e
`region.inactivated` é registrado.

## 4. Equipamentos

Todas exigem `Gestor`.

### `GET /api/equipments`

Sucesso `200`: array de:

```json
{
  "id": 1,
  "regionId": 1,
  "regionName": "Centro Histórico",
  "type": "poste",
  "location": "Praça Municipal",
  "expectedConsumptionKwh": 100,
  "latitude": -12.971,
  "longitude": -38.501,
  "status": "Ativo",
  "createdAt": "2026-11-18T12:00:00.000Z",
  "updatedAt": "2026-11-18T12:00:00.000Z"
}
```

### `GET /api/equipments/:id`

Mesmo objeto; `404` quando inexistente.

### `POST /api/equipments`

Corpo:

```json
{
  "regionId": 1,
  "type": "poste",
  "location": "Praça Municipal",
  "expectedConsumptionKwh": 100,
  "latitude": -12.971,
  "longitude": -38.501
}
```

`regionId` deve indicar região ativa; `type` é `poste` ou
`predio_municipal`; localização tem 3–200 caracteres; consumo deve ser maior que
zero.

### `PATCH /api/equipments/:id`

Aceita os campos da criação. `status` aceita somente `Inativo`.

## 5. Bloqueio

Todas exigem `Gestor`.

| Rota | Corpo | Sucesso |
|---|---|---|
| `POST /api/regions/:id/block` | `{ "reason": "..." }` | 200 |
| `POST /api/regions/:id/unblock` | sem campos | 200 |
| `POST /api/equipments/:id/block` | `{ "reason": "..." }` | 200 |
| `POST /api/equipments/:id/unblock` | sem campos | 200 |

Regras:

- somente alvo `Ativo` pode ser bloqueado;
- motivo após `trim` tem pelo menos 10 caracteres;
- bloqueio de região afeta equipamentos `Ativo` e suspende alertas;
- desbloqueio regional restaura somente os equipamentos registrados na cascata;
- cada operação registra `region.blocked`, `region.unblocked`,
  `equipment.blocked` ou `equipment.unblocked`.

## 6. Simulação e alertas

### `POST /api/simulations`

Exclusivo `Gestor`. Corpo:

```json
{
  "scenario": "normal",
  "injectError": false
}
```

Valores de `scenario`:

- `normal`: consumo esperado;
- `pico`: `E × 1,5`;
- `falha`: zero.

`injectError` é opcional e só pode ser enviado em `NODE_ENV=test`. Quando
`injectError: true`, a API:

1. inicia a transação;
2. processa uma leitura/alerta quando houver equipamento elegível;
3. registra no log técnico estruturado do processo uma entrada `ERROR` com
   `operation`, `correlationId`, `batchId`, `scenario`, `actorUserId`,
   `occurredAt` e `message`;
4. lança a falha, executa rollback e retorna `500`.

Leituras e alertas criados nessa tentativa não permanecem, enquanto os dados de
lotes anteriores continuam disponíveis. Fora do ambiente de teste,
`injectError` é recusado com `400` e não há efeito no gerador.

Somente regiões/equipamentos ativos participam. Sucesso `201`:

```json
{
  "batchId": "uuid",
  "scenario": "pico",
  "seed": 42,
  "readingCount": 20,
  "alertCount": 20,
  "readings": []
}
```

Cada leitura usa `origin: "SIMULADO"` e `unit: "kWh"`. A gravação da leitura e o
processamento do alerta compartilham a mesma transação.

### `GET /api/alerts`

Exclusivo `Gestor`. Filtros opcionais:

- `severity`: `Baixa`, `Média`, `Alta`;
- `status`: `Ativo`, `Suspenso`, `Resolvido`;
- `regionId`;
- `equipmentId`;
- `equipmentType`: `poste`, `predio_municipal`.

Sucesso `200`:

```json
{
  "count": 1,
  "alerts": []
}
```

O alerta ativo do mesmo equipamento/tipo é atualizado sem duplicação.

## 7. Ordens de serviço

### `GET /api/work-orders`

Gestor vê todas; Técnico vê somente as atribuídas a ele. Filtros:

- `status`;
- `regionId`;
- `equipmentId`;
- `assignedTechnicianId`;
- `alertId`;
- `occurrenceId`;
- `from`;
- `to`;
- `equipmentType`.

### `GET /api/work-orders/:id`

Gestor ou Técnico atribuído. O Gestor pode receber `occurrence` com dados
pessoais; o Técnico não recebe esse objeto.

### `POST /api/work-orders`

Exclusivo `Gestor`. Origens:

```json
{ "origin": "alerta", "alertId": 1 }
```

```json
{ "origin": "cidadao", "occurrenceId": 5 }
```

```json
{
  "origin": "manual",
  "regionId": 1,
  "equipmentId": 1,
  "location": "Praça Municipal",
  "description": "Inspeção preventiva"
}
```

Sucesso `201`, estado `Aberta`, código `OS-AAAA-NNNNNN`.

### Ações de OS

| Rota | Acesso | Corpo | Transição |
|---|---|---|---|
| `POST /api/work-orders/:id/assign` | Gestor | `{ "technicianId": 2 }` | Aberta → Atribuída |
| `POST /api/work-orders/:id/reassign` | Gestor | `{ "technicianId": 3 }` | Atribuída → Atribuída |
| `POST /api/work-orders/:id/start` | Técnico atribuído | vazio | Atribuída → Em atendimento |
| `POST /api/work-orders/:id/complete` | Técnico atribuído ou Gestor | `{ "solution": "..." }` | Em atendimento → Concluída |
| `POST /api/work-orders/:id/cancel` | Gestor | `{ "reason": "..." }` | Aberta/Atribuída → Cancelada |

Conclusão resolve o alerta vinculado. Cancelamento preserva alerta ativo.
Transições registram `work_order.created`, `assigned`, `reassigned`, `started`,
`completed`, `cancelled` ou `*.denied`.

## 8. Ocorrências públicas

### `POST /api/occurrences`

Público. Corpo:

```json
{
  "citizenName": "Cidadão Teste",
  "citizenEmail": "cidadao@teste.invalid",
  "citizenPhone": "71999990000",
  "citizenCpfSimulated": null,
  "type": "poste apagado",
  "description": "Poste apagado",
  "regionId": 1,
  "equipmentId": 1,
  "addressReference": "Praça Municipal, 15"
}
```

É necessário telefone com pelo menos 8 caracteres ou CPF simulado com pelo
menos 11. `equipmentId` é opcional.

Tipos:

- `poste apagado`;
- `oscilação de energia`;
- `falta de energia`;
- `prédio público com consumo anormal`;
- `iluminação acesa durante o dia`.

Sucesso `201`:

```json
{
  "id": 1,
  "protocol": "PROTOCOLO-20261120-A2F7",
  "type": "poste apagado",
  "status": "Aberta",
  "createdAt": "2026-11-20T15:00:00.000Z"
}
```

### `GET /api/occurrences/:protocol`

Público. O protocolo é normalizado para maiúsculas. Sucesso `200`:

```json
{
  "status": "Aberta",
  "type": "poste apagado"
}
```

Nenhum dado pessoal é retornado.

## 9. Dashboard

### `GET /api/dashboard`

Exclusivo `Gestor`. Filtros:

- `from` e `to`: `AAAA-MM-DD`;
- `regionId`;
- `equipmentType`.

O mês corrente é usado quando as datas são omitidas. Resposta:

- `period`;
- `filters`;
- `empty`;
- `cards`;
- `consumptionByRegion`;
- `consumptionTrend`;
- `recentAlerts`;
- `pendingWorkOrders`.

## 10. Relatórios

### `GET /api/reports`

Exclusivo `Gestor`. Requer:

- `from`;
- `to`;
- `groupBy`: `region` ou `equipmentType`;
- `granularity`: `day` ou `month`.

O retorno contém `rows` e:

```json
{
  "totals": {
    "readingCount": 20,
    "measuredConsumptionKwh": 3000,
    "expectedConsumptionKwh": 2000
  }
}
```

### `GET /api/reports.csv`

Mesmos filtros e autorização. Retorna `text/csv; charset=utf-8`, com as linhas
do JSON e uma linha final `TOTAL` com os mesmos valores consolidados.

## 11. Mapa

### `GET /api/map`

Gestor e Técnico.

- Gestor: marcadores das ocorrências.
- Técnico: somente marcadores das OS atribuídas.

Marcador:

```json
{
  "id": "occurrence:5",
  "source": "occurrence",
  "occurrenceId": 5,
  "workOrderId": null,
  "type": "poste apagado",
  "status": "Aberta",
  "equipmentId": 1,
  "latitude": -12.971,
  "longitude": -38.501
}
```

Dados pessoais não são incluídos.

## 12. Reset de teste

### `POST /api/test/reset`

Registrado somente com `NODE_ENV=test`. Corpo vazio. Sucesso `200` com a contagem
da massa restaurada. Fora do ambiente de teste, a rota não existe.

## 13. Evidências esperadas para QA

Tiago deve executar e reportar, sem reutilizar esta documentação como prova de
execução:

- autenticação e RBAC;
- cascatas e atomicidade;
- filtros e períodos;
- transições de OS e auditoria;
- privacidade pública/perfil;
- equivalência JSON/CSV;
- persistência após reinício;
- isolamento do reset;
- cobertura e desempenho do dashboard.
