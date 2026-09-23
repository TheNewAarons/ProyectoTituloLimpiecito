import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerListasPevComponent } from './ver-listas-pev.component';

describe('VerListasPevComponent', () => {
  let component: VerListasPevComponent;
  let fixture: ComponentFixture<VerListasPevComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerListasPevComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerListasPevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
