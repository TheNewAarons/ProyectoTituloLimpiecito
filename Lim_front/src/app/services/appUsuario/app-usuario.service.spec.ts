import { TestBed } from '@angular/core/testing';

import { AppUsuarioService } from './app-usuario.service';

describe('AppUsuarioService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AppUsuarioService = TestBed.get(AppUsuarioService);
    expect(service).toBeTruthy();
  });
});
