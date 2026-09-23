import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AreasPevComponent } from './areas-pev.component';

describe('AreasPevComponent', () => {
  let component: AreasPevComponent;
  let fixture: ComponentFixture<AreasPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AreasPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AreasPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
