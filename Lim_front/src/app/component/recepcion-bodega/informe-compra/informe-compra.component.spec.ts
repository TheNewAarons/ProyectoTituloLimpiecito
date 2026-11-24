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
    expect(filas.map((f) => [f.proveedor, f.ordenes, f.pedidas, f.recibidas, f.pendientes])).toEqual([
      ['Químicos Ltda', 1, 30, 0, 30],
      ['Aseo SpA', 2, 15, 13, 2],
      ['Sin proveedor', 1, 1, 0, 1]
    ]);
    expect(filas[1].detalle.map((o) => o.id)).toEqual([1, 2]);
  });
});
