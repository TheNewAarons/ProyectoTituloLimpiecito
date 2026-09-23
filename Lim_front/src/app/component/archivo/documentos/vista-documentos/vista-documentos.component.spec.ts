import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaDocumentosComponent } from './vista-documentos.component';

describe('VistaDocumentosComponent', () => {
  let component: VistaDocumentosComponent;
  let fixture: ComponentFixture<VistaDocumentosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaDocumentosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaDocumentosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
