export class CcIngreso {
	constructor(
		public id: number,
        public monto: string,
        public comentario: string,
        public fecha: string,
        public centroCostoId: number
        
	){}
}