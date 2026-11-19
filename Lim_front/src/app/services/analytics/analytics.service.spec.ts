import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';
import { LoginService } from '../login/login.service';
import { environment } from '../../../environments/environment';
import { RespuestaAnalytics } from '../../model/analytics';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let http: HttpTestingController;
  let token: string | null;
  const BASE = environment.url + '/api/v1/analytics';

  beforeEach(() => {
    token = 'tok-123';
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: LoginService, useValue: { getToken: (): string | null => token } }]
    });
    service = TestBed.get(AnalyticsService);
    http = TestBed.get(HttpTestingController);
  });

  afterEach(() => http.verify());

  function esperarGet(ruta: string): TestRequest {
    return http.expectOne((r) => r.url === BASE + ruta && r.method === 'GET');
  }

  it('GET a url_analytics + ruta con header x-access-token y devuelve la respuesta', () => {
    let recibido: RespuestaAnalytics<number[]> | undefined;
    service.obtener<number[]>('/bodega/top-productos').subscribe((r: RespuestaAnalytics<number[]>) => { recibido = r; });
    const req = esperarGet('/bodega/top-productos');
    expect(req.request.headers.get('x-access-token')).toBe('tok-123');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ ok: true, data: [1, 2], meta: {} });
    expect(recibido).toEqual({ ok: true, data: [1, 2], meta: {} });
  });

  it('convierte filtros a snake_case', () => {
    service.obtener('/financiero/resumen', { desde: '2025-01', hasta: '2025-06', periodo: '2025-03', centroCostoId: 7, clienteId: 9 }).subscribe();
    const p = esperarGet('/financiero/resumen').request.params;
    expect(p.get('desde')).toBe('2025-01');
    expect(p.get('hasta')).toBe('2025-06');
    expect(p.get('periodo')).toBe('2025-03');
    expect(p.get('centro_costo_id')).toBe('7');
    expect(p.get('cliente_id')).toBe('9');
    expect(p.has('centroCostoId')).toBe(false);
  });

  it('omite filtros null, undefined y vacíos, pero conserva 0', () => {
    service.obtener('/x', { desde: '', hasta: undefined, centroCostoId: null, clienteId: 0 }).subscribe();
    const p = esperarGet('/x').request.params;
    expect(p.keys()).toEqual(['cliente_id']);
    expect(p.get('cliente_id')).toBe('0');
  });

  it('sin token envía x-access-token vacío', () => {
    token = null;
    service.obtener('/x').subscribe();
    expect(esperarGet('/x').request.headers.get('x-access-token')).toBe('');
  });

  it('propaga errores HTTP al suscriptor (sin catchError)', () => {
    let estado = 0;
    service.obtener('/financiero').subscribe(() => fail('no debía emitir'), (e: { status: number }) => { estado = e.status; });
    esperarGet('/financiero').flush({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403, statusText: 'Forbidden' });
    expect(estado).toBe(403);
  });
});
