import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAccesoTrabajadorComponent } from './crear-acceso-trabajador.component';

describe('CrearAccesoTrabajadorComponent', () => {
  let component: CrearAccesoTrabajadorComponent;
  let fixture: ComponentFixture<CrearAccesoTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearAccesoTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearAccesoTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
