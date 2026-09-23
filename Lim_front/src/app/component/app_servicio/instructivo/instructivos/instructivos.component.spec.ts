import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructivosComponent } from './instructivos.component';

describe('InstructivosComponent', () => {
  let component: InstructivosComponent;
  let fixture: ComponentFixture<InstructivosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InstructivosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InstructivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
