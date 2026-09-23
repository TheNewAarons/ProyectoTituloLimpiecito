import { TestBed } from '@angular/core/testing';

import { InstructivoService } from './instructivo.service';

describe('InstructivoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: InstructivoService = TestBed.get(InstructivoService);
    expect(service).toBeTruthy();
  });
});
