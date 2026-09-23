import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CarpetaHijoComponent } from './carpeta-hijo.component';

describe('CarpetaHijoComponent', () => {
  let component: CarpetaHijoComponent;
  let fixture: ComponentFixture<CarpetaHijoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CarpetaHijoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CarpetaHijoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
