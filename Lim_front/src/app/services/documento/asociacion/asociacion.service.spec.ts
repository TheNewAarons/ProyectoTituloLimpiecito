import { TestBed } from '@angular/core/testing';

import { AsociacionService } from './asociacion.service';

describe('AsociacionService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AsociacionService = TestBed.get(AsociacionService);
    expect(service).toBeTruthy();
  });
});
