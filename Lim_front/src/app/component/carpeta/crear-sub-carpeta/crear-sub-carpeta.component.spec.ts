import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearSubCarpetaComponent } from './crear-sub-carpeta.component';

describe('CrearSubCarpetaComponent', () => {
  let component: CrearSubCarpetaComponent;
  let fixture: ComponentFixture<CrearSubCarpetaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearSubCarpetaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearSubCarpetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
