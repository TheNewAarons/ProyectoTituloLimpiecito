import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FiltroPeriodoComponent, generarMeses, mesActualSantiago, primerMesDe, rangoDesdeQuery } from './filtro-periodo.component';
import { RangoPeriodo } from '../../../../model/analytics';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AnalyticsService } from '../../../../services/analytics/analytics.service';

describe('generarMeses', () => {
  it('genera meses hacia atrás, más reciente primero, con cero a la izquierda', () => {
    expect(generarMeses('2026-03', 4)).toEqual(['2026-03', '2026-02', '2026-01', '2025-12']);
  });

  it('cruza varios años correctamente', () => {
    const meses = generarMeses('2026-01', 25);
    expect(meses.length).toBe(25);
    expect(meses[12]).toBe('2025-01');
    expect(meses[24]).toBe('2024-01');
  });

  it('cantidad 0 → lista vacía', () => {
    expect(generarMeses('2026-01', 0)).toEqual([]);
  });
});

describe('mesActualSantiago', () => {
  it('devuelve YYYY-MM', () => {
    expect(mesActualSantiago()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});

describe('FiltroPeriodoComponent', () => {
  let fixture: ComponentFixture<FiltroPeriodoComponent>;
  let component: FiltroPeriodoComponent;
  let emitidos: RangoPeriodo[];

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FiltroPeriodoComponent],
      providers: [{ provide: AnalyticsService, useValue: { primerosPeriodos: () => of(null) } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FiltroPeriodoComponent);
    component = fixture.componentInstance;
    emitidos = [];
    component.cambio.subscribe((r: RangoPeriodo) => emitidos.push(r));
  });

  it('ngOnChanges genera mesesAtras opciones y por defecto hasta = mes actual y desde = 3 meses atrás', () => {
    component.mesesAtras = 12;
    component.ngOnChanges();
    expect(component.meses.length).toBe(12);
    expect(component.meses[0]).toBe(mesActualSantiago());
    expect(component.hasta).toBe(mesActualSantiago());
    expect(component.desde).toBe(generarMeses(mesActualSantiago(), 3)[2]);
  });

  it('limitarA quita los meses sin datos y corre el desde al primer mes con datos', async () => {
    const actual = mesActualSantiago();
    const primer = generarMeses(actual, 5)[4];
    component.desde = generarMeses(actual, 12)[11];
    component.hasta = actual;
    component.limitarA(primer);
    expect(component.meses.length).toBe(5);
    expect(component.meses[4]).toBe(primer);
    expect(component.desde).toBe(primer);
    await Promise.resolve();
    expect(emitidos).toEqual([{ desde: primer, hasta: actual }]);
  });

  it('primerMesDe usa la fuente o, sin fuente, el más antiguo', () => {
    const p = { financiero: '2025-11', rentabilidad: '2025-11', bodega: '2025-12', productividad: null };
    expect(primerMesDe(p, 'bodega')).toBe('2025-12');
    expect(primerMesDe(p, 'productividad')).toBeNull();
    expect(primerMesDe(p, null)).toBe('2025-11');
    expect(primerMesDe(null, 'bodega')).toBeNull();
  });

  it('respeta desde/hasta recibidos por input', () => {
    component.desde = '2025-01';
    component.hasta = '2025-06';
    component.ngOnChanges();
    expect(component.desde).toBe('2025-01');
    expect(component.hasta).toBe('2025-06');
  });

  it('emite {desde, hasta} cuando el rango es válido', () => {
    component.desde = '2025-01';
    component.hasta = '2025-06';
    component.emitir();
    expect(emitidos).toEqual([{ desde: '2025-01', hasta: '2025-06' }]);
  });

  it('emite con exactamente 3 meses y no con menos', () => {
    component.desde = '2025-04';
    component.hasta = '2025-06';
    component.emitir();
    expect(emitidos.length).toBe(1);
    component.desde = '2025-05';
    component.emitir();
    component.desde = '2025-06';
    component.emitir();
    expect(emitidos.length).toBe(1);
    expect(component.invalido).toBe(true);
  });

  it('no emite y marca inválido si desde > hasta, mostrando el aviso', () => {
    component.desde = '2025-07';
    component.hasta = '2025-06';
    component.emitir();
    fixture.detectChanges();
    expect(component.invalido).toBe(true);
    expect(emitidos).toEqual([]);
    expect(fixture.nativeElement.querySelector('.text-danger')).not.toBeNull();
  });

  it('compara bien a través del cambio de año', () => {
    component.desde = '2024-11';
    component.hasta = '2025-01';
    expect(component.invalido).toBe(false);
    component.desde = '2024-12';
    expect(component.invalido).toBe(true);
  });

  it('deshabilita los meses que dejarían menos de 3 meses, según el otro extremo', () => {
    component.desde = '2025-01';
    component.hasta = '2025-06';
    expect(component.desdeDeshabilitado('2025-04')).toBe(false);
    expect(component.desdeDeshabilitado('2025-05')).toBe(true);
    expect(component.hastaDeshabilitado('2025-03')).toBe(false);
    expect(component.hastaDeshabilitado('2025-02')).toBe(true);
    component.mesesMinimos = 1;
    expect(component.desdeDeshabilitado('2025-06')).toBe(false);
    expect(component.desdeDeshabilitado('2025-07')).toBe(true);
  });

  it('rangoDesdeQuery acepta solo rangos válidos de la URL', () => {
    expect(rangoDesdeQuery(convertToParamMap({ desde: '2025-01', hasta: '2025-06' }))).toEqual({ desde: '2025-01', hasta: '2025-06' });
    expect(rangoDesdeQuery(convertToParamMap({ desde: '2025-05', hasta: '2025-06' }))).toBeNull();
    expect(rangoDesdeQuery(convertToParamMap({ desde: 'x', hasta: '2025-06' }))).toBeNull();
    expect(rangoDesdeQuery(convertToParamMap({}))).toBeNull();
  });
});
