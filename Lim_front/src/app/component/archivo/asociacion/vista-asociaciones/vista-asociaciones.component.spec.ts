import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaAsociacionesComponent } from './vista-asociaciones.component';

describe('VistaAsociacionesComponent', () => {
  let component: VistaAsociacionesComponent;
  let fixture: ComponentFixture<VistaAsociacionesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaAsociacionesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaAsociacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
