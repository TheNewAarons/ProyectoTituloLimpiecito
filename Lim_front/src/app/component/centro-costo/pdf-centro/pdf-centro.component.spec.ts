import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfCentroComponent } from './pdf-centro.component';

describe('PdfCentroComponent', () => {
  let component: PdfCentroComponent;
  let fixture: ComponentFixture<PdfCentroComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PdfCentroComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfCentroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
