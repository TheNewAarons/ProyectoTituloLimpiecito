import { TestBed } from '@angular/core/testing';

import { CarpetaService } from './carpeta.service';

describe('CarpetaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CarpetaService = TestBed.get(CarpetaService);
    expect(service).toBeTruthy();
  });
});
