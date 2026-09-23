import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicioActivoComponent } from './servicio-activo.component';

describe('ServicioActivoComponent', () => {
  let component: ServicioActivoComponent;
  let fixture: ComponentFixture<ServicioActivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ServicioActivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ServicioActivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
