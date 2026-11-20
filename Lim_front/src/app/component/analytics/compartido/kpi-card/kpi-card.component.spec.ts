import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { KpiCardComponent } from './kpi-card.component';

describe('KpiCardComponent', () => {
  let fixture: ComponentFixture<KpiCardComponent>;
  let component: KpiCardComponent;

  beforeAll(() => registerLocaleData(localeEsCl)); // en la app lo registra app.module

  beforeEach(async(() => {
    TestBed.configureTestingModule({ declarations: [KpiCardComponent] }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KpiCardComponent);
    component = fixture.componentInstance;
  });

  function valorMostrado(): string {
    const el: HTMLElement = fixture.nativeElement;
    return (el.querySelector('h3.card-title') as HTMLElement).textContent.trim();
  }

  it('valor null muestra "Sin datos"', () => {
    fixture.detectChanges();
    expect(valorMostrado()).toBe('Sin datos');
  });

  it('formato clp muestra $ con separador de miles es-CL y sin decimales', () => {
    component.valor = 1234567;
    component.formato = 'clp';
    fixture.detectChanges();
    expect(valorMostrado()).toBe('$ 1.234.567');
  });

  it('formato porcentaje muestra un decimal y %', () => {
    component.valor = 12.34;
    component.formato = 'porcentaje';
    fixture.detectChanges();
    expect(valorMostrado()).toBe('12,3 %');
  });

  it('formato numero sin símbolo', () => {
    component.valor = 1500;
    component.formato = 'numero';
    fixture.detectChanges();
    expect(valorMostrado()).toBe('1.500');
  });

  it('valor 0 no se trata como "Sin datos"', () => {
    component.valor = 0;
    fixture.detectChanges();
    expect(valorMostrado()).toBe('$ 0');
  });

  it('cargando oculta el valor', () => {
    component.valor = 10;
    component.cargando = true;
    fixture.detectChanges();
    expect(valorMostrado()).toBe('…');
  });

  it('aplica la clase de color, título y detalle', () => {
    component.color = 'success';
    component.titulo = 'Ventas';
    component.detalle = 'Mes actual';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.card-header').classList).toContain('card-header-success');
    expect(el.querySelector('.card-category').textContent).toContain('Ventas');
    expect(el.querySelector('.card-footer .stats').textContent).toContain('Mes actual');
  });

  it('sin detalle no renderiza footer', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.card-footer')).toBeNull();
  });
});
