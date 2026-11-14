/**
 * Tests de services/auditoria/actor.js: actorDeRequest() (sin mocks, funcion pura).
 */
const { actorDeRequest } = require('../../../services/auditoria/actor');

describe('services/auditoria actorDeRequest()', () => {
  it('con usuario autenticado devuelve su id y contexto, sin motivoSinToken', () => {
    const actor = actorDeRequest({ usuario: { id: 9, contexto: 'usuario_apps' }, ip: '1.2.3.4' });
    expect(actor).toEqual({
      usuario: { id: 9, contexto: 'usuario_apps' },
      ip: '1.2.3.4',
      motivoSinToken: null
    });
  });

  it('sin contexto en el usuario usa contexto por defecto usuarios', () => {
    const actor = actorDeRequest({ usuario: { id: 9 } });
    expect(actor.usuario).toEqual({ id: 9, contexto: 'usuarios' });
  });

  it('sin token devuelve sistema con motivoSinToken LEGACY_SIN_TOKEN (D-074)', () => {
    const actor = actorDeRequest({ ip: '10.0.0.1' });
    expect(actor).toEqual({
      usuario: { id: null, contexto: 'sistema' },
      ip: '10.0.0.1',
      motivoSinToken: 'LEGACY_SIN_TOKEN'
    });
  });

  it('sin req devuelve sistema e ip null', () => {
    expect(actorDeRequest()).toEqual({
      usuario: { id: null, contexto: 'sistema' },
      ip: null,
      motivoSinToken: 'LEGACY_SIN_TOKEN'
    });
  });
});
