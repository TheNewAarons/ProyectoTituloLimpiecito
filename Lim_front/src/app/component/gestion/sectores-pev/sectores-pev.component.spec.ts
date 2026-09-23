import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SectoresPevComponent } from './sectores-pev.component';

describe('SectoresPevComponent', () => {
  let component: SectoresPevComponent;
  let fixture: ComponentFixture<SectoresPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SectoresPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SectoresPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
