import { TestBed } from '@angular/core/testing';

import { EgresoService } from './egreso.service';

describe('EgresoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: EgresoService = TestBed.get(EgresoService);
    expect(service).toBeTruthy();
  });
});
