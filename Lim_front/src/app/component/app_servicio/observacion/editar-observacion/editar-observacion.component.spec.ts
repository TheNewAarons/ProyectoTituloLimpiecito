import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarObservacionComponent } from './editar-observacion.component';

describe('EditarObservacionComponent', () => {
  let component: EditarObservacionComponent;
  let fixture: ComponentFixture<EditarObservacionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarObservacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarObservacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
