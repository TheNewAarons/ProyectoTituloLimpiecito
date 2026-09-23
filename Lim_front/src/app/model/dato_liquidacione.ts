export class DatoLiquidacione {
	constructor(
		public id: number,
        public sueldo_base: string,
        public gratificacion: number,
        public responsabilidad: string,
		public colacion: string,
		public movilizacion: string,
		public alimentacion: string,
		public cant_familia: string,
		public valor_carga_familia: string
	){}
}