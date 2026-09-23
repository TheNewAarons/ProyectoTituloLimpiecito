import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerListaSupervisorComponent } from './ver-lista-supervisor.component';

describe('VerListaSupervisorComponent', () => {
  let component: VerListaSupervisorComponent;
  let fixture: ComponentFixture<VerListaSupervisorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerListaSupervisorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerListaSupervisorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
