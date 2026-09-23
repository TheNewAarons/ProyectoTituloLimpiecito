import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicioInactivoComponent } from './servicio-inactivo.component';

describe('ServicioInactivoComponent', () => {
  let component: ServicioInactivoComponent;
  let fixture: ComponentFixture<ServicioInactivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ServicioInactivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ServicioInactivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
