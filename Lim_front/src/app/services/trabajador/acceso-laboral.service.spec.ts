import { TestBed } from '@angular/core/testing';

import { AccesoLaboralService } from './acceso-laboral.service';

describe('AccesoLaboralService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AccesoLaboralService = TestBed.get(AccesoLaboralService);
    expect(service).toBeTruthy();
  });
});
