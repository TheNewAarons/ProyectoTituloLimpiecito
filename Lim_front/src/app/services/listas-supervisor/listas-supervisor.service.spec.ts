import { TestBed } from '@angular/core/testing';

import { ListasSupervisorService } from './listas-supervisor.service';

describe('ListasSupervisorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ListasSupervisorService = TestBed.get(ListasSupervisorService);
    expect(service).toBeTruthy();
  });
});
