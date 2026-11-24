/**
 * RF-PEV-02 (AUT-016, obs. 12) — services/pev/cronograma-asignacion.js: la asignación se refleja en el Cronograma.
 * Los destinos se eligen por FECHAS (fecha_termino >= fecha de inicio), no por mes/anio: la pantalla guarda `mes`
 * base 0 y hay datos con otra convención. BD simulada por patrón de SQL.
 */
const mem = { cronogramas: [], lineas: [], trabajadores: [], sqls: [] };
jest.mock('../../../database/database', () => ({
  sequelize: {
    query: jest.fn(async (sql, o) => {
      const r = (o && o.replacements) || {};
      mem.sqls.push({ sql: sql, r: r, t: o && o.transaction });
      if (/FROM cronogramas WHERE clienteId/.test(sql)) {
        return mem.cronogramas
          .filter((c) => c.clienteId === r.cliente && c.turnoId === r.turno && c.estado === r.activo && c.fin >= r.desde)
          .sort((a, b) => (a.inicio < b.inicio ? -1 : 1))
          .map((c) => ({ id: c.id, inicio: c.inicio, fin: c.fin }));
      }
      if (/FROM cronogramas WHERE id/.test(sql)) return mem.cronogramas.filter((c) => c.id === r.id);
      const tabla = /linea_cronogramas/.test(sql) ? mem.lineas : mem.trabajadores;
      const col = /linea_cronogramas/.test(sql) ? 'tareaId' : 'trabajadoreId';
      if (/^SELECT id FROM/.test(sql)) return tabla.filter((f) => f.cronogramaId === r.c && f[col] === r.v);
      if (/^INSERT INTO/.test(sql)) { const f = { id: tabla.length + 100, cronogramaId: r.c }; f[col] = r.v; tabla.push(f); return [f.id, 1]; }
      throw new Error('SQL no esperado: ' + sql);
    })
  }
}));
jest.mock('../../../services/auditoria', () => ({ auditar: jest.fn(async () => ({})) }));

const db = require('../../../database/database');
const { auditar } = require('../../../services/auditoria');
const servicio = require('../../../services/pev/cronograma-asignacion');

const t = { id: 'tx' };
const ctx = { usuario: { id: 1, contexto: 'usuarios' }, ip: '::1' };
const base = { clienteId: 8, turnoId: 8, fechaDesde: '2026-11-23', tareaId: 500, trabajadorId: 13 };

beforeEach(() => {
  jest.clearAllMocks();
  mem.cronogramas = [
    { id: 1, clienteId: 8, turnoId: 8, mes: 9, anio: 2026, inicio: '2026-10-01', fin: '2026-10-31', estado: 1 },  // terminó antes: no
    { id: 2, clienteId: 8, turnoId: 8, mes: 10, anio: 2026, inicio: '2026-11-01', fin: '2026-11-30', estado: 1 }, // en curso (mes base 0): sí
    { id: 3, clienteId: 8, turnoId: 8, mes: 0, anio: 2027, inicio: '2027-01-01', fin: '2027-01-31', estado: 1 },  // posterior: sí
    { id: 4, clienteId: 8, turnoId: 8, mes: 11, anio: 2026, inicio: '2026-12-01', fin: '2026-12-31', estado: 2 }, // finalizado: no
    { id: 5, clienteId: 8, turnoId: 9, mes: 10, anio: 2026, inicio: '2026-11-01', fin: '2026-11-30', estado: 1 }, // otro turno: no
    { id: 6, clienteId: 7, turnoId: 8, mes: 10, anio: 2026, inicio: '2026-11-01', fin: '2026-11-30', estado: 1 }  // otro cliente: no
  ];
  mem.lineas = [];
  mem.trabajadores = [];
  mem.sqls = [];
});

describe('sincronizar', () => {
  it('agrega la tarea y asocia al trabajador en los cronogramas activos vigentes desde la fecha de inicio', async () => {
    const r = await servicio.sincronizar(t, base, ctx);
    expect(r.cronogramas.map((c) => [c.id, c.tarea_agregada, c.trabajador_asociado])).toEqual([[2, true, true], [3, true, true]]);
    expect(r.cronogramas[0]).toMatchObject({ inicio: '2026-11-01', fin: '2026-11-30' });
    expect(mem.lineas.map((l) => [l.cronogramaId, l.tareaId])).toEqual([[2, 500], [3, 500]]);
    expect(mem.trabajadores.map((l) => [l.cronogramaId, l.trabajadoreId])).toEqual([[2, 13], [3, 13]]);
    expect(auditar).toHaveBeenCalledTimes(4);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ transaction: t, entidad: 'linea_cronogramas', accion: 'CREAR', entidad_id: 100 }));
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ transaction: t, entidad: 'trabajadores_cronogramas', accion: 'CREAR' }));
  });

  it('elige por fechas y no por mes/anio (un cronograma con mes base 1 en los datos igual se reconoce)', async () => {
    mem.cronogramas = [{ id: 9, clienteId: 8, turnoId: 8, mes: 11, anio: 2026, inicio: '2026-11-01', fin: '2026-11-30', estado: 1 }];
    const r = await servicio.sincronizar(t, base, ctx);
    expect(r.cronogramas.map((c) => c.id)).toEqual([9]);
  });

  it('bloquea los cronogramas destino (FOR UPDATE), filtra por fecha_termino y todo va en la transacción recibida', async () => {
    await servicio.sincronizar(t, base, ctx);
    const sel = mem.sqls.find((s) => /FROM cronogramas/.test(s.sql));
    expect(sel.sql).toMatch(/DATE\(fecha_termino\) >= :desde/);
    expect(sel.sql).toMatch(/FOR UPDATE$/);
    expect(sel.r).toMatchObject({ cliente: 8, turno: 8, activo: 1, desde: '2026-11-23' });
    expect(mem.sqls.every((s) => s.t === t)).toBe(true);
  });

  it('no duplica: si la tarea o el trabajador ya están en el cronograma, no inserta ni audita de nuevo', async () => {
    mem.lineas.push({ id: 1, cronogramaId: 2, tareaId: 500 });
    mem.trabajadores.push({ id: 1, cronogramaId: 3, trabajadoreId: 13 });
    const r = await servicio.sincronizar(t, base, ctx);
    expect(r.cronogramas.map((c) => [c.id, c.tarea_agregada, c.trabajador_asociado])).toEqual([[2, false, true], [3, true, false]]);
    expect(mem.lineas).toHaveLength(2);
    expect(mem.trabajadores).toHaveLength(2);
    expect(auditar).toHaveBeenCalledTimes(2);
  });

  it('sin cronogramas activos para ese cliente/turno: no escribe nada', async () => {
    const r = await servicio.sincronizar(t, Object.assign({}, base, { clienteId: 99 }), ctx);
    expect(r.cronogramas).toEqual([]);
    expect(mem.sqls.filter((s) => /^INSERT/.test(s.sql))).toHaveLength(0);
    expect(auditar).not.toHaveBeenCalled();
  });

  it('si el driver no devuelve el id insertado, la auditoría registra null (no el id del cronograma)', async () => {
    db.sequelize.query.mockImplementationOnce(async () => [{ id: 2, inicio: '2026-11-01', fin: '2026-11-30' }]) // destinos
      .mockImplementationOnce(async () => [])         // existe linea
      .mockImplementationOnce(async () => undefined)  // insert linea sin id
      .mockImplementationOnce(async () => [{ id: 1 }]); // existe trabajador
    await servicio.sincronizar(t, base, ctx);
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ entidad: 'linea_cronogramas', entidad_id: null }));
  });
});

describe('destinoVistaPrevia', () => {
  it('lista los cronogramas destino sin bloquear ni escribir', async () => {
    const r = await servicio.destinoVistaPrevia(8, 8, '2026-11-23');
    expect(r).toEqual({ cronogramas: [{ id: 2, inicio: '2026-11-01', fin: '2026-11-30' }, { id: 3, inicio: '2027-01-01', fin: '2027-01-31' }], sin_cronograma: false });
    expect(mem.sqls[0].sql).not.toMatch(/FOR UPDATE/);
  });

  it('sin cronograma activo: sin_cronograma true (aviso, no bloquea)', async () => {
    expect(await servicio.destinoVistaPrevia(8, 8, '2027-02-01')).toEqual({ cronogramas: [], sin_cronograma: true });
  });

  it('si la consulta falla, la vista previa sigue: sin_cronograma null (no se pudo verificar)', async () => {
    db.sequelize.query.mockRejectedValueOnce(new Error('BD caída'));
    expect(await servicio.destinoVistaPrevia(8, 8, '2026-11-23')).toEqual({ cronogramas: [], sin_cronograma: null });
  });
});

describe('listarPorCronograma', () => {
  it('cronograma inexistente: null', async () => {
    expect(await servicio.listarPorCronograma(999)).toBeNull();
  });

  it('usa el período por FECHAS del cronograma, excluye anuladas y arma nombres', async () => {
    db.sequelize.query
      .mockResolvedValueOnce([{ id: 89, clienteId: 1, turnoId: 1, mes: 1, anio: 2028, inicio: '2028-02-01', fin: '2028-02-29' }])
      .mockResolvedValueOnce([{ id: 70, estado: 'ACTIVA', fecha_desde: '2028-02-10', fecha_hasta: null, actividad_id: 2, actividad: 'Barrido 1',
        sector: 'Sector 1', area: 'Area 1.1', trabajador_id: 4, trabajador_nombre: 'Ana', trabajador_apellido: 'Rojas', n_empleado: 1004 }]);
    const r = await servicio.listarPorCronograma(89);
    expect(r.cronograma).toMatchObject({ id: 89, inicio: '2028-02-01', fin: '2028-02-29', cliente_id: 1, turno_id: 1 });
    expect(r.asignaciones).toEqual([expect.objectContaining({ id: 70, actividad: 'Barrido 1', trabajador: 'Ana Rojas', n_empleado: 1004 })]);
    const llamada = db.sequelize.query.mock.calls[1];
    expect(llamada[0]).toMatch(/estado <> 'ANULADA'/);
    // obs. 21: solo trabajadores asociados a este cronograma
    expect(llamada[0]).toMatch(/EXISTS \(SELECT 1 FROM trabajadores_cronogramas tc WHERE tc.cronogramaId = :cronograma AND tc.trabajadoreId = x.trabajador_id\)/);
    expect(llamada[1].replacements).toEqual({ cronograma: 89, cliente: 1, turno: 1, inicio: '2028-02-01', fin: '2028-02-29' });
  });
});
