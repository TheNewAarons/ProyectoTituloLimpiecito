import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogSectorEditarNombreComponent } from './dialog-sector-editar-nombre.component';

describe('DialogSectorEditarNombreComponent', () => {
  let component: DialogSectorEditarNombreComponent;
  let fixture: ComponentFixture<DialogSectorEditarNombreComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogSectorEditarNombreComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogSectorEditarNombreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
