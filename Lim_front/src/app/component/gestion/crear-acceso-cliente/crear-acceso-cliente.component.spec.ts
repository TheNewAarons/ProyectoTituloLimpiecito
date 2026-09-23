import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAccesoClienteComponent } from './crear-acceso-cliente.component';

describe('CrearAccesoClienteComponent', () => {
  let component: CrearAccesoClienteComponent;
  let fixture: ComponentFixture<CrearAccesoClienteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearAccesoClienteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearAccesoClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
