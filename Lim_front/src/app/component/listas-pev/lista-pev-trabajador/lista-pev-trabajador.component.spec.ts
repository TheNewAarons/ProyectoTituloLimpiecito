import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaPevTrabajadorComponent } from './lista-pev-trabajador.component';

describe('ListaPevTrabajadorComponent', () => {
  let component: ListaPevTrabajadorComponent;
  let fixture: ComponentFixture<ListaPevTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListaPevTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaPevTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
