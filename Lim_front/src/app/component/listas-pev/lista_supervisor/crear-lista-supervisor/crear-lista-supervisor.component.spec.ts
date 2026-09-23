import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearListaSupervisorComponent } from './crear-lista-supervisor.component';

describe('CrearListaSupervisorComponent', () => {
  let component: CrearListaSupervisorComponent;
  let fixture: ComponentFixture<CrearListaSupervisorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearListaSupervisorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearListaSupervisorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
