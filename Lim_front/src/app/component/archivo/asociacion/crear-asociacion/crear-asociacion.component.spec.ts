import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearAsociacionComponent } from './crear-asociacion.component';

describe('CrearAsociacionComponent', () => {
  let component: CrearAsociacionComponent;
  let fixture: ComponentFixture<CrearAsociacionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearAsociacionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearAsociacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
