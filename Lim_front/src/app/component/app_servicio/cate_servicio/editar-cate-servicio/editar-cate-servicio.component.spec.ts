import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarCateServicioComponent } from './editar-cate-servicio.component';

describe('EditarCateServicioComponent', () => {
  let component: EditarCateServicioComponent;
  let fixture: ComponentFixture<EditarCateServicioComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarCateServicioComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarCateServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
