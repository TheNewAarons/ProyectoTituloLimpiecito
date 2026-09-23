export class Trabajador {
	constructor(
		public id: number,
        public nombre: string,
        public apellido: string,
        public rut: string,
        public telefono:number,
        public telefono_emergencia:number,
        public correo:string,
        public direccion:string,
        public fecha_nacimiento:string,
        public sexo:number,
        public estado:number,
        public n_empleado:number,
        public fecha_inicio_contrato: string,
        public fecha_termino_contrato: string,
        //public carga_familiar:number,
        public enfermedad_cronica:string,
        public saludeId:number,
        public seguroId:number,
        public institutoPrevisioneId:number,
        public datoLiquidacioneId:number
        
	){}
}