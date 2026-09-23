import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogTareaEditarNombreComponent } from './dialog-tarea-editar-nombre.component';

describe('DialogTareaEditarNombreComponent', () => {
  let component: DialogTareaEditarNombreComponent;
  let fixture: ComponentFixture<DialogTareaEditarNombreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogTareaEditarNombreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogTareaEditarNombreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
