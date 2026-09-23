import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerLiquidacionComponent } from './ver-liquidacion.component';

describe('VerLiquidacionComponent', () => {
  let component: VerLiquidacionComponent;
  let fixture: ComponentFixture<VerLiquidacionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerLiquidacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerLiquidacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
