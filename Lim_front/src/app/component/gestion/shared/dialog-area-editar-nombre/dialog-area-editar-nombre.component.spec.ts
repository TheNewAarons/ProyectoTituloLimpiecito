import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAreaEditarNombreComponent } from './dialog-area-editar-nombre.component';

describe('DialogAreaEditarNombreComponent', () => {
  let component: DialogAreaEditarNombreComponent;
  let fixture: ComponentFixture<DialogAreaEditarNombreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogAreaEditarNombreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAreaEditarNombreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
