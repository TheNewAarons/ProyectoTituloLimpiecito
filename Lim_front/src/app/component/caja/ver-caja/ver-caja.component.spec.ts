import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCajaComponent } from './ver-caja.component';

describe('VerCajaComponent', () => {
  let component: VerCajaComponent;
  let fixture: ComponentFixture<VerCajaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCajaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
