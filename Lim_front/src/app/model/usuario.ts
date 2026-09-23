export class Usuario {
	constructor(
		public id: number,
        public nombre: string,
        public apellido: string,
        public password:string,
        public correo:string,
        public rut:string,
        public estado: number,
        public roleId:number
        
	){}
}