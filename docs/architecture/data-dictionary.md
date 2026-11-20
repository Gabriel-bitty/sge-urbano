# Dicionário de dados — SGE-Urbano

Fonte: migrações SQLite vigentes em `backend/src/db/migrations/` e tabela
`schema_migrations` criada por `backend/src/db/migrate.js`.

Datas são strings ISO 8601. Ausência de `NULL` é indicada na coluna “Nulo”.

## 1. `schema_migrations`

Controla as migrações já aplicadas (RNF02, RNF18).

| Coluna | Tipo | Nulo | Chave/default | Descrição |
|---|---|---|---|---|
| `version` | TEXT | Não | PK | Nome do arquivo de migração. |
| `applied_at` | TEXT | Não | — | Data/hora ISO 8601 da aplicação. |

## 2. `anomaly_parameters`

Parâmetros configuráveis da detecção (RF06, RF07, RN06, RN07, RNF13).

| Coluna | Tipo | Nulo | Chave/restrição | Descrição |
|---|---|---|---|---|
| `name` | TEXT | Não | PK; lista controlada | Nome do parâmetro. |
| `value` | REAL | Não | `>= 0` | Valor numérico vigente. |

Nomes permitidos:

- `LIM_SUP`;
- `LIM_INF`;
- `TOL_ZERO`;
- `FAIXA_BAIXA`;
- `FAIXA_MEDIA`;
- `FAIXA_ALTA`.

## 3. `users`

Contas autenticáveis; o Cidadão não possui cadastro (RF01, RF02, RN01, RN22).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `name` | TEXT | Não | `trim(name) >= 2` | Nome público. |
| `username` | TEXT | Não | UNIQUE; `trim(username) >= 3` | Login. |
| `password_hash` | TEXT | Não | hash `scrypt` | Hash e parâmetros da senha. |
| `role` | TEXT | Não | `Gestor` ou `Técnico` | Perfil de autorização. |
| `status` | TEXT | Não | default `Ativo`; `Ativo` ou `Inativo` | Situação. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Última atualização. |

## 4. `sessions`

Sessões server-side e expiração por inatividade (RF01, RN30, RNF05, RNF06).

| Coluna | Tipo | Nulo | Chave/restrição | Descrição |
|---|---|---|---|---|
| `id` | TEXT | Não | PK | Identificador da sessão. |
| `user_id` | INTEGER | Não | FK `users.id`, RESTRICT | Usuário autenticado. |
| `session_data` | TEXT | Não | default `{}` | Payload persistido por `express-session`. |
| `created_at` | TEXT | Não | — | Criação da sessão. |
| `last_activity_at` | TEXT | Não | — | Última atividade. |
| `expires_at` | TEXT | Não | — | Expiração prevista. |
| `revoked_at` | TEXT | Sim | — | Revogação lógica. |

Índices: `idx_sessions_user_id`, `idx_sessions_expires_at`.

## 5. `regions`

Regiões urbanas monitoradas (RF03, RN04, RN20, RN29).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `name` | TEXT | Não | UNIQUE; `trim(name) >= 2` | Nome da região. |
| `latitude` | REAL | Não | `-90..90` | Coordenada simulada. |
| `longitude` | REAL | Não | `-180..180` | Coordenada simulada. |
| `status` | TEXT | Não | default `Ativo`; `Ativo`, `Inativo`, `Bloqueado` | Estado. |
| `previous_status` | TEXT | Sim | `Ativo` ou `Inativo` | Estado antes do bloqueio. |
| `block_reason` | TEXT | Sim | `trim >= 10` quando informado | Motivo do bloqueio. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Última atualização. |

## 6. `equipments`

Postes e prédios municipais (RF04, RN02–RN04).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `region_id` | INTEGER | Não | FK `regions.id`, RESTRICT | Região vinculada. |
| `type` | TEXT | Não | `poste` ou `predio_municipal` | Tipo. |
| `location` | TEXT | Não | 3–200 caracteres após `trim` | Localização. |
| `expected_consumption_kwh` | REAL | Não | `> 0` | Consumo esperado E. |
| `latitude` | REAL | Não | `-90..90` | Coordenada simulada. |
| `longitude` | REAL | Não | `-180..180` | Coordenada simulada. |
| `status` | TEXT | Não | default `Ativo`; três estados | Estado. |
| `previous_status` | TEXT | Sim | `Ativo` ou `Inativo` | Estado anterior ao bloqueio. |
| `block_reason` | TEXT | Sim | `trim >= 10` quando informado | Motivo. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Última atualização. |

Índices: `idx_equipments_region_id`, `idx_equipments_status`.

## 7. `readings`

Histórico de leituras simuladas (RF05, RN05, RN24, RNF17).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `equipment_id` | INTEGER | Não | FK `equipments.id`, RESTRICT | Equipamento medido. |
| `batch_id` | TEXT | Sim | — | Identificador do lote. |
| `scenario` | TEXT | Não | `normal`, `pico`, `falha` | Cenário. |
| `measured_consumption_kwh` | REAL | Não | `>= 0` | Consumo medido. |
| `expected_consumption_kwh` | REAL | Não | `> 0` | Consumo esperado. |
| `deviation_percent` | REAL | Não | — | Desvio percentual RN28. |
| `is_anomaly` | INTEGER | Não | default 0; 0 ou 1 | Indicador. |
| `anomaly_type` | TEXT | Sim | três tipos controlados | Tipo detectado. |
| `severity` | TEXT | Sim | `Baixa`, `Média`, `Alta` | Severidade. |
| `unit` | TEXT | Não | default/constraint `kWh` | Unidade. |
| `origin` | TEXT | Não | default/constraint `SIMULADO` | Transparência. |
| `recorded_at` | TEXT | Não | — | Data/hora da leitura. |

Índices: `idx_readings_equipment_id`, `idx_readings_recorded_at`.

## 8. `alerts`

Alertas ativos, suspensos ou resolvidos (RF07, RF08, RN07, RN08, RN14).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `equipment_id` | INTEGER | Não | FK `equipments.id`, RESTRICT | Equipamento. |
| `region_id` | INTEGER | Não | FK `regions.id`, RESTRICT | Região desnormalizada para filtro. |
| `last_reading_id` | INTEGER | Não | FK `readings.id`, RESTRICT | Última leitura do alerta. |
| `anomaly_type` | TEXT | Não | três tipos controlados | Tipo. |
| `severity` | TEXT | Não | `Baixa`, `Média`, `Alta` | Severidade. |
| `measured_consumption_kwh` | REAL | Não | — | Valor medido. |
| `expected_consumption_kwh` | REAL | Não | `> 0` | Valor esperado. |
| `deviation_percent` | REAL | Não | — | Desvio. |
| `status` | TEXT | Não | default `Ativo` | Estado. |
| `occurrence_count` | INTEGER | Não | default 1; `>= 1` | Atualizações acumuladas. |
| `message` | TEXT | Não | — | Mensagem operacional. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Atualização. |
| `resolved_at` | TEXT | Sim | — | Resolução. |

Índice único parcial: `idx_alerts_active_equipment_type` sobre
`(equipment_id, anomaly_type)` quando `status IN ('Ativo', 'Suspenso')`.

Índice de filtros: `idx_alerts_filters`.

## 9. `occurrences`

Ocorrências públicas (RF12, RF13, RN13, RN15, RN22, RN23, RN26).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `protocol` | TEXT | Não | UNIQUE; `trim >= 10` | Protocolo público. |
| `citizen_name` | TEXT | Não | `trim >= 2` | Dado pessoal. |
| `citizen_email` | TEXT | Não | — | Dado pessoal. |
| `citizen_phone` | TEXT | Sim | `trim >= 8` quando usado | Contato. |
| `citizen_cpf_simulated` | TEXT | Sim | `trim >= 11` quando usado | CPF sintético. |
| `type` | TEXT | Não | cinco tipos da RN23 | Tipo. |
| `description` | TEXT | Não | `trim >= 3` | Descrição. |
| `region_id` | INTEGER | Não | FK `regions.id`, RESTRICT | Região. |
| `equipment_id` | INTEGER | Sim | FK `equipments.id`, RESTRICT | Equipamento opcional. |
| `address_reference` | TEXT | Não | `trim >= 3` | Endereço/ponto. |
| `latitude` | REAL | Não | `-90..90` | Coordenada do marcador. |
| `longitude` | REAL | Não | `-180..180` | Coordenada do marcador. |
| `status` | TEXT | Não | default `Aberta`; ciclo da OS | Estado. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Atualização. |

CHECK composto: telefone válido ou CPF simulado válido.

Índices: `idx_occurrences_protocol`, `idx_occurrences_region_id`.

## 10. `work_orders`

Ordens de serviço e máquina de estados (RF09–RF11, RF18, RN09–RN12).

| Coluna | Tipo | Nulo | Chave/restrição/default | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `code` | TEXT | Não | UNIQUE | Código `OS-AAAA-NNNNNN`. |
| `origin` | TEXT | Não | `alerta`, `cidadao`, `manual` | Origem. |
| `alert_id` | INTEGER | Sim | FK `alerts.id`, RESTRICT | Alerta de origem. |
| `occurrence_id` | INTEGER | Sim | FK `occurrences.id`, RESTRICT | Ocorrência de origem. |
| `region_id` | INTEGER | Não | FK `regions.id`, RESTRICT | Região. |
| `equipment_id` | INTEGER | Sim | FK `equipments.id`, RESTRICT | Equipamento. |
| `location` | TEXT | Não | `trim > 0` | Local. |
| `description` | TEXT | Não | `trim >= 3` | Descrição. |
| `status` | TEXT | Não | default `Aberta`; ciclo de OS | Estado. |
| `assigned_technician_id` | INTEGER | Sim | FK `users.id`, RESTRICT | Técnico atribuído. |
| `created_by_user_id` | INTEGER | Não | FK `users.id`, RESTRICT | Gestor criador. |
| `solution_description` | TEXT | Sim | obrigatória quando `Concluída` | Solução. |
| `cancellation_reason` | TEXT | Sim | obrigatória quando `Cancelada` | Justificativa. |
| `created_at` | TEXT | Não | — | Criação. |
| `updated_at` | TEXT | Não | — | Atualização. |

Índice único parcial: `idx_work_orders_active_alert` sobre `alert_id` quando a
OS está em `Aberta`, `Atribuída` ou `Em atendimento`.

Índices: `idx_work_orders_status`, `idx_work_orders_technician`.

## 11. `audit_logs`

Eventos críticos imutáveis (RNF16).

| Coluna | Tipo | Nulo | Chave/restrição | Descrição |
|---|---|---|---|---|
| `id` | INTEGER | Não | PK AUTOINCREMENT | Identificador. |
| `actor_user_id` | INTEGER | Sim | FK `users.id`, RESTRICT | Ator autenticado. |
| `actor_identity` | TEXT | Sim | `trim > 0` | Ator pré-autenticação/visitante. |
| `actor_role` | TEXT | Sim | — | Perfil do ator. |
| `action` | TEXT | Não | — | Nome do evento. |
| `target_type` | TEXT | Não | — | Tipo do alvo. |
| `target_id` | TEXT | Sim | — | Identificador do alvo. |
| `reason` | TEXT | Sim | — | Motivo/negação. |
| `previous_value` | TEXT | Sim | — | Estado anterior. |
| `new_value` | TEXT | Sim | — | Estado posterior. |
| `details` | TEXT | Sim | JSON serializado | Metadados adicionais. |
| `created_at` | TEXT | Não | — | Instante. |

CHECK: exatamente uma identidade de ator:

- `actor_user_id IS NOT NULL` e `actor_identity IS NULL`; ou
- `actor_user_id IS NULL`, `actor_identity` preenchido.

Índices: `idx_audit_logs_action`, `idx_audit_logs_created_at`.

## 12. Triggers históricos

- `prevent_audit_log_update`;
- `prevent_audit_log_delete`;
- `prevent_alert_delete`;
- `prevent_occurrence_delete`;
- `prevent_work_order_delete`.

Os gatilhos de histórico permanecem ativos no banco normal. A rotina de seed de
teste controla temporariamente os gatilhos apenas dentro de sua própria
transação para restaurar a massa sintética.
