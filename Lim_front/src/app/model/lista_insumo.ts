export class ListaInsumo{
	constructor(
		public id: number,
        public estado: number,
        public fecha:string,
        public total: number,
        public centroCostoId: number,
        public usuarioCreaId: number,
        public usuarioApruebaId:number
	){}
}