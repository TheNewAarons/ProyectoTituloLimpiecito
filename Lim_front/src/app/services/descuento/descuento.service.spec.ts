import { TestBed } from '@angular/core/testing';

import { DescuentoService } from './descuento.service';

describe('DescuentoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DescuentoService = TestBed.get(DescuentoService);
    expect(service).toBeTruthy();
  });
});
