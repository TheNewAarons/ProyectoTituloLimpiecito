import { Routes } from '@angular/router'

import { CentroCostoComponent } from './centro-costo.component';
import { VerCentroComponent } from './ver-centro/ver-centro.component';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { VerLiquidacionComponent } from './ver-liquidacion/ver-liquidacion.component';
import { EditarLiquidacionComponent } from './editar-liquidacion/editar-liquidacion.component';
import { PdfCentroComponent } from './pdf-centro/pdf-centro.component';
import { PdfListaInsumoComponent } from './pdf-lista-insumo/pdf-lista-insumo.component';
import { NuevaListaPdfComponent } from './nueva-lista-pdf/nueva-lista-pdf.component';


export const CentroRoutes: Routes = [
    {
        path:'',
        children: [{
            path:'centro_costos',
            component: CentroCostoComponent
        }]
    },{
        path:'',
        children: [{
            path:'ver/:id',
            component: VerCentroComponent
        }]
    },{
        path:'',
        children: [{
            path:'liquidacion/crear/:idTrabajador/:idCentro/:idCentroTrabajador',
            component: LiquidacionComponent
        }]
    },{
        path:'',
        children: [{
            path:'liquidacion/ver/:id',
            component: VerLiquidacionComponent
        }]
    },{
        path:'',
        children: [{
            path:'liquidacion/editar/:idLiquidacion/:idTrabajador',
            component: EditarLiquidacionComponent
        }]
    },{
        path:'',
        children: [{
            path:'centro_costos/vista_previa/:id',
            component: PdfCentroComponent
        }]
    },{
        path:'',
        children: [{
            path:'lista_insumo/vista_previa/:id/:id2',
            component: PdfListaInsumoComponent
        }]
    },{
        path:'',
        children: [{
            path:'lista_insumo/nueva_vista/:id/:id2',
            component: NuevaListaPdfComponent
        }]
    }
]
