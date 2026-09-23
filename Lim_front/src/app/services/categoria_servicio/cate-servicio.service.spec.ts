import { TestBed } from '@angular/core/testing';

import { CateServicioService } from './cate-servicio.service';

describe('CateServicioService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CateServicioService = TestBed.get(CateServicioService);
    expect(service).toBeTruthy();
  });
});
