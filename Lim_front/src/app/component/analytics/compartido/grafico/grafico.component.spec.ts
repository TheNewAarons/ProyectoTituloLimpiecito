import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { GraficoComponent } from './grafico.component';

// NO_ERRORS_SCHEMA: se prueba el mapeo, no el render de chart.js en canvas.
describe('GraficoComponent', () => {
  let fixture: ComponentFixture<GraficoComponent>;
  let component: GraficoComponent;

  beforeEach(async(() => {
    TestBed.configureTestingModule({ declarations: [GraficoComponent], schemas: [NO_ERRORS_SCHEMA] }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraficoComponent);
    component = fixture.componentInstance;
  });

  it('mapea series a datasets de chart.js', () => {
    component.series = [{ etiqueta: 'Ventas', datos: [1, 2] }, { etiqueta: 'Costos', datos: [3] }];
    component.ngOnChanges();
    expect(component.datasets).toEqual([
      { label: 'Ventas', data: [1, 2], fill: false },
      { label: 'Costos', data: [3], fill: false }
    ]);
  });

  it('series null o vacías → sin datasets y muestra "Sin datos"', () => {
    component.series = null;
    component.ngOnChanges();
    fixture.detectChanges();
    expect(component.datasets).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Sin datos');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
  });

  it('con datos renderiza canvas y título', () => {
    component.titulo = 'Tendencia';
    component.series = [{ etiqueta: 'A', datos: [1] }];
    component.ngOnChanges();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('canvas')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h4').textContent).toContain('Tendencia');
  });
});
