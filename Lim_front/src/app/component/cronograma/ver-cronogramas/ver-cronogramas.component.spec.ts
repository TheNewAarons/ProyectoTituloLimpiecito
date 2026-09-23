import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCronogramasComponent } from './ver-cronogramas.component';

describe('VerCronogramasComponent', () => {
  let component: VerCronogramasComponent;
  let fixture: ComponentFixture<VerCronogramasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerCronogramasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerCronogramasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
