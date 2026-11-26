// RNF-SEC-02: el historial en lenguaje del usuario. La auditoría guarda filas tal como están en la BD
// (códigos, ids, columnas técnicas); aquí se eligen los campos que importan por entidad y se traducen.

const ACCIONES: { [k: string]: string } = {
  CREAR: 'Creó',
  EDITAR: 'Modificó',
  CIERRE: 'Cerró',
  REAPERTURA: 'Reabrió',
  RECALCULO: 'Recalculó el saldo',
  RECALCULO_CASCADA: 'Recalculó los meses siguientes',
  PAGO: 'Registró el pago',
  REVERSION_PAGO: 'Revirtió el pago',
  ANULAR: 'Anuló',
  APROBAR: 'Aprobó',
  AJUSTE: 'Ajustó',
  ENTREGA: 'Entregó',
  RECEPCION: 'Recibió'
};

// Motivos que escribe el propio sistema: se traducen en vez de mostrarse como código.
const MOTIVOS: { [k: string]: string } = {
  LEGACY_SIN_TOKEN: 'registrado sin sesión (antes de esta mejora)',
  CIERRE_LIQUIDACION_LEGACY: 'cierre de la liquidación',
  BORRADO_FISICO_LEGACY: 'eliminado desde la pantalla',
  ANULACION_EGRESO_LEGACY: 'eliminado desde la pantalla',
  APERTURA_AUTOMATICA: 'apertura automática del mes'
};

type Tipo = 'monto' | 'fecha' | 'texto' | 'si_no' | 'numero';
interface Campo { etiqueta: string; tipo?: Tipo; valores?: { [k: string]: string }; }

const ESTADO_PAGO = { EN_ESPERA: 'En espera', PENDIENTE: 'Pendiente', PAGADA: 'Pagada', ANULADA: 'Anulada', VENCIDA: 'Vencida' };
const DOCUMENTO = { FACTURA: 'Factura', BOLETA: 'Boleta', NOTA_CREDITO: 'Nota de crédito', OTRO: 'Otro' };
const MOVIMIENTO: { [k: string]: Campo } = {
  monto: { etiqueta: 'Monto', tipo: 'monto' },
  comentario: { etiqueta: 'Detalle' },
  fecha: { etiqueta: 'Fecha', tipo: 'fecha' },
  estado_pago: { etiqueta: 'Estado de pago', valores: ESTADO_PAGO },
  fecha_pago: { etiqueta: 'Fecha de pago', tipo: 'fecha' },
  tipo_documento: { etiqueta: 'Documento', valores: DOCUMENTO },
  numero_documento: { etiqueta: 'N° de documento' },
  fecha_emision: { etiqueta: 'Fecha de emisión', tipo: 'fecha' },
  fecha_vencimiento: { etiqueta: 'Vencimiento', tipo: 'fecha' }
};

// Solo estos campos se muestran (en este orden). Ids, claves foráneas y columnas internas quedan fuera:
// quién actuó ya se ve en la columna "Quién".
const CAMPOS: { [entidad: string]: { [campo: string]: Campo } } = {
  cajas: {
    periodo: { etiqueta: 'Mes' },
    estado: { etiqueta: 'Estado', valores: { '1': 'Abierta', '0': 'Cerrada', ABIERTA: 'Abierta', CERRADA: 'Cerrada' } },
    saldo_inicial: { etiqueta: 'Saldo inicial', tipo: 'monto' },
    total_ingreso: { etiqueta: 'Ingresos', tipo: 'monto' },
    total_egreso: { etiqueta: 'Egresos', tipo: 'monto' },
    utilidad: { etiqueta: 'Utilidad', tipo: 'monto' },
    saldo_final: { etiqueta: 'Saldo final', tipo: 'monto' },
    fecha_cierre: { etiqueta: 'Fecha de cierre', tipo: 'fecha' },
    saldo_provisional: { etiqueta: 'Saldo provisional', tipo: 'si_no' }
  },
  centro_costos: {
    estado: { etiqueta: 'Estado', valores: { '1': 'Abierto', '0': 'Cerrado' } },
    precio_servicio: { etiqueta: 'Valor del servicio', tipo: 'monto' },
    total_costos: { etiqueta: 'Total de costos', tipo: 'monto' },
    utilidad: { etiqueta: 'Utilidad', tipo: 'monto' },
    fecha_cierre: { etiqueta: 'Fecha de cierre', tipo: 'fecha' }
  },
  egresos: Object.assign({
    tipo: { etiqueta: 'Tipo', valores: { '1': 'Egreso general', '2': 'Pago de liquidación' } },
    estado: { etiqueta: 'Estado', valores: { '1': 'Vigente', '-1': 'Anulado' } }
  }, MOVIMIENTO),
  cc_egresos: MOVIMIENTO,
  cc_ingresos: MOVIMIENTO,
  liquidaciones: {
    estado: { etiqueta: 'Estado', valores: { '1': 'Abierta', '0': 'Cerrada' } },
    estado_pago: { etiqueta: 'Estado de pago', valores: ESTADO_PAGO },
    fecha_pago: { etiqueta: 'Fecha de pago', tipo: 'fecha' },
    liquido_pagar: { etiqueta: 'Líquido a pagar', tipo: 'monto' },
    total_haber: { etiqueta: 'Total haberes', tipo: 'monto' },
    total_descuento: { etiqueta: 'Total descuentos', tipo: 'monto' },
    sueldo_base: { etiqueta: 'Sueldo base', tipo: 'monto' },
    dias_trabajados: { etiqueta: 'Días trabajados', tipo: 'numero' },
    anticipo: { etiqueta: 'Anticipo', tipo: 'monto' },
    egreso_id: { etiqueta: 'Egreso del pago', tipo: 'numero' }
  },
  lista_insumos: {
    estado: { etiqueta: 'Estado', valores: { '0': 'En espera', '1': 'Aprobada' } },
    total: { etiqueta: 'Total', tipo: 'monto' },
    fecha: { etiqueta: 'Fecha', tipo: 'fecha' }
  }
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function dinero(v: any): string {
  const n = Math.round(Number(v));
  if (!isFinite(n)) { return String(v); }
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-CL');
}

function fecha(v: any): string {
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); // solo fecha: sin conversión de zona (sería el día anterior)
  if (m) { return Number(m[3]) + ' ' + MESES[Number(m[2]) - 1] + ' ' + m[1]; }
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short', year: 'numeric' });
}

function valor(c: Campo, v: any): string {
  if (v === null || v === undefined || v === '') { return 'sin dato'; }
  if (c.valores && c.valores[String(v)] !== undefined) { return c.valores[String(v)]; }
  switch (c.tipo) {
    case 'monto': return dinero(v);
    case 'fecha': return fecha(v);
    case 'si_no': return v === true || v === 1 || v === '1' ? 'Sí' : 'No';
    case 'numero': return String(v);
    default: return String(v);
  }
}

export function textoAccion(entidad: string, accion: string, antes: any, despues: any): string {
  const de = (a: number, d: number) => accion === 'EDITAR' && antes && despues && Number(antes.estado) === a && Number(despues.estado) === d;
  // Las pantallas antiguas guardan estas decisiones como EDITAR de estado.
  if (entidad === 'lista_insumos' && de(0, 1)) { return 'Aprobó la lista'; }    // 0 = En espera, 1 = Aprobada
  if (entidad === 'liquidaciones' && de(1, 0)) { return 'Cerró la liquidación'; } // 1 = Abierta, 0 = Cerrada
  return ACCIONES[accion] || accion;
}

// El motivo puede ser texto del usuario ("factura duplicada") o códigos del sistema separados por espacio.
export function textoMotivo(motivo: string): string {
  if (!motivo) { return ''; }
  const palabras = motivo.trim().split(/\s+/);
  const esCodigo = (w: string) => !!MOTIVOS[w] || /^CASCADA_DESDE_\d{4}-\d{2}$/.test(w);
  if (!palabras.every(esCodigo)) { return motivo; }
  return palabras.map((w) => {
    const m = /^CASCADA_DESDE_(\d{4}-\d{2})$/.exec(w);
    return m ? 'recálculo desde ' + m[1] : MOTIVOS[w];
  }).join(' · ');
}

// Una línea por campo: "Estado: Abierta → Cerrada" si cambió, o "Monto: $1.000" si es un registro nuevo.
export interface Linea { etiqueta: string; antes: string | null; despues: string; }

export function detalle(entidad: string, accion: string, antes: any, despues: any): Linea[] {
  // Recálculo en cascada: la auditoría guarda la lista de meses recalculados.
  const lista = Array.isArray(despues) ? despues : (despues && Array.isArray(despues.cajas) ? despues.cajas : null);
  if (lista) {
    const meses = lista.map((c: any) => c && c.periodo).filter(Boolean);
    return meses.length ? [{ etiqueta: 'Meses recalculados', antes: null, despues: meses.join(', ') }] : [];
  }
  const campos = CAMPOS[entidad];
  if (!campos) { return []; }
  const a = antes && typeof antes === 'object' ? antes : null;
  const d = despues && typeof despues === 'object' ? despues : {};
  const conDato = (k: string) => d[k] !== null && d[k] !== undefined && d[k] !== '';
  const cambiados = a ? Object.keys(campos).filter((k) => (k in a || k in d) && JSON.stringify(a[k]) !== JSON.stringify(d[k])) : [];
  if (cambiados.length) {
    return cambiados.map((k) => ({ etiqueta: campos[k].etiqueta, antes: valor(campos[k], a[k]), despues: valor(campos[k], d[k]) }));
  }
  // Registro nuevo, o registro antiguo cuyo "antes" quedó igual al "después": se muestra cómo quedó (solo lo esencial).
  const resumen = (RESUMEN[entidad] || Object.keys(campos)).filter((k) => campos[k] && conDato(k));
  return resumen.map((k) => ({ etiqueta: campos[k].etiqueta, antes: null, despues: valor(campos[k], d[k]) }));
}

// Lo esencial de cada entidad cuando no hay un antes → después que mostrar.
const RESUMEN: { [entidad: string]: string[] } = {
  cajas: ['estado', 'utilidad', 'saldo_final'],
  centro_costos: ['estado', 'total_costos', 'utilidad'],
  egresos: ['tipo', 'monto', 'comentario', 'estado_pago'],
  cc_egresos: ['monto', 'comentario', 'estado_pago'],
  cc_ingresos: ['monto', 'comentario', 'estado_pago'],
  liquidaciones: ['estado_pago', 'liquido_pagar', 'fecha_pago'],
  lista_insumos: ['estado', 'total']
};

export function fechaHoraSantiago(iso: string): string {
  if (!iso) { return ''; }
  return new Date(iso).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
