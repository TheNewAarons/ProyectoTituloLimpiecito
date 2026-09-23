import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfListaInsumoComponent } from './pdf-lista-insumo.component';

describe('PdfListaInsumoComponent', () => {
  let component: PdfListaInsumoComponent;
  let fixture: ComponentFixture<PdfListaInsumoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PdfListaInsumoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfListaInsumoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
