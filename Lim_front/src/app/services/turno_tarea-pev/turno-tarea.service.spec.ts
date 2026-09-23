import { TestBed } from '@angular/core/testing';

import { TurnoTareaService } from './turno-tarea.service';

describe('TurnoTareaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TurnoTareaService = TestBed.get(TurnoTareaService);
    expect(service).toBeTruthy();
  });
});
