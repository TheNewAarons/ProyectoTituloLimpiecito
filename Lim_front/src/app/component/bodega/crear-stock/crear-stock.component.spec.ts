import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearStockComponent } from './crear-stock.component';

describe('CrearStockComponent', () => {
  let component: CrearStockComponent;
  let fixture: ComponentFixture<CrearStockComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearStockComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearStockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
