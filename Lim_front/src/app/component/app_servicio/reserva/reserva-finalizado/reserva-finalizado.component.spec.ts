import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservaFinalizadoComponent } from './reserva-finalizado.component';

describe('ReservaFinalizadoComponent', () => {
  let component: ReservaFinalizadoComponent;
  let fixture: ComponentFixture<ReservaFinalizadoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReservaFinalizadoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservaFinalizadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
