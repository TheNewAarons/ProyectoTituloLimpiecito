import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaCategoriasInactivasComponent } from './vista-categorias-inactivas.component';

describe('VistaCategoriasInactivasComponent', () => {
  let component: VistaCategoriasInactivasComponent;
  let fixture: ComponentFixture<VistaCategoriasInactivasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaCategoriasInactivasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaCategoriasInactivasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
