import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearTrabajadorComponent } from './crear-trabajador.component';

describe('CrearTrabajadorComponent', () => {
  let component: CrearTrabajadorComponent;
  let fixture: ComponentFixture<CrearTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
