import { TestBed } from '@angular/core/testing';

import { ListasPevService } from './listas-pev.service';

describe('ListasPevService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ListasPevService = TestBed.get(ListasPevService);
    expect(service).toBeTruthy();
  });
});
