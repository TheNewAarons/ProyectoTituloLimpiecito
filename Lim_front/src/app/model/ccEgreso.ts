export class CcEgreso {
	constructor(
		public id: number,
        public monto: string,
        public comentario: string,
        public fecha: string,
        public centroCostoId: number
        
	){}
}