import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAreasPevComponent } from './crear-areas-pev.component';

describe('CrearAreasPevComponent', () => {
  let component: CrearAreasPevComponent;
  let fixture: ComponentFixture<CrearAreasPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearAreasPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearAreasPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
