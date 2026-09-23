import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaListaPevTrabajadorComponent } from './vista-lista-pev-trabajador.component';

describe('VistaListaPevTrabajadorComponent', () => {
  let component: VistaListaPevTrabajadorComponent;
  let fixture: ComponentFixture<VistaListaPevTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaListaPevTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaListaPevTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
