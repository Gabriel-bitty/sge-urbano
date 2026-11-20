# Decisões aplicadas e pendências abertas — SGE-Urbano

Este documento complementa os PDFs originais para o backend. Ele não altera a
especificação e não registra resultados de testes sem evidência real.

## 1. Decisões fechadas

| Tema | Decisão vigente | Fonte / rastreabilidade |
|---|---|---|
| Pico de simulação | Semente fixa `42` e fator `E × 1,5`. | D-INS-11; RF05; CT04. |
| Protocolo de ocorrência | `PROTOCOLO-AAAAMMDD-XXXX`, data em `America/Sao_Paulo`, alfabeto `0123456789ABCDEFGHJKMNPQRSTVWXYZ`, nova tentativa em colisão. | D-INS-12; RN26; CT13–CT14. |
| Campos de região | Nome e coordenadas simuladas. | D-INS-06; RF03. |
| Estados de ocorrência | `Aberta`, `Atribuída`, `Em atendimento`, `Concluída`, `Cancelada`, espelhando OS. | RN10; decisão registrada. |
| Motivo de bloqueio | `trim` obrigatório e pelo menos 10 caracteres. | D-INS-14; RN16; CT18. |
| Migrações e seed | Migrações SQL versionadas/transacionais; seed como reset completo exclusivo de `NODE_ENV=test`. | RNF02, RNF20; CT17, CT26. |
| `scrypt` | `N=2^17`, `r=8`, `p=1`, salt de 16 bytes, chave de 64 bytes, `maxmem=256 MiB`. | RNF04; CT01. |
| Sessão | Store SQLite, cookie `sge.sid`, expiração por 30 minutos de inatividade. | RF01, RNF05, RNF06; CT01. |
| Ator em auditoria | Exatamente um ator: `actor_user_id` autenticado ou `actor_identity` sem sessão. | RNF16; CA02.1–CA02.2. |
| Autenticação | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`; somente Gestor/Técnico. | RF01; CT01. |
| Cadastros | CRUD acordado por `GET`, `POST` e `PATCH` em regiões/equipamentos; perfis e campos documentados na Etapa 12. | RF02–RF04; CT02–CT03. |
| Estados de OS | Tabela 4.7; Gestor também pode concluir OS com solução. | RN10–RN12, RN21, RN25; D-INS-10. |
| Perfis/nomes persistidos | `Gestor`, `Técnico`, `Aberta`, `Atribuída`, `Em atendimento`, `Concluída`, `Cancelada`, `Média`. | RN01, RN10; decisões de nomenclatura. |
| Tipos de ocorrência | Cinco tipos da RN23, inclusive `falta de energia`. | D-INS-02; RN23. |

## 2. Contratos backend registrados

As escolhas abaixo estão implementadas e formalizadas nos handoffs das Etapas
12–15:

| Área | Contrato vigente |
|---|---|
| Bloqueio | Ações `/block` e `/unblock` em regiões/equipamentos. |
| Simulação | `POST /api/simulations` com `normal`, `pico`, `falha`. |
| Alertas | `GET /api/alerts` com filtros de severidade, status, região, equipamento e tipo. |
| OS | `POST /api/work-orders` e ações `assign`, `reassign`, `start`, `complete`, `cancel`. |
| Código da OS | `OS-AAAA-NNNNNN`, sequencial por ano. |
| Ocorrência | `POST /api/occurrences` e `GET /api/occurrences/:protocol`. |
| Dashboard | `GET /api/dashboard`. |
| Relatórios | `GET /api/reports` e `GET /api/reports.csv`. |
| Mapa | `GET /api/map`. |
| Reset | `POST /api/test/reset`, montado somente em `NODE_ENV=test`. |

Esses contratos precisam permanecer sincronizados com
`docs/architecture/api-contracts.md`.

iência, persistência e hardening da API pertencem à responsabilidade de QA. | Tiago |

## 3. Regras de governança

1. Os PDFs de 1ª e 2ª entrega continuam sendo as fontes normativas.
2. Uma decisão registrada só prevalece quando responde explicitamente a uma
   divergência; ela não cria requisito por conta própria.
3. O repositório legado serve como referência editorial, não como fonte de
   campos, perfis, rotas ou resultados incompatíveis.
4. Não registrar como testado o que só foi inspecionado ou validado por smoke
   check.
5. Não mover decisão técnica para código: este arquivo e os guias de projeto
   devem permanecer somente em documentação.
