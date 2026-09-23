import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogImprimirListaCheckComponent } from './dialog-imprimir-lista-check.component';

describe('DialogImprimirListaCheckComponent', () => {
  let component: DialogImprimirListaCheckComponent;
  let fixture: ComponentFixture<DialogImprimirListaCheckComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogImprimirListaCheckComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogImprimirListaCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
