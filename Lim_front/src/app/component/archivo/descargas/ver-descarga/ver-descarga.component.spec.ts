import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerDescargaComponent } from './ver-descarga.component';

describe('VerDescargaComponent', () => {
  let component: VerDescargaComponent;
  let fixture: ComponentFixture<VerDescargaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerDescargaComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerDescargaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
