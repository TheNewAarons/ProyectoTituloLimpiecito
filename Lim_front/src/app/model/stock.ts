export class Stock {
	constructor(
		public id: number,
        public cantidad: number,
        public comentario: string,
        public fecha:string,
        public productoId: number,
        public nombre_producto: string
        
	){}
}