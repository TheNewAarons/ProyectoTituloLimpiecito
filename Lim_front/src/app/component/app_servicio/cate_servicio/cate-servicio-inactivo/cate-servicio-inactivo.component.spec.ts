import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CateServicioInactivoComponent } from './cate-servicio-inactivo.component';

describe('CateServicioInactivoComponent', () => {
  let component: CateServicioInactivoComponent;
  let fixture: ComponentFixture<CateServicioInactivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CateServicioInactivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CateServicioInactivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
