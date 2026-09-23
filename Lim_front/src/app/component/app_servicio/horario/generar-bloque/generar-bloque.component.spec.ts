import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerarBloqueComponent } from './generar-bloque.component';

describe('GenerarBloqueComponent', () => {
  let component: GenerarBloqueComponent;
  let fixture: ComponentFixture<GenerarBloqueComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenerarBloqueComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenerarBloqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
