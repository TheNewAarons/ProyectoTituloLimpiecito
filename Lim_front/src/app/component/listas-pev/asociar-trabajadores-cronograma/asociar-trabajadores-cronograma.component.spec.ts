import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AsociarTrabajadoresCronogramaComponent } from './asociar-trabajadores-cronograma.component';

describe('AsociarTrabajadoresCronogramaComponent', () => {
  let component: AsociarTrabajadoresCronogramaComponent;
  let fixture: ComponentFixture<AsociarTrabajadoresCronogramaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AsociarTrabajadoresCronogramaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AsociarTrabajadoresCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
