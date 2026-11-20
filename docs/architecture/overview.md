# Arquitetura do backend — SGE-Urbano

## 1. Objetivo

O SGE-Urbano mantém um backend Node.js organizado como aplicação REST em
camadas. O sistema atende autenticação, cadastros, simulação energética,
anomalias, alertas, bloqueios, ordens de serviço, ocorrências públicas e APIs de
leitura agregada.

Todos os dados de consumo são simulados. A origem `SIMULADO` é armazenada nas
leituras; não há integração com concessionárias, medidores físicos ou
dispositivos de IoT.

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js `>=22.13.0` |
| HTTP | Express |
| Banco | SQLite pelo módulo nativo `node:sqlite` |
| Sessão | `express-session` com store SQLite |
| Hash de senha | `node:crypto.scrypt` |
| Frontend | HTML5, CSS3 e JavaScript |
| Mapa | Leaflet.js e tiles públicas do OpenStreetMap |
| Qualidade | `node --test`, Cypress e `nyc` |

Não há ORM.

## 3. Separação em camadas

```text
Requisição HTTP
    |
backend/src/routes/
    |
backend/src/middleware/
    |
backend/src/services/
    |
backend/src/repositories/
    |
SQLite
```

### Rotas

`backend/src/routes/` recebe o protocolo HTTP, transforma parâmetros e corpos em
chamadas de serviço, aplica autenticação/autorização e formata as respostas.

As rotas não executam SQL.

### Middlewares

`backend/src/middleware/` concentra:

- autenticação por sessão;
- autorização por perfil;
- tratamento uniforme de erros;
- wrappers de rotas assíncronas.

Os perfis persistidos são `Gestor` e `Técnico`. O `Cidadão` não possui login e
acessa somente os endpoints públicos de ocorrência.

### Serviços

`backend/src/services/` coordena validações, regras de negócio, transações,
auditoria e autorização contextual. Exemplos:

- inativação de região com cascata;
- bloqueio/desbloqueio com suspensão/reativação de alertas;
- geração transacional de leituras e alertas;
- transições e auditoria de OS;
- registro e consulta mínima de ocorrência;
- agregação para dashboard, relatório e mapa.

### Regras puras

`backend/src/rules/anomalia.js` é isolado de Express, SQLite, rede e interface.
Ele recebe valores e parâmetros de configuração e retorna o resultado
determinístico da anomalia e severidade.

### Repositórios

`backend/src/repositories/` é a única camada de SQL de negócio. As consultas usam
parâmetros `?`, helpers comuns e filtros explícitos. Agregações também ficam
nesta camada.

### Banco e migrações

`backend/src/db/` contém:

- abertura da conexão;
- ativação de chaves estrangeiras;
- transações;
- migrações SQL ordenadas;
- seed exclusivamente de teste;
- massa sintética separada.

## 4. Fluxo de sessão e autorização

1. `POST /api/auth/login` valida as credenciais.
2. A senha é verificada com `scrypt`.
3. A sessão existente é regenerada.
4. `express-session` persiste o payload no store SQLite.
5. O middleware carrega `req.user` a partir do `userId` da sessão.
6. `requireRole(...)` autoriza ou recusa a operação e registra acesso indevido.

O cookie usa o nome `sge.sid` e a janela de inatividade é de 30 minutos.

## 5. Transações e auditoria

Operações críticas que alteram mais de um registro usam uma transação SQLite
imediata:

- inativação de região e equipamentos;
- bloqueio/desbloqueio em cascata e alertas;
- geração de leitura e alerta;
- alteração de estado da OS, ocorrência e alerta.

`audit_logs` é imutável por gatilhos do banco. Serviços de login, bloqueio e OS
registram também o fluxo real, com autor, instante, alvo, ação e estados
anterior/posterior quando aplicáveis.

## 6. Privacidade

Dados pessoais da ocorrência não aparecem na consulta pública:

```json
{
  "status": "Aberta",
  "type": "poste apagado"
}
```

Na API de OS, o Gestor pode receber o objeto `occurrence` com dados de contato.
O Técnico recebe somente dados operacionais da OS atribuída. O mapa nunca expõe
nome, e-mail, telefone ou CPF.

## 7. Dados simulados

As leituras são geradas em lote pelos cenários `normal`, `pico` e `falha`:

- `normal`: medido igual ao consumo esperado;
- `pico`: `E × 1,5`;
- `falha`: medido igual a zero.

Todas são persistidas com:

- `origin = "SIMULADO"`;
- `unit = "kWh"`;
- equipamento;
- data/hora;
- consumo esperado/medido;
- resultado de anomalia e severidade.

## 8. APIs de leitura

O backend fornece:

- dashboard com cards, tendência, alertas e OS;
- relatório agregado por região ou tipo e por dia/mês;
- CSV com as mesmas linhas e totais do JSON;
- mapa de ocorrências para Gestor e OS atribuídas para Técnico.

Essas APIs entregam dados, não implementam gráficos, marcadores, tiles ou
componentes de interface.

## 9. Limites de responsabilidade

| Responsável | Escopo |
|---|---|
| Gabriel Santana | Backend, persistência e contratos |
| João Anísio | HTML, CSS, JavaScript de navegador e integração visual |
| Tiago Maciel | Testes, cobertura, Cypress e evidências de execução |
| Eduardo Araujo | Revisão técnica, arquitetura e conformidade |

## 10. Rastreabilidade

- Autenticação e perfis: RF01–RF02, RNF04–RNF07, CT01 e CT10.
- Cadastros: RF03–RF04, RN02–RN04, CT02–CT03.
- Simulação e alertas: RF05–RF08, RN04–RN08, CT04–CT08.
- OS e ocorrências: RF09–RF13, RN09–RN26, CT09–CT14.
- Dashboard, mapa e relatório: RF14–RF16, RN29, CT15–CT16 e CT21.
- Bloqueio: RF17, RN16–RN17, RN27, CT18–CT20.
- Reset de teste: RNF20 e CT26.
