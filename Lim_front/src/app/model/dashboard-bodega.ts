// MODELO DEL DASHBOARD DE BODEGA (RF-BOD-05). Contrato: GET /api/v1/bodega/dashboard (Docs/bodega-solicitudes.md)
import { OrdenResumen } from './recepcion-bodega';

export interface ProductoStock {
  id: number;
  nombre: string;
  stock: number;
  stock_minimo: number;
  bajo_minimo: boolean;
}

export interface DashboardBodega {
  solicitudes: {
    por_estado: { PENDIENTE: number, PARCIAL: number, LISTA_ENTREGA: number };
    total_activas: number;
    mas_antiguas: { id: number, estado: string, etiqueta_estado: string, numero_cc: number, created_at: string }[];
  };
  lista_compra: {
    total_productos: number;
    total_unidades: number;
    sin_proveedor: number;
    productos: { producto_id: number, producto: string, cantidad_a_comprar: number, proveedor_id: number, proveedor: string }[];
  };
  stock: {
    total_activos: number;
    total_bajo_minimo: number;
    truncado: boolean;
    productos: ProductoStock[];
  };
  ordenes_transito: {
    total: number;
    por_estado: { ENVIADA: number, RECIBIDA_PARCIAL: number };
    ordenes: OrdenResumen[];
  };
}
