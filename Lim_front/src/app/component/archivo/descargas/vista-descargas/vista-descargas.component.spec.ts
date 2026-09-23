import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VistaDescargasComponent } from './vista-descargas.component';

describe('VistaDescargasComponent', () => {
  let component: VistaDescargasComponent;
  let fixture: ComponentFixture<VistaDescargasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VistaDescargasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VistaDescargasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
