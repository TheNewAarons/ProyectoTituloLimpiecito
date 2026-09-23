import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarCronogramaComponent } from './editar-cronograma.component';

describe('EditarCronogramaComponent', () => {
  let component: EditarCronogramaComponent;
  let fixture: ComponentFixture<EditarCronogramaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarCronogramaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
