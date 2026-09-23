import { TestBed } from '@angular/core/testing';

import { CheckeoService } from './checkeo.service';

describe('CheckeoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CheckeoService = TestBed.get(CheckeoService);
    expect(service).toBeTruthy();
  });
});
