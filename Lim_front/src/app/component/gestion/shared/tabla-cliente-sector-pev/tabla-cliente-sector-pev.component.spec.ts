import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaClienteSectorPevComponent } from './tabla-cliente-sector-pev.component';

describe('TablaClienteSectorPevComponent', () => {
  let component: TablaClienteSectorPevComponent;
  let fixture: ComponentFixture<TablaClienteSectorPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TablaClienteSectorPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TablaClienteSectorPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
