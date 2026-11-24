import { agruparPorProveedor } from './informe-compra.component';
import { OrdenResumen } from '../../../model/recepcion-bodega';

describe('Informe de compra (temporal)', () => {
  const orden = (id: number, proveedor: string, estado: string, pedidas: number, pendientes: number): OrdenResumen => ({
    id: id, proveedor: proveedor, estado: estado, enviada_at: null, created_at: null, lineas: 1,
    unidades_pedidas: pedidas, unidades_pendientes: pendientes
  } as OrdenResumen);

  it('agrupa por proveedor, ignora anuladas y ordena por unidades pedidas', () => {
    const filas = agruparPorProveedor([
      orden(1, 'Aseo SpA', 'RECIBIDA', 10, 0),
      orden(2, 'Aseo SpA', 'RECIBIDA_PARCIAL', 5, 2),
      orden(3, 'Químicos Ltda', 'ENVIADA', 30, 30),
      orden(4, 'Aseo SpA', 'ANULADA', 100, 100),
      orden(5, null, 'BORRADOR', 1, 1)
    ]);
    expect(filas).toEqual([
      { proveedor: 'Químicos Ltda', ordenes: 1, pedidas: 30, recibidas: 0, pendientes: 30 },
      { proveedor: 'Aseo SpA', ordenes: 2, pedidas: 15, recibidas: 13, pendientes: 2 },
      { proveedor: 'Sin proveedor', ordenes: 1, pedidas: 1, recibidas: 0, pendientes: 1 }
    ]);
  });
});
