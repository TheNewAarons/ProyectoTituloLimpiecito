import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerDocumentoComponent } from './ver-documento.component';

describe('VerDocumentoComponent', () => {
  let component: VerDocumentoComponent;
  let fixture: ComponentFixture<VerDocumentoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerDocumentoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerDocumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
