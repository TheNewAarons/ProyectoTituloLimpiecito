import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogAgregarComponent } from './dialog-agregar.component';

describe('DialogAgregarComponent', () => {
  let component: DialogAgregarComponent;
  let fixture: ComponentFixture<DialogAgregarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogAgregarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogAgregarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
