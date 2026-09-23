export class Producto {
	constructor(
		public id: number,
        public nombre: string,
        public descripcion: string,
        public tipo: number,
        public estado:number,
        public stock:string,
        public precio:string        
	){}
}