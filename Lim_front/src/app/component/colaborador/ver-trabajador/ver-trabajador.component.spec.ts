import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerTrabajadorComponent } from './ver-trabajador.component';

describe('VerTrabajadorComponent', () => {
  let component: VerTrabajadorComponent;
  let fixture: ComponentFixture<VerTrabajadorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerTrabajadorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerTrabajadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
