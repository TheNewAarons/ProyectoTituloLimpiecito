import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogImprimirListaSupervisorComponent } from './dialog-imprimir-lista-supervisor.component';

describe('DialogImprimirListaSupervisorComponent', () => {
  let component: DialogImprimirListaSupervisorComponent;
  let fixture: ComponentFixture<DialogImprimirListaSupervisorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogImprimirListaSupervisorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogImprimirListaSupervisorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
