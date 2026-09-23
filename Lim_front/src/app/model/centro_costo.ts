export class Centro_costo {
	constructor(
		public id: number,
        public fecha_inicio: string,
        public fecha_cierre: string,
        public precio_servicio: string,
        public total_costos: number,
        public utilidad:number,
        public numero_cc:number,
        public estado:number,
        public clienteId:number,
        public cajaId:number
	){}
}