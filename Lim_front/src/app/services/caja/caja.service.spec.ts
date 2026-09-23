import { TestBed } from '@angular/core/testing';

import { CajaService } from './caja.service';

describe('CajaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CajaService = TestBed.get(CajaService);
    expect(service).toBeTruthy();
  });
});
