import { TestBed } from '@angular/core/testing';

import { TrabajadorService } from './trabajador.service';

describe('TrabajadorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TrabajadorService = TestBed.get(TrabajadorService);
    expect(service).toBeTruthy();
  });
});
