import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaAreaPevComponent } from './tabla-area-pev.component';

describe('TablaAreaPevComponent', () => {
  let component: TablaAreaPevComponent;
  let fixture: ComponentFixture<TablaAreaPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TablaAreaPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TablaAreaPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
