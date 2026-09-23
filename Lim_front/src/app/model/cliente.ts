export class Cliente {
	constructor(
		public id: number,
        public representante: string,
        public encargado_contrato: string,
        public fecha_facturacion: string,
        public fecha_inicio_contrato: string,
        public fecha_termino_contrato: string,  
        public cant_trabajadores: number, 
        public correo_encargado: string,
        public numero_contacto:number,
        public valor_factura: string,
        public otra_informacion: string,
        public estado: number
        
	){}
}