import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearDocumentoComponent } from './crear-documento.component';

describe('CrearDocumentoComponent', () => {
  let component: CrearDocumentoComponent;
  let fixture: ComponentFixture<CrearDocumentoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CrearDocumentoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CrearDocumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
