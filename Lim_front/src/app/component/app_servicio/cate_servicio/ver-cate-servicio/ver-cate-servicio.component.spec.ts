import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCateServicioComponent } from './ver-cate-servicio.component';

describe('VerCateServicioComponent', () => {
  let component: VerCateServicioComponent;
  let fixture: ComponentFixture<VerCateServicioComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCateServicioComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCateServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
