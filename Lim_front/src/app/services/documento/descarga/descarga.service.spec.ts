import { TestBed } from '@angular/core/testing';

import { DescargaService } from './descarga.service';

describe('DescargaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DescargaService = TestBed.get(DescargaService);
    expect(service).toBeTruthy();
  });
});
