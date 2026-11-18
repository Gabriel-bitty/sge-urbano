describe('estrutura inicial', () => {
  it('serve a página inicial e alerta sobre dados simulados', () => {
    cy.visit('/');
    cy.contains('h1', 'SGE-Urbano');
    cy.contains('Os dados de consumo apresentados pelo sistema são simulados.');
  });
});
