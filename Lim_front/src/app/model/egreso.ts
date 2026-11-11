import { EstadoPagoFactura, TipoDocumento } from './factura-pago';

export class Egreso {
	constructor(
		public id: number,
        public monto: string,
        public comentario: string,
        public tipo: number,
        public estado:number,
        public fecha:string,
        public usuarioId:number,
        public cajaId:number,
        // RF-FAC-01: datos de documento y estado de pago
        public tipo_documento?: TipoDocumento | null,
        public numero_documento?: string | null,
        public fecha_emision?: string | null,
        public fecha_vencimiento?: string | null,
        public estado_pago?: EstadoPagoFactura,
        public fecha_pago?: string | null
	){}
}