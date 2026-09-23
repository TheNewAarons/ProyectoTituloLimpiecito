export class LineaInsumo {
	constructor(
		public id: number,
        public cantidad: number,
        public precio: number,
        public total_linea: number,
        public nombre:string,
        public productoId: number,
        public listaInsumoId: number
        
	){}
}