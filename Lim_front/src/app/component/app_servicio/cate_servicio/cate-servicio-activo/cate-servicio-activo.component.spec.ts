import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CateServicioActivoComponent } from './cate-servicio-activo.component';

describe('CateServicioActivoComponent', () => {
  let component: CateServicioActivoComponent;
  let fixture: ComponentFixture<CateServicioActivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CateServicioActivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CateServicioActivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
