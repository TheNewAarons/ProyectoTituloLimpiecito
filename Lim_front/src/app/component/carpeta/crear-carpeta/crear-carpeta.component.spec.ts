import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearCarpetaComponent } from './crear-carpeta.component';

describe('CrearCarpetaComponent', () => {
  let component: CrearCarpetaComponent;
  let fixture: ComponentFixture<CrearCarpetaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearCarpetaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearCarpetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
