import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormClienteSectorPevComponent } from './form-cliente-sector-pev.component';

describe('FormClienteSectorPevComponent', () => {
  let component: FormClienteSectorPevComponent;
  let fixture: ComponentFixture<FormClienteSectorPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FormClienteSectorPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormClienteSectorPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
