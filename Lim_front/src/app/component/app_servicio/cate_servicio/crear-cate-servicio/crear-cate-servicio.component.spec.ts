import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearCateServicioComponent } from './crear-cate-servicio.component';

describe('CrearCateServicioComponent', () => {
  let component: CrearCateServicioComponent;
  let fixture: ComponentFixture<CrearCateServicioComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearCateServicioComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearCateServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
