import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearSectorPevComponent } from './crear-sector-pev.component';

describe('CrearSectorPevComponent', () => {
  let component: CrearSectorPevComponent;
  let fixture: ComponentFixture<CrearSectorPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearSectorPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearSectorPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
