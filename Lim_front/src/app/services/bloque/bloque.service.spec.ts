import { TestBed } from '@angular/core/testing';

import { BloqueService } from './bloque.service';

describe('BloqueService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BloqueService = TestBed.get(BloqueService);
    expect(service).toBeTruthy();
  });
});
