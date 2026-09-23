import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarInstructivoComponent } from './editar-instructivo.component';

describe('EditarInstructivoComponent', () => {
  let component: EditarInstructivoComponent;
  let fixture: ComponentFixture<EditarInstructivoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarInstructivoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarInstructivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
