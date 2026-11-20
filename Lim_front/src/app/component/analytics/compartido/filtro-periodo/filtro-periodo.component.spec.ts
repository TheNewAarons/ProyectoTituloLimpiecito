import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FiltroPeriodoComponent, generarMeses, mesActualSantiago } from './filtro-periodo.component';
import { RangoPeriodo } from '../../../../model/analytics';

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
    TestBed.configureTestingModule({ declarations: [FiltroPeriodoComponent], schemas: [NO_ERRORS_SCHEMA] }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FiltroPeriodoComponent);
    component = fixture.componentInstance;
    emitidos = [];
    component.cambio.subscribe((r: RangoPeriodo) => emitidos.push(r));
  });

  it('ngOnChanges genera mesesAtras opciones y por defecto desde = hasta = mes actual', () => {
    component.mesesAtras = 12;
    component.ngOnChanges();
    expect(component.meses.length).toBe(12);
    expect(component.meses[0]).toBe(mesActualSantiago());
    expect(component.hasta).toBe(mesActualSantiago());
    expect(component.desde).toBe(component.hasta);
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

  it('emite cuando desde == hasta', () => {
    component.desde = '2025-06';
    component.hasta = '2025-06';
    component.emitir();
    expect(emitidos.length).toBe(1);
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
    component.desde = '2024-12';
    component.hasta = '2025-01';
    expect(component.invalido).toBe(false);
  });
});
