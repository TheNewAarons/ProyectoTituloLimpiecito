import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogCronogramaComponent } from './dialog-cronograma.component';

describe('DialogCronogramaComponent', () => {
  let component: DialogCronogramaComponent;
  let fixture: ComponentFixture<DialogCronogramaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogCronogramaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogCronogramaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
