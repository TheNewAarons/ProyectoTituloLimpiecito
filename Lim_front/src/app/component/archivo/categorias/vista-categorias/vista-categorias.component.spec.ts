import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaCategoriasComponent } from './vista-categorias.component';

describe('VistaCategoriasComponent', () => {
  let component: VistaCategoriasComponent;
  let fixture: ComponentFixture<VistaCategoriasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaCategoriasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaCategoriasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
