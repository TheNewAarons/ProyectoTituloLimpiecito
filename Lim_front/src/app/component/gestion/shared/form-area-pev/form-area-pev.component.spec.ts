import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormAreaPevComponent } from './form-area-pev.component';

describe('FormAreaPevComponent', () => {
  let component: FormAreaPevComponent;
  let fixture: ComponentFixture<FormAreaPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormAreaPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormAreaPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
