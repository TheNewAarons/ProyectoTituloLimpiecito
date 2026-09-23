export class Caja {
	constructor(
		public id: number,
        public fecha_inicio: string,
        public fecha_cierre:string,
        public total_ingreso: string,
		public total_egreso: string,
		public utilidad: number,
        public total_perdida: number,
        public total_cf:number,
        public estado:number,
        public usuarioId:number
	){}
}