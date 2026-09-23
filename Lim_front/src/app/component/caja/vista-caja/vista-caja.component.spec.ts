import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaCajaComponent } from './vista-caja.component';

describe('VistaCajaComponent', () => {
  let component: VistaCajaComponent;
  let fixture: ComponentFixture<VistaCajaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaCajaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaCajaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
