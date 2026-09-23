import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfLiquidacionComponent } from './pdf-liquidacion.component';

describe('PdfLiquidacionComponent', () => {
  let component: PdfLiquidacionComponent;
  let fixture: ComponentFixture<PdfLiquidacionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PdfLiquidacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfLiquidacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
