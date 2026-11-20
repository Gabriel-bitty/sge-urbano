# Matriz de rastreabilidade — SGE-Urbano

Esta matriz liga requisitos da A3 ao backend atual. Ela não substitui os PDFs
originais e não declara teste executado sem evidência real.

## Legenda

- **Implementado:** código e contrato existem; há smoke check ou inspeção técnica
  quando indicado.
- **Parcial:** parte backend implementada; depende de frontend, QA ou integração
  externa.
- **Pendente QA:** evidência oficial ainda pertence a Tiago Maciel.
- **Pendente frontend:** comportamento visual ou de interface pertence a João
  Anísio.
- **Não aplicável ao backend:** requisito não implementado nesta camada.

## 1. Requisitos funcionais

| ID | Evidência no backend | RNs/UC/CA | CT | Estado |
|---|---|---|---|---|
| RF01 | `authRoutes.js`, `authService.js`, `sqliteSessionStore.js` | RN01, RN30; UC01; CA01.1–01.3 | CT01 | Implementado; pendente execução oficial de QA. |
| RF02 | `authentication.js`, `authorization.js`, filtros por perfil em OS/mapa | RN01, RN15; UC01; CA02.1–02.2 | CT01, CT10 | Implementado. |
| RF03 | `regionRoutes.js`, `regionService.js` | RN04, RN20; UC02; CA03.1–03.3 | CT02 | Implementado, incluindo cascata auditada. |
| RF04 | `equipmentRoutes.js`, `equipmentService.js` | RN02–RN04; UC03; CA04.1–04.3 | CT03 | Implementado. |
| RF05 | `simulationRoutes.js`, `simulationService.js`, `leituraRepository.js` | RN04–RN05, RN24; UC04; CA05.1–05.3 | CT04, CT24 | Implementado; falha controlada/RNF03 parcial. |
| RF06 | `rules/anomalia.js` | RN06, RN28; UC05; CA06.1–06.8 | CT05–CT06 | Implementado; cobertura oficial pendente. |
| RF07 | `alertService.js`, `alertaRepository.js` | RN06–RN08; UC05; CA07.1–07.3 | CT05–CT07 | Implementado. |
| RF08 | `alertRoutes.js`, `alertaRepository.js` | RN08; UC06; CA08.1–08.2 | CT08 | Implementado; apresentação visual pendente. |
| RF09 | `workOrderRoutes.js`, `workOrderService.js`, `osRepository.js` | RN09–RN10, RN19; UC07; CA09.1–09.3 | CT09 | Implementado para alerta, ocorrência e manual. |
| RF10 | atribuição/reatribuição em `workOrderService.js` | RN11, RN21; UC08; CA10.1–10.3 | CT10 | Implementado com privacidade. |
| RF11 | `start`/`complete` em `workOrderService.js` | RN10, RN12, RN18; UC09; CA11.1–11.5 | CT11 | Implementado; auditoria no fluxo real. |
| RF12 | `occurrenceRoutes.js`, `occurrenceService.js` | RN13, RN22–RN23, RN26; UC10; CA12.1–12.3 | CT13 | Implementado; contagem visual de interações pendente. |
| RF13 | `GET /api/occurrences/:protocol` | RN22, RN26; UC11; CA13.1 | CT14 | Implementado; somente status/tipo. |
| RF14 | `dashboardRoutes.js`, `dashboardService.js` | RNF11, RNF17; UC12; CA14.1–14.3 | CT15 | Implementado; desempenho oficial pendente. |
| RF15 | `mapRoutes.js`, `mapService.js` | RN15, RN29; UC13; CA15.1–15.3 | CT21 | Implementado; Leaflet/interface pendente. |
| RF16 | `reportRoutes.js`, `reportService.js` | RN24; UC14; CA16.1–16.3 | CT16 | Implementado; total explícito no CSV. |
| RF17 | `blockingRoutes.js`, `blockingService.js` | RN16–RN17, RN27; UC15; CA17.1–17.13 | CT18–CT20 | Implementado com cascata/auditoria. |
| RF18 | `cancel` em `workOrderService.js` | RN10, RN21, RN25; UC16; CA18.1–18.3 | CT12 | Implementado; alerta permanece Ativo. |

## 2. Requisitos não funcionais

| ID | Evidência/pendência | CT | Estado |
|---|---|---|---|
| RNF01 | `rules/anomalia.js` é determinístico e puro. | CT05–CT06 | Implementado; cobertura oficial pendente. |
| RNF02 | SQLite persistente; FKs e histórico de alertas/ocorrências/OS. | CT17 | Implementado; reinício oficial pendente. |
| RNF03 | Erro deve preservar dados e ser registrado. Não há contrato definido de formato/destino de log. | CT04 | Parcial. |
| RNF04 | `passwordService.js`, `scrypt`, sal aleatório. | CT01 | Implementado. |
| RNF05 | Autenticação e autorização server-side por rota. | CT01, CT10, CT18 | Implementado. |
| RNF06 | Store SQLite e expiração de 30 minutos. | CT01 | Implementado. |
| RNF07 | Consulta pública mínima; Gestor recebe dados da ocorrência vinculada; Técnico não. | CT10, CT14 | Implementado. |
| RNF08 | Registro em até 3 interações. | CT13 | Pendente frontend/QA. |
| RNF09 | Erros backend informam campo/motivo; cor de severidade é visual. | CT03, CT08, CT13 | Parcial. |
| RNF10 | Mensagens backend em pt-BR; interface precisa inspeção. | CT13, CT23 | Parcial. |
| RNF11 | Agregações do dashboard. | CT15 | Implementado; limite de 3s pendente QA. |
| RNF12 | Regra de anomalia isolada em `rules/`. | CT06 | Implementado. |
| RNF13 | Parâmetros persistidos em `anomaly_parameters`. | CT06 | Implementado. |
| RNF14 | Histórico Git e contribuição de integrantes. | CT25 | Evidência externa ao backend. |
| RNF15 | README de execução; compatibilidade de navegadores. | CT22 | Parcial; navegadores pendentes. |
| RNF16 | Eventos reais de login, acesso negado, bloqueio e OS em `audit_logs`. | CT01, CT11–CT12, CT19–CT20 | Implementado; QA deve consultar eventos. |
| RNF17 | Leituras usam `SIMULADO`; aviso visual permanente é frontend. | CT04, CT24 | Parcial. |
| RNF18 | `routes → services → repositories`; SQL restrito. | CT06 | Implementado. |
| RNF19 | Validação server-side e SQL parametrizado. | CT03, CT26 | Implementado; hardening oficial pendente. |
| RNF20 | `/api/test/reset` montado somente em teste. | CT26 | Implementado; execução oficial pendente. |

## 3. Regras de negócio

| Grupo | Evidência |
|---|---|
| RN01 | Perfis `Gestor`, `Técnico`; Cidadão sem login. |
| RN02–RN04 | Integridade região/equipamento; consumo positivo; inativação/cascata. |
| RN05–RN07 | `simulationService.js` e `rules/anomalia.js`. |
| RN08 | Índice único parcial e atualização de alerta. |
| RN09–RN12 | Serviço de OS, permissões e estados. |
| RN13–RN15 | Serviço de ocorrência e filtros de privacidade. |
| RN16–RN17 | Bloqueio transacional, alertas suspensos, restauração. |
| RN18 | Conclusão de OS resolve alerta. |
| RN19 | Índice único parcial de OS ativa por alerta. |
| RN20 | Inativação de região em cascata com evento. |
| RN21 | Reatribuição/cancelamento exclusivos de Gestor. |
| RN22–RN23 | Protocolo público e cinco tipos controlados. |
| RN24–RN25 | Leitura em `kWh`; cancelamento não resolve alerta. |
| RN26 | Formato/data/alfabeto do protocolo e resposta pública mínima. |
| RN27 | Bloqueio regional em cascata. |
| RN28 | Desvio percentual em regra pura. |
| RN29 | Coordenadas simuladas armazenadas e expostas pelo mapa. |
| RN30 | Sessão server-side SQLite. |

## 4. Casos de uso

| UC | Endpoint/serviço |
|---|---|
| UC01 | `/api/auth/login`, `/logout`, `/session` |
| UC02 | `/api/regions` e ações de bloqueio |
| UC03 | `/api/equipments` e ações de bloqueio |
| UC04 | `/api/simulations` |
| UC05–UC06 | processamento e consulta `/api/alerts` |
| UC07–UC09 | criação/transições de `/api/work-orders` |
| UC10–UC11 | `/api/occurrences` e consulta por protocolo |
| UC12 | `/api/dashboard` |
| UC13 | `/api/map` |
| UC14 | `/api/reports` e `/api/reports.csv` |
| UC15 | bloqueio/desbloqueio |
| UC16 | `/api/work-orders/:id/cancel` |

## 5. Critérios de aceitação

| Faixa | Evidência primária | Observação |
|---|---|---|
| CA01–CA02 | auth/authz + auditoria | Implementado; QA. |
| CA03–CA04 | cadastros e inativação | Implementado. |
| CA05 | simulação | `SIMULADO`, elegibilidade e cenários. |
| CA06–CA08 | anomalia e alertas | Lógica implementada; UI pendente. |
| CA09–CA11 | OS | Transições, solução, auditoria e privacidade. |
| CA12–CA13 | ocorrências | Registro/protocolo mínimo. |
| CA14 | dashboard | Backend implementado; UI/desempenho pendentes. |
| CA15 | mapa | Backend autorizado; visual/Leaflet pendente. |
| CA16 | relatório/CSV | Totais explicitamente equivalentes. |
| CA17 | bloqueio | Backend transacional/auditado. |
| CA18 | cancelamento | Estado e preservação do alerta. |

## 6. Casos de teste

| Caso | Estado atual no backend | Evidência oficial |
|---|---|---|
| CT01 | Smoke check técnico realizado em sessões/autorização. | Pendente Tiago. |
| CT02–CT03 | Cadastro e cascata implementados. | Pendente Tiago. |
| CT04 | Cenários implementados; RNF03 ainda sem contrato de log. | Pendente Tiago. |
| CT05–CT06 | Regra pura implementada; vetores previstos. | Pendente Tiago/nyc. |
| CT07–CT08 | Atualização sem duplicação e filtros. | Pendente Tiago; UI no frontend. |
| CT09–CT12 | OS e auditoria implementadas; smoke checks executados. | Pendente Tiago. |
| CT13–CT14 | Registro/consulta pública e privacidade. | Pendente Tiago. |
| CT15 | Dashboard inspecionado e smoke check HTTP. | Pendente medição ≤ 3s. |
| CT16 | Reconciliação JSON/CSV e linha TOTAL verificadas por smoke check. | Pendente execução oficial. |
| CT17 | Preservação por schema e gatilhos. | Reinício oficial pendente. |
| CT18–CT20 | Bloqueio/cascata implementados. | Pendente Tiago. |
| CT21 | Dados e perfis do mapa implementados. | Visual/frontend pendente. |
| CT22–CT23 | Compatibilidade/idioma de interface. | Fora do backend. |
| CT24 | Origem `SIMULADO`; aviso visual. | Backend implementado; UI pendente. |
| CT25 | Commits/equipe. | Evidência GitHub. |
| CT26 | Reset ausente fora de teste e seed em teste. | Smoke check; execução oficial pendente. |

## 7. Arquivos de referência

- `docs/architecture/overview.md`;
- `docs/architecture/api-contracts.md`;
- `docs/architecture/database-er-diagram.md`;
- `docs/architecture/data-dictionary.md`;
- `docs/open-decisions.md`;
- `backend/src/db/migrations/`;
- `backend/src/routes/`;
- `backend/src/services/`;
- `backend/src/repositories/`;
- `backend/src/rules/`.
