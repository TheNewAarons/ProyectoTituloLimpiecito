import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCentroComponent } from './ver-centro.component';

describe('VerCentroComponent', () => {
  let component: VerCentroComponent;
  let fixture: ComponentFixture<VerCentroComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCentroComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCentroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
