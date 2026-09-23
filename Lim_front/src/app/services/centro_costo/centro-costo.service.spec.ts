import { TestBed } from '@angular/core/testing';

import { CentroCostoService } from './centro-costo.service';

describe('CentroCostoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CentroCostoService = TestBed.get(CentroCostoService);
    expect(service).toBeTruthy();
  });
});
