import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { SelectorClienteComponent } from './selector-cliente.component';
import { ClienteService } from '../../../../services/cliente/cliente.service';

interface RespuestaClientes {
  clientes: { id: number; representante: string }[];
}

describe('SelectorClienteComponent', () => {
  let fixture: ComponentFixture<SelectorClienteComponent>;
  let component: SelectorClienteComponent;
  let servicio: jasmine.SpyObj<ClienteService>;

  beforeEach(async(() => {
    servicio = jasmine.createSpyObj<ClienteService>('ClienteService', ['obtenerClientesActivos']);
    TestBed.configureTestingModule({
      declarations: [SelectorClienteComponent],
      providers: [{ provide: ClienteService, useValue: servicio }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectorClienteComponent);
    component = fixture.componentInstance;
  });

  it('mapea clientes legacy {id, representante} a {id, nombre}', () => {
    const resp: RespuestaClientes = { clientes: [{ id: 5, representante: 'Juan' }] };
    servicio.obtenerClientesActivos.and.returnValue(of(resp));
    fixture.detectChanges();
    expect(component.clientes).toEqual([{ id: 5, nombre: 'Juan' }]);
  });

  it('respuesta sin clientes → lista vacía', () => {
    servicio.obtenerClientesActivos.and.returnValue(of({}));
    fixture.detectChanges();
    expect(component.clientes).toEqual([]);
  });

  it('error del servicio → lista vacía', () => {
    servicio.obtenerClientesActivos.and.returnValue(throwError({ status: 500 }));
    fixture.detectChanges();
    expect(component.clientes).toEqual([]);
  });

  it('se desuscribe al destruir', () => {
    const fuente = new Subject<RespuestaClientes>();
    servicio.obtenerClientesActivos.and.returnValue(fuente.asObservable());
    fixture.detectChanges();
    fixture.destroy();
    fuente.next({ clientes: [{ id: 1, representante: 'X' }] });
    expect(component.clientes).toEqual([]);
  });
});
