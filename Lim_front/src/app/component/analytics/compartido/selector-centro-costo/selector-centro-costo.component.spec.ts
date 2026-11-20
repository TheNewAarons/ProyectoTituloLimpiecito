import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { SelectorCentroCostoComponent } from './selector-centro-costo.component';
import { SolicitudBodegaService } from '../../../../services/solicitud-bodega/solicitud-bodega.service';
import { CentroPermitido, RespuestaBodega } from '../../../../model/solicitud-bodega';

describe('SelectorCentroCostoComponent', () => {
  let fixture: ComponentFixture<SelectorCentroCostoComponent>;
  let component: SelectorCentroCostoComponent;
  let servicio: jasmine.SpyObj<SolicitudBodegaService>;
  const CENTROS: CentroPermitido[] = [{ id: 1, numero_cc: 101, cliente: 'Acme' }, { id: 2, numero_cc: 102, cliente: '' }];

  beforeEach(async(() => {
    servicio = jasmine.createSpyObj<SolicitudBodegaService>('SolicitudBodegaService', ['obtenerCentros']);
    TestBed.configureTestingModule({
      declarations: [SelectorCentroCostoComponent],
      providers: [{ provide: SolicitudBodegaService, useValue: servicio }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectorCentroCostoComponent);
    component = fixture.componentInstance;
  });

  it('carga los centros del servicio', () => {
    servicio.obtenerCentros.and.returnValue(of({ ok: true, data: CENTROS, meta: {} } as RespuestaBodega<CentroPermitido[]>));
    fixture.detectChanges();
    expect(component.centros).toEqual(CENTROS);
  });

  it('error del servicio deja la lista vacía', () => {
    servicio.obtenerCentros.and.returnValue(throwError({ status: 403 }));
    fixture.detectChanges();
    expect(component.centros).toEqual([]);
  });

  it('etiqueta con y sin cliente', () => {
    expect(component.etiquetaCentro(CENTROS[0])).toBe('CC 101 · Acme');
    expect(component.etiquetaCentro(CENTROS[1])).toBe('CC 102');
  });

  it('se desuscribe al destruir', () => {
    const fuente = new Subject<RespuestaBodega<CentroPermitido[]>>();
    servicio.obtenerCentros.and.returnValue(fuente.asObservable());
    fixture.detectChanges();
    fixture.destroy();
    fuente.next({ ok: true, data: CENTROS, meta: {} });
    expect(component.centros).toEqual([]);
  });
});
