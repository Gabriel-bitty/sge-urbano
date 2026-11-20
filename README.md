# SGE-Urbano — Sistema de Gestão Energética Urbana

> **Aviso de transparência (`RNF17`):** o SGE-Urbano é uma simulação acadêmica
> para monitoramento de equipamentos públicos. Todos os dados de consumo são
> identificados com origem `SIMULADO`; não há integração com medidores,
> concessionárias ou dispositivos reais.

## 1. Sobre o projeto

Projeto desenvolvido para o Trabalho A3 da UC Gestão e Qualidade de Software,
no eixo temático de ordem pública e manutenção da cidade.

### Integrantes

- Eduardo Araujo
- Gabriel Santana
- João Anísio
- Marcelo Carmo
- Tiago Maciel

## 2. Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Back-end | Node.js `>=22.13.0` |
| API REST | Express |
| Banco de dados | `node:sqlite` |
| Sessão | `express-session` com store SQLite |
| Senhas | `node:crypto.scrypt` |
| Front-end | HTML5, CSS3 e JavaScript |
| Mapa | Leaflet.js e OpenStreetMap |
| Testes e cobertura | `node --test`, Cypress e `nyc` |

## 3. Pré-requisitos

- Node.js `>=22.13.0`;
- npm;
- conexão com a internet somente quando o frontend precisar carregar as tiles
  públicas do OpenStreetMap.

## 4. Instalação

```sh
git clone <URL-do-repositorio>
cd sge-urbano
npm install
```

## 5. Execução local

Ambiente normal:

```sh
npm start
```

Ambiente de teste, com banco em memória e seed sintética:

```sh
npm run start:test
```

A API fica disponível em `http://localhost:3000/api`. A interface estática fica
em `http://localhost:3000`.

Em modo de teste, o endpoint `POST /api/test/reset` recria a massa de referência.
Esse endpoint não é registrado fora de `NODE_ENV=test` (`RNF20`, CT26).

## 6. Contas sintéticas de teste

| Perfil | Usuário |
| --- | --- |
| Gestor | `gestor.teste` |
| Técnico | `tecnico1.teste` |
| Técnico | `tecnico2.teste` |

Senha compartilhada: `TesteSGE!2026`.

Essas credenciais existem somente na seed de ambiente de teste, não são
credenciais reais e nunca são criadas pelo ambiente normal. O Cidadão não possui
usuário nem login.

## 7. Autenticação

O login usa sessão server-side e cookie `HttpOnly` `sge.sid`, válido por 30
minutos de inatividade:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

Rotas protegidas usam `401` para visitante sem sessão e `403` quando o perfil não
possui permissão.

## 8. Visão geral da API

| Domínio | Rotas principais | Perfil |
| --- | --- | --- |
| Regiões | `GET/POST /api/regions`, `GET/PATCH /api/regions/:id` | Gestor |
| Equipamentos | `GET/POST /api/equipments`, `GET/PATCH /api/equipments/:id` | Gestor |
| Bloqueio | `/api/regions/:id/block`, `/api/equipments/:id/block` e rotas `/unblock` | Gestor |
| Simulação | `POST /api/simulations` | Gestor |
| Alertas | `GET /api/alerts` | Gestor |
| OS | `GET/POST /api/work-orders` e ações em `/api/work-orders/:id/*` | Gestor/Técnico conforme a operação |
| Ocorrências | `POST /api/occurrences`, `GET /api/occurrences/:protocol` | Público |
| Dashboard | `GET /api/dashboard` | Gestor |
| Relatórios | `GET /api/reports`, `GET /api/reports.csv` | Gestor |
| Mapa | `GET /api/map` | Gestor/Técnico |

## 9. Comandos de validação

```sh
npm run test:unit
npm run coverage
```

Para Cypress, mantenha a aplicação iniciada e execute:

```sh
npm run cy:run
npm run cy:open
```

## 10. Estrutura do back-end

```text
backend/src/
├── db/
├── middleware/
├── repositories/
├── routes/
├── rules/
└── services/
```

Consultas SQL de negócio permanecem nos repositórios. Serviços coordenam regras
e persistência; rotas recebem o protocolo HTTP e validam autorização. Regras
puras, como a detecção de anomalias, não dependem de Express, SQLite ou
interface.

## 11. Fontes e rastreabilidade

Os artefatos normativos da A3 estão em `docs/entrega-a3/`:

- Especificação de Requisitos e Plano de Qualidade;
- Casos de Teste e Revisão Técnica.

As decisões, o pipeline e os handoffs de contrato das etapas são mantidos no
repositório de documentação do projeto.

### Documentação técnica do backend

- [Visão geral da arquitetura](docs/architecture/overview.md)
- [Contratos da API REST](docs/architecture/api-contracts.md)
- [Diagrama entidade-relacionamento](docs/architecture/database-er-diagram.md)
- [Dicionário de dados](docs/architecture/data-dictionary.md)
- [Decisões e pendências](docs/open-decisions.md)
- [Matriz de rastreabilidade](docs/requirements-traceability.md)
