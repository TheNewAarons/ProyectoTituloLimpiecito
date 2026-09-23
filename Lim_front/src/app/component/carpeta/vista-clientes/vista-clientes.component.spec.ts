import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaClientesComponent } from './vista-clientes.component';

describe('VistaClientesComponent', () => {
  let component: VistaClientesComponent;
  let fixture: ComponentFixture<VistaClientesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaClientesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
