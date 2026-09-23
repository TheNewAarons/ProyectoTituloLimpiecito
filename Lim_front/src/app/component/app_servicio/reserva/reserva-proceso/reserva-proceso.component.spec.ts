import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservaProcesoComponent } from './reserva-proceso.component';

describe('ReservaProcesoComponent', () => {
  let component: ReservaProcesoComponent;
  let fixture: ComponentFixture<ReservaProcesoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReservaProcesoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservaProcesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
