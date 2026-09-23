import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservaRechazadoComponent } from './reserva-rechazado.component';

describe('ReservaRechazadoComponent', () => {
  let component: ReservaRechazadoComponent;
  let fixture: ComponentFixture<ReservaRechazadoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReservaRechazadoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservaRechazadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
