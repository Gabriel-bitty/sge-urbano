# SGE-Urbano

Sistema de Gestão Energética Urbana. **Os dados de consumo são simulados**; o
sistema não se integra a medidores reais.

## Execução local

Em uma máquina limpa, clone o repositório e instale as dependências:

```sh
git clone <URL-do-repositorio>
cd sge-urbano
npm install
npm start
```

Abra `http://localhost:3000`. Para executar a aplicação com `NODE_ENV=test`,
use `npm run start:test`. Esse comando usa um banco em memória e carrega a massa
sintética, incluindo as contas de teste:

| Perfil | Usuário |
|---|---|
| Gestor | `gestor.teste` |
| Técnico | `tecnico1.teste`, `tecnico2.teste` |

A senha compartilhada dessas contas é `TesteSGE!2026`; elas existem somente na
seed de teste e nunca são criadas pelo ambiente normal. Cypress usa a mesma URL
base; mantenha a aplicação iniciada em outro terminal ao executar
`npm run cy:run` ou `npm run cy:open`.

## Comandos

```sh
npm run test:unit
npm run cy:run
npm run cy:open
npm run coverage
```

