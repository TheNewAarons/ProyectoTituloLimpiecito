import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarLiquidacionComponent } from './editar-liquidacion.component';

describe('EditarLiquidacionComponent', () => {
  let component: EditarLiquidacionComponent;
  let fixture: ComponentFixture<EditarLiquidacionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditarLiquidacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditarLiquidacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
