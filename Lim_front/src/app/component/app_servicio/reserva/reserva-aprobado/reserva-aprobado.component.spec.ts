import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservaAprobadoComponent } from './reserva-aprobado.component';

describe('ReservaAprobadoComponent', () => {
  let component: ReservaAprobadoComponent;
  let fixture: ComponentFixture<ReservaAprobadoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReservaAprobadoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservaAprobadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
