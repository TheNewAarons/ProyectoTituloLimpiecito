export class Egreso {
	constructor(
		public id: number,
        public monto: string,
        public comentario: string,
        public tipo: number,
        public estado:number,
        public fecha:string,
        public usuarioId:number,
        public cajaId:number        
	){}
}