import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TablaTareaPevComponent } from './tabla-tarea-pev.component';

describe('TablaTareaPevComponent', () => {
  let component: TablaTareaPevComponent;
  let fixture: ComponentFixture<TablaTareaPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TablaTareaPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TablaTareaPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
