import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearListaPevTrabajadorComponent } from './crear-lista-pev-trabajador.component';

describe('CrearListaPevTrabajadorComponent', () => {
  let component: CrearListaPevTrabajadorComponent;
  let fixture: ComponentFixture<CrearListaPevTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearListaPevTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearListaPevTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
