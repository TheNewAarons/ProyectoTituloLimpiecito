/**
 * RNF-SEC-02 — Test de INTEGRACION contra MySQL REAL: si `auditar()` falla, la operacion hace
 * ROLLBACK de TODAS sus escrituras. Solo se simula el fallo del INSERT de auditoria
 * (jest.spyOn(Auditoria, 'create')); la BD, las transacciones y la logica de negocio son reales.
 *
 * Deshabilitado por defecto (como cruceStock.concurrencia.test.js). Solo corre contra la BD
 * desechable `aseolimp_rollback_sec02` (copia solo-esquema), nunca contra oficial09:
 *   RUN_DB_TESTS=1 DATABASE_NAME=aseolimp_rollback_sec02 DATABASE_SERVER=localhost \
 *     npx jest tests/integracion --runInBand
 * Datos de prueba: prefijo __TEST_RNF_SEC_02__; el actor lleva usuario_id = MARCA (sin FK en
 * `auditoria`), asi las filas de auditoria de prueba se cuentan y borran (SQL crudo: la tabla es
 * inmutable por hooks del modelo) sin tocar nada mas. Sin DROP/TRUNCATE.
 */
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === '1';
const describeDB = RUN_DB_TESTS ? describe : describe.skip;

const BD_PERMITIDA = 'aseolimp_rollback_sec02';
const PREFIJO = '__TEST_RNF_SEC_02__';
const MARCA = 2147000001; // usuario_id del actor de prueba
const ACTOR = { id: MARCA, contexto: 'usuarios' };
const ID_CAJA_EGRESO = 2096001; // cajas.id no es AUTO_INCREMENT en el esquema: se asigna explicito
const ID_CAJA_CIERRE = 2097001;
const PERIODO_EGRESO = '2096-01';
const PERIODO_CIERRE = '2097-01';
const PERIODO_SIGUIENTE = '2097-02';
const ID_LIQUIDACION = 910000001; // = id del centro "sombra" (FK liquidacioneId -> centro_costos)

describeDB('RNF-SEC-02: rollback real si auditar() falla', () => {
  let db;
  let Auditoria;
  let spy;
  let creados;

  const sql = (q, replacements) => db.sequelize.query(q, { replacements: replacements || [] });
  const filas = async (q, replacements) => (await sql(q, replacements))[0];
  const una = async (q, replacements) => (await filas(q, replacements))[0];
  const insertar = async (q, replacements) => (await sql(q, replacements))[0]; // insertId
  const auditoriaDePrueba = () => filas('SELECT entidad, accion, entidad_id FROM auditoria WHERE usuario_id = ? ORDER BY id', [MARCA]);

  const fallaAuditoria = () => {
    spy = jest.spyOn(Auditoria, 'create').mockRejectedValue(new Error('fallo auditoria simulado'));
  };

  const crearProducto = async (stock) => {
    const id = await insertar('INSERT INTO productos (nombre, stock, estado) VALUES (?, ?, 1)', [PREFIJO + 'PRODUCTO', stock]);
    creados.productos.push(id);
    return id;
  };
  const crearCentro = async (precio) => {
    const id = await insertar('INSERT INTO centro_costos (numero_cc, precio_servicio, estado) VALUES (?, ?, 1)', [990001, precio]);
    creados.centros.push(id);
    return id;
  };
  const crearCajaFila = async (id, periodo) => {
    await sql('INSERT INTO cajas (id, periodo, estado, saldo_inicial, fecha_inicio) VALUES (?, ?, 1, 0, ?)', [id, periodo, periodo + '-01 00:00:00']);
    creados.cajas.push(id);
  };

  beforeAll(() => {
    db = require('../../database/database');
    if (db.sequelize.config.database !== BD_PERMITIDA) {
      throw new Error('ABORTADO: la BD activa es "' + db.sequelize.config.database + '", solo se permite ' + BD_PERMITIDA);
    }
    Auditoria = require('../../modelos/sistema_base/Auditoria');
  });

  beforeEach(() => {
    creados = { productos: [], centros: [], trabajadores: [], cajas: [] };
  });

  afterEach(async () => {
    if (spy) { spy.mockRestore(); spy = null; }
    const en = (arr) => (arr.length ? arr : [0]);
    // Orden de FK: hijos antes que padres. Todo acotado a ids/periodos creados por este test.
    await sql('DELETE FROM auditoria WHERE usuario_id = ?', [MARCA]);
    await sql('DELETE FROM stock_rapidos WHERE productoId IN (?)', [en(creados.productos)]);
    await sql('DELETE FROM cc_ingresos WHERE centroCostoId IN (?)', [en(creados.centros)]);
    await sql('DELETE FROM cc_egresos WHERE centroCostoId IN (?)', [en(creados.centros)]);
    await sql('DELETE FROM centro_costo_trabajadores WHERE centroCostoId IN (?)', [en(creados.centros)]);
    await sql('DELETE FROM liquidaciones WHERE id = ?', [ID_LIQUIDACION]);
    await sql('DELETE FROM egresos WHERE cajaId IN (?)', [en(creados.cajas)]);
    await sql('DELETE FROM centro_costos WHERE id IN (?)', [en(creados.centros)]);
    await sql('DELETE FROM trabajadores WHERE id IN (?)', [en(creados.trabajadores)]);
    await sql('DELETE FROM productos WHERE id IN (?)', [en(creados.productos)]);
    await sql('DELETE FROM cajas WHERE id IN (?) OR periodo = ?', [en(creados.cajas), PERIODO_SIGUIENTE]);
  });

  afterAll(async () => {
    if (db) await db.sequelize.close();
  });

  describe('E8 crearCCIngresoDB (create cc_ingresos + increment precio_servicio)', () => {
    const { crearCCIngresoDB } = RUN_DB_TESTS ? require('../../api/apartado_base/detalle_centro/logica') : {};
    // cc_ingresos.id no es AUTO_INCREMENT en el esquema: se pasa id explicito para aislar el rollback
    const ingreso = (centroCostoId) => ({ id: 2095001, fecha: new Date(), monto: 1000, comentario: PREFIJO, centroCostoId });

    it('si auditar falla: no queda cc_ingresos y precio_servicio queda intacto', async () => {
      const centro = await crearCentro(5000);
      fallaAuditoria();
      await expect(crearCCIngresoDB(ingreso(centro), { usuario: ACTOR })).rejects.toThrow('fallo auditoria simulado');
      expect(spy).toHaveBeenCalled();
      expect((await filas('SELECT id FROM cc_ingresos WHERE centroCostoId = ?', [centro])).length).toBe(0);
      expect((await una('SELECT precio_servicio p FROM centro_costos WHERE id = ?', [centro])).p).toBe(5000);
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: cc_ingresos + incremento + fila de auditoria CREAR', async () => {
      const centro = await crearCentro(5000);
      await crearCCIngresoDB(ingreso(centro), { usuario: ACTOR });
      expect((await filas('SELECT id FROM cc_ingresos WHERE centroCostoId = ?', [centro])).length).toBe(1);
      expect((await una('SELECT precio_servicio p FROM centro_costos WHERE id = ?', [centro])).p).toBe(6000);
      expect(await auditoriaDePrueba()).toEqual([expect.objectContaining({ entidad: 'cc_ingresos', accion: 'CREAR', entidad_id: '2095001' })]);
    });
  });

  describe('E7 eliminarCCEgresoDB (auditar ANTES del destroy)', () => {
    const { eliminarCCEgresoDB } = RUN_DB_TESTS ? require('../../api/apartado_base/detalle_centro/logica') : {};
    const crearFila = async () => {
      const centro = await crearCentro(0);
      const id = await insertar('INSERT INTO cc_egresos (centroCostoId, monto, comentario, estado_pago) VALUES (?, 700, ?, ?)', [centro, PREFIJO, 'PAGADA']);
      return id;
    };

    it('si auditar falla: la fila cc_egresos NO se borra', async () => {
      const id = await crearFila();
      fallaAuditoria();
      await expect(eliminarCCEgresoDB(id, { usuario: ACTOR })).rejects.toThrow('fallo auditoria simulado');
      expect((await filas('SELECT id FROM cc_egresos WHERE id = ?', [id])).length).toBe(1);
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: fila borrada + auditoria ANULAR con valores_antes', async () => {
      const id = await crearFila();
      expect(await eliminarCCEgresoDB(id, { usuario: ACTOR })).toBe(1);
      expect((await filas('SELECT id FROM cc_egresos WHERE id = ?', [id])).length).toBe(0);
      const a = await filas('SELECT accion, valores_antes FROM auditoria WHERE usuario_id = ? AND entidad = ?', [MARCA, 'cc_egresos']);
      expect(a.length).toBe(1);
      expect(a[0].accion).toBe('ANULAR');
      // la columna es JSON en este motor: mysql2 la devuelve ya parseada
      const antes = typeof a[0].valores_antes === 'string' ? JSON.parse(a[0].valores_antes) : a[0].valores_antes;
      expect(antes.comentario).toBe(PREFIJO);
    });
  });

  describe('L1 crearLiquidacionDB (create liquidaciones + update centro_costo_trabajadores)', () => {
    const { crearLiquidacionDB } = RUN_DB_TESTS ? require('../../api/apartado_base/liquidacion/logica') : {};
    // centro_costo_trabajadores.liquidacioneId tiene FK a centro_costos (no a liquidaciones; ver
    // Centro_costo_trabajadore.js y el esquema): se crea un centro "sombra" con id = id de la liquidacion.
    const armar = async () => {
      const centro = await crearCentro(0);
      await sql('INSERT INTO centro_costos (id, numero_cc, precio_servicio, estado) VALUES (?, 990002, 0, 1)', [ID_LIQUIDACION]);
      creados.centros.push(ID_LIQUIDACION);
      const trab = await insertar('INSERT INTO trabajadores (nombre) VALUES (?)', [PREFIJO + 'TRABAJADOR']);
      creados.trabajadores.push(trab);
      const cct = await insertar('INSERT INTO centro_costo_trabajadores (centroCostoId, trabajadoreId) VALUES (?, ?)', [centro, trab]);
      return cct;
    };
    const liquidacion = () => ({ id: ID_LIQUIDACION, sueldo_base: 500000, fecha_creacion: new Date(), estado: 1 });

    it('si auditar falla: no queda liquidacion y liquidacioneId sigue NULL', async () => {
      const cct = await armar();
      fallaAuditoria();
      await expect(crearLiquidacionDB(liquidacion(), cct, { usuario: ACTOR })).rejects.toThrow('fallo auditoria simulado');
      expect((await filas('SELECT id FROM liquidaciones WHERE id = ?', [ID_LIQUIDACION])).length).toBe(0);
      expect((await una('SELECT liquidacioneId l FROM centro_costo_trabajadores WHERE id = ?', [cct])).l).toBeNull();
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: liquidacion + vinculo + auditoria CREAR', async () => {
      const cct = await armar();
      await crearLiquidacionDB(liquidacion(), cct, { usuario: ACTOR });
      expect((await filas('SELECT id FROM liquidaciones WHERE id = ?', [ID_LIQUIDACION])).length).toBe(1);
      expect((await una('SELECT liquidacioneId l FROM centro_costo_trabajadores WHERE id = ?', [cct])).l).toBe(ID_LIQUIDACION);
      expect(await auditoriaDePrueba()).toEqual([expect.objectContaining({ entidad: 'liquidaciones', accion: 'CREAR' })]);
    });
  });

  describe('B8 crearStock stock_rapido (create + increment productos.stock)', () => {
    const controlador = RUN_DB_TESTS ? require('../../api/apartado_base/stock_rapido/controlador') : {};
    const invocar = async (productoId) => {
      const req = { body: { stocks: JSON.stringify([{ cantidad: 5, comentario: PREFIJO, fecha: '2026-01-01', productoId }]) }, usuario: ACTOR, ip: '127.0.0.1' };
      const res = { json: jest.fn(), send: jest.fn() };
      await controlador.crearStock(req, res);
      return res;
    };

    it('si auditar falla: no queda stock_rapidos y productos.stock queda intacto', async () => {
      const prod = await crearProducto(10);
      fallaAuditoria();
      const res = await invocar(prod);
      expect(res.json).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('fallo auditoria simulado'));
      expect((await filas('SELECT id FROM stock_rapidos WHERE productoId = ?', [prod])).length).toBe(0);
      expect((await una('SELECT stock s FROM productos WHERE id = ?', [prod])).s).toBe(10);
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: stock_rapidos + stock 15 + auditorias CREAR y AJUSTE', async () => {
      const prod = await crearProducto(10);
      const res = await invocar(prod);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Listo' });
      expect((await filas('SELECT id FROM stock_rapidos WHERE productoId = ?', [prod])).length).toBe(1);
      expect((await una('SELECT stock s FROM productos WHERE id = ?', [prod])).s).toBe(15);
      const a = await auditoriaDePrueba();
      expect(a.map((x) => x.entidad + ':' + x.accion).sort()).toEqual(['productos:AJUSTE', 'stock_rapidos:CREAR']);
    });
  });

  describe('E1 crearEgresoDB', () => {
    const { crearEgresoDB } = RUN_DB_TESTS ? require('../../api/apartado_base/egreso/logica') : {};
    const egreso = () => ({ fecha: new Date(), monto: 900, comentario: PREFIJO, cajaId: ID_CAJA_EGRESO, estado_pago: 'PAGADA' });

    it('si auditar falla: no queda el egreso', async () => {
      await crearCajaFila(ID_CAJA_EGRESO, PERIODO_EGRESO);
      fallaAuditoria();
      await expect(crearEgresoDB(egreso(), { usuario: ACTOR })).rejects.toThrow('fallo auditoria simulado');
      expect((await filas('SELECT id FROM egresos WHERE cajaId = ?', [ID_CAJA_EGRESO])).length).toBe(0);
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: egreso + auditoria CREAR', async () => {
      await crearCajaFila(ID_CAJA_EGRESO, PERIODO_EGRESO);
      const creado = await crearEgresoDB(egreso(), { usuario: ACTOR });
      expect((await filas('SELECT id FROM egresos WHERE cajaId = ?', [ID_CAJA_EGRESO])).length).toBe(1);
      expect(await auditoriaDePrueba()).toEqual([expect.objectContaining({ entidad: 'egresos', accion: 'CREAR', entidad_id: String(creado.id) })]);
    });
  });

  describe('v1 cerrarMes (services/caja/cierre.js)', () => {
    const cierre = RUN_DB_TESTS ? require('../../services/caja/cierre') : {};
    const ctx = () => ({ usuario: ACTOR, ip: '127.0.0.1' });
    // cajas.cerrada_por tiene FK a usuarios: el actor debe existir como usuario real de prueba
    beforeEach(() => sql('INSERT INTO usuarios (id) VALUES (?)', [MARCA]));
    afterEach(() => sql('DELETE FROM usuarios WHERE id = ?', [MARCA]));

    it('si falla la 2da auditoria (tras CIERRE y creacion del mes siguiente): rollback total', async () => {
      await crearCajaFila(ID_CAJA_CIERRE, PERIODO_CIERRE);
      const original = Auditoria.create;
      // 1ra llamada (CIERRE) real: debe quedar revertida igual; 2da (CREAR caja siguiente) falla.
      spy = jest.spyOn(Auditoria, 'create')
        .mockImplementationOnce(function () { return original.apply(Auditoria, arguments); })
        .mockRejectedValue(new Error('fallo auditoria simulado'));
      await expect(cierre.cerrarMes(PERIODO_CIERRE, ctx())).rejects.toThrow('fallo auditoria simulado');
      expect(spy).toHaveBeenCalledTimes(2);
      const caja = await una('SELECT estado, saldo_final, fecha_cierre, cerrada_por FROM cajas WHERE id = ?', [ID_CAJA_CIERRE]);
      expect(caja.estado).toBe(1);
      expect(caja.saldo_final).toBeNull();
      expect(caja.fecha_cierre).toBeNull();
      expect((await filas('SELECT id FROM cajas WHERE periodo = ?', [PERIODO_SIGUIENTE])).length).toBe(0);
      expect((await auditoriaDePrueba()).length).toBe(0);
    });

    it('camino feliz: caja cerrada + mes siguiente creado + 2 auditorias', async () => {
      await crearCajaFila(ID_CAJA_CIERRE, PERIODO_CIERRE);
      await cierre.cerrarMes(PERIODO_CIERRE, ctx());
      expect((await una('SELECT estado FROM cajas WHERE id = ?', [ID_CAJA_CIERRE])).estado).toBe(0);
      expect((await filas('SELECT id FROM cajas WHERE periodo = ?', [PERIODO_SIGUIENTE])).length).toBe(1);
      const a = await auditoriaDePrueba();
      expect(a.map((x) => x.entidad + ':' + x.accion)).toEqual(['cajas:CIERRE', 'cajas:CREAR']);
    });
  });
});
