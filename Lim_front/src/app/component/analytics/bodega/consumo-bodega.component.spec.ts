import { ConsumoBodegaComponent } from './consumo-bodega.component';
import { FilaTopProducto } from '../../../model/analytics';

describe('ConsumoBodegaComponent', () => {
  it('por defecto cubre los últimos 6 meses y nombra el producto elegido del ranking', () => {
    const c = new ConsumoBodegaComponent(null, null);
    expect(c.desde < c.hasta).toBe(true);
    expect(c.nombreProductoElegido()).toBe('todos los productos');
    c.top = [{ producto_id: 4, producto: 'Cloro' } as FilaTopProducto];
    c.productoId = 4;
    expect(c.nombreProductoElegido()).toBe('Cloro');
  });
});
