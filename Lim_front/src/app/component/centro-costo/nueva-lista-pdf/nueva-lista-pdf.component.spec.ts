import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NuevaListaPdfComponent } from './nueva-lista-pdf.component';

describe('NuevaListaPdfComponent', () => {
  let component: NuevaListaPdfComponent;
  let fixture: ComponentFixture<NuevaListaPdfComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NuevaListaPdfComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevaListaPdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
